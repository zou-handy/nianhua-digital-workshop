const { buildNianhuaImagePrompt, buildAnimeNianhuaPrompt } = require('./nianhuaImagePrompt');
const { separateRgbaToWoodblockPlates, encodeRgbaToPngArrayBuffer } = require('./woodblockEngine');

const USER_GALLERY_CACHE_KEY = 'userColorLayers';
const USER_ADVANCED_WORKS_KEY = 'advancedPrintUserWorks';
const MAX_USER_RECORDS = 10;
const MAX_ADVANCED_USER_WORKS = 8;

/**
 * 佛山木版年画标准四色版台元数据
 */
const FOSHAN_BLOCK_META = [
  {
    key: 'black',
    name: '墨线木板',
    shortName: '黑',
    label: '墨黑色版',
    color: '#191512',
    textColor: '#ffffff',
    order: 1,
    material: '松烟墨',
    purpose: '线稿定位',
    desc: '黑版负责人物外轮廓、眉眼和衣甲线条，是后续色版对位的基准。'
  },
  {
    key: 'red',
    name: '万年红木板',
    shortName: '红',
    label: '朱红色版',
    color: '#C93434',
    textColor: '#ffffff',
    order: 2,
    material: '红丹色',
    purpose: '主色铺底',
    desc: '红版承担最醒目的喜庆气势，先把衣袍、甲片和喜庆色面压稳。'
  },
  {
    key: 'yellow',
    name: '石黄木板',
    shortName: '黄',
    label: '石黄色版',
    color: '#E7B82F',
    textColor: '#1A0F08',
    order: 3,
    material: '石黄/藤黄',
    purpose: '提亮装饰',
    desc: '黄色版补出脸部、花纹和亮面，让红底上产生更清晰的层次。'
  },
  {
    key: 'green',
    name: '青绿木板',
    shortName: '绿',
    label: '青绿色版',
    color: '#2F7A61',
    textColor: '#ffffff',
    order: 4,
    material: '石青/石绿',
    purpose: '补色压层',
    desc: '青绿色版负责冷色衣甲和局部装饰，让四版叠加时色彩饱满均衡。'
  }
];

function getApiBaseURL() {
  const app = getApp && getApp();
  const baseURL = app && app.globalData && app.globalData.apiBaseUrl;
  return baseURL ? String(baseURL).replace(/\/$/, '') : '';
}

function requestSplitColorsViaHttp(baseURL, payload) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseURL}/api/split-colors`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: payload,
      timeout: 120000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.success && Array.isArray(res.data.layers)) {
          resolve(res.data);
          return;
        }
        reject(new Error((res.data && res.data.error) || '分色接口请求失败'));
      },
      fail: (err) => {
        reject(new Error((err && err.errMsg) || '分色接口请求失败'));
      }
    });
  });
}

function requestSplitColorsViaCloudFunction(payload) {
  return new Promise((resolve, reject) => {
    if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.callFunction) {
      reject(new Error('当前环境不支持 wx.cloud.callFunction'));
      return;
    }
    wx.cloud.callFunction({
      name: 'splitColors',
      data: payload,
      success: (res) => {
        const result = (res && res.result) || {};
        if (result.success && Array.isArray(result.layers) && result.layers.length > 0) {
          resolve(result);
          return;
        }
        reject(new Error(result.error || result.message || '云函数分色失败'));
      },
      fail: (err) => {
        reject(new Error((err && err.errMsg) || '云函数分色失败'));
      }
    });
  });
}

function purgeStaleUserFiles(aggressive = false, keepToken = '') {
  try {
    const fs = wx.getFileSystemManager();
    const root = wx.env.USER_DATA_PATH;
    const entries = fs.readdirSync(root) || [];
    for (let i = 0; i < entries.length; i++) {
      const name = entries[i];
      if (!name || name === 'miniprogramLog') continue;
      if (keepToken && name.indexOf(keepToken) > -1) continue;
      const fullPath = `${root}/${name}`;
      try {
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory && stat.isDirectory()) {
          if (aggressive) {
            try { fs.rmdirSync(fullPath, true); } catch (e) {}
          }
          continue;
        }
        if (
          aggressive ||
          /^edge_src_|^selfie_|^probe_|^stylized_nianhua_|^quantized_|^user_layer_|^user_board_|\.(glb|gltf|bin|tmp)$/i.test(name)
        ) {
          fs.unlinkSync(fullPath);
        }
      } catch (e) {
        if (aggressive) {
          try { fs.unlinkSync(fullPath); } catch (e2) {}
        }
      }
    }
  } catch (err) {
    console.warn('[nianhuaPipeline] 清理 USER_DATA_PATH 缓存警告:', err);
  }
}

function writeUserFileSafe(filePath, arrayBuffer, keepToken = '') {
  const fs = wx.getFileSystemManager();
  try {
    fs.writeFileSync(filePath, arrayBuffer);
    return filePath;
  } catch (err) {
    purgeStaleUserFiles(false, keepToken);
    try {
      fs.writeFileSync(filePath, arrayBuffer);
      return filePath;
    } catch (err2) {
      purgeStaleUserFiles(true, keepToken);
      try {
        fs.writeFileSync(filePath, arrayBuffer);
        return filePath;
      } catch (err3) {
        if (typeof wx !== 'undefined' && wx.arrayBufferToBase64) {
          return `data:image/png;base64,${wx.arrayBufferToBase64(arrayBuffer)}`;
        }
        throw err3;
      }
    }
  }
}

function isWhitelistedDownloadUrl(src) {
  return /\.tcb\.qcloud\.la\//i.test(String(src || ''));
}

function resolveLocalImagePathForCanvas(imageSource) {
  return new Promise((resolve, reject) => {
    if (!imageSource) {
      reject(new Error('缺少待分色图片'));
      return;
    }
    const src = String(imageSource);
    if (src.startsWith('data:image/')) {
      resolve(src);
      return;
    }
    if (src.startsWith('cloud://') && wx.cloud && wx.cloud.downloadFile) {
      wx.cloud.downloadFile({
        fileID: src,
        success: (res) => {
          if (res && res.tempFilePath) {
            resolve(res.tempFilePath);
          } else {
            reject(new Error('云图片下载失败'));
          }
        },
        fail: reject
      });
      return;
    }
    if (/^https?:\/\//i.test(src) && !/^http:\/\/(usr|tmp)\//i.test(src)) {
      if (!isWhitelistedDownloadUrl(src)) {
        // 外部 COS/HTTP 链接不在小程序 downloadFile 合法域名列表时，跳过 getImageInfo/downloadFile，直接交由云函数中转
        resolve(src);
        return;
      }
      wx.downloadFile({
        url: src,
        success: (dl) => {
          if (dl && dl.statusCode >= 200 && dl.statusCode < 300 && dl.tempFilePath) {
            resolve(dl.tempFilePath);
          } else {
            resolve(src);
          }
        },
        fail: () => resolve(src)
      });
      return;
    }
    resolve(src);
  });
}

function isRemoteNonWhitelistedUrl(src) {
  const s = String(src || '');
  return /^https?:\/\//i.test(s) && !/^http:\/\/(usr|tmp)\//i.test(s) && !isWhitelistedDownloadUrl(s);
}

function loadCanvasImageWithFallback(canvas, localPath, originalSource) {
  return new Promise((resolve, reject) => {
    if (isRemoteNonWhitelistedUrl(localPath)) {
      reject(new Error('外部非白名单域名图片需经云函数中转分色'));
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('OffscreenCanvas 图片加载超时'));
      }
    }, 3200);

    const finishResolve = (img) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(img);
    };
    const finishReject = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    };

    const img = canvas.createImage();
    let triedDataUrl = false;

    const tryDataUrl = () => {
      if (triedDataUrl || isRemoteNonWhitelistedUrl(localPath)) {
        finishReject(new Error('OffscreenCanvas 图片解码失败'));
        return;
      }
      triedDataUrl = true;
      try {
        if (typeof originalSource === 'string' && originalSource.startsWith('data:image/')) {
          img.src = originalSource;
          return;
        }
        const fs = wx.getFileSystemManager();
        const b64 = fs.readFileSync(localPath, 'base64');
        const ext = /\.png$/i.test(localPath) ? 'png' : 'jpeg';
        img.src = `data:image/${ext};base64,${b64}`;
      } catch (e) {
        finishReject(e);
      }
    };

    img.onload = () => finishResolve(img);
    img.onerror = () => tryDataUrl();

    if (typeof localPath === 'string' && localPath.startsWith('data:image/')) {
      triedDataUrl = true;
      img.src = localPath;
    } else if (typeof originalSource === 'string' && originalSource.startsWith('data:image/')) {
      triedDataUrl = true;
      img.src = originalSource;
    } else {
      // 所有本地临时路径 (http://tmp/, http://usr/, wxfile://) 统一转为 Base64 DataURL 喂给 OffscreenCanvas，避免 createImage 挂起
      tryDataUrl();
    }
  });
}

/**
 * 端侧 OffscreenCanvas + Pure-JS 形态学分色引擎（当云函数尚未部署 v2 或云到期时无缝接管）
 */
async function runEdgeWoodblockSplit(imageSource, payload = {}) {
  const localPath = await resolveLocalImagePathForCanvas(imageSource);
  let rawW = 280;
  let rawH = 280;
  const isRemoteNonWhitelisted = /^https?:\/\//i.test(String(localPath))
    && !/^http:\/\/(usr|tmp)\//i.test(String(localPath))
    && !isWhitelistedDownloadUrl(localPath);
  if (!String(localPath).startsWith('data:image/') && !isRemoteNonWhitelisted) {
    try {
      const imgInfo = await new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: localPath,
          success: resolve,
          fail: reject
        });
      });
      rawW = imgInfo.width || 280;
      rawH = imgInfo.height || 280;
    } catch (infoErr) {
      console.warn('[nianhuaPipeline] getImageInfo 降级默认尺寸:', infoErr);
    }
  }

  const probeCanvas = wx.createOffscreenCanvas({ type: '2d', width: 16, height: 16 });
  const img = await loadCanvasImageWithFallback(probeCanvas, localPath, imageSource);
  if (img.width > 0 && img.height > 0) {
    rawW = img.width;
    rawH = img.height;
  }

  const maxDim = 260;
  const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
  const width = Math.max(64, Math.round(rawW * scale));
  const height = Math.max(64, Math.round(rawH * scale));

  const canvas = wx.createOffscreenCanvas({ type: '2d', width, height });
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  const separated = separateRgbaToWoodblockPlates(imageData.data, width, height, {
    removeBackground: payload.removeBackground !== false,
    maxColors: payload.maxColors || 'auto'
  });

  return Object.assign({ success: true }, separated);
}

/**
 * 将云函数以 flattenPalette:false 转存回来的原图未量化图层在端侧 OffscreenCanvas 还原合成为 100% 原始 RGB，
 * 避免旧版云函数 Euclidean RGB 聚类把人像暖肤色预量化为红色
 */
async function runEdgeWoodblockSplitFromRelayLayers(layers, payload = {}) {
  const validSources = (Array.isArray(layers) ? layers : [])
    .map((item) => item && (item.fileID || item.url || item.data))
    .filter(Boolean);
  if (!validSources.length) {
    throw new Error('缺少可合成的云中转图层');
  }

  const localPaths = await Promise.all(validSources.map((src) => resolveLocalImagePathForCanvas(src)));
  const probeCanvas = wx.createOffscreenCanvas({ type: '2d', width: 16, height: 16 });
  const loadedImages = [];
  for (let i = 0; i < localPaths.length; i++) {
    const img = await loadCanvasImageWithFallback(probeCanvas, localPaths[i], validSources[i]);
    if (img) loadedImages.push(img);
  }
  if (!loadedImages.length) {
    throw new Error('云中转图层解码失败');
  }

  const rawW = loadedImages[0].width || 280;
  const rawH = loadedImages[0].height || 280;
  const maxDim = 260;
  const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
  const width = Math.max(64, Math.round(rawW * scale));
  const height = Math.max(64, Math.round(rawH * scale));

  const canvas = wx.createOffscreenCanvas({ type: '2d', width, height });
  const ctx = canvas.getContext('2d');
  // 铺设暖白宣纸底色，承接旧版云函数跳过的高亮留白像素 (>220)
  ctx.fillStyle = '#FAF2E2';
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < loadedImages.length; i++) {
    ctx.drawImage(loadedImages[i], 0, 0, width, height);
  }
  const imageData = ctx.getImageData(0, 0, width, height);
  const separated = separateRgbaToWoodblockPlates(imageData.data, width, height, {
    removeBackground: payload.removeBackground !== false,
    maxColors: payload.maxColors || 'auto'
  });

  return Object.assign({ success: true }, separated);
}

/**
 * 1:1 保构图实拍图转木版年画风格（优先调用混元 3.0 真·图生图 HY-Image-v3.0-I2I-ToB-v1.0.1，离线时无缝回退端侧刀刻平涂引擎）
 * 严格保留实拍图的木雕/建筑/山水/人物构图，转化为宣纸底 + 松烟墨刀刻线 + 3~6 色矿物平涂版画图
 */
async function stylizePhotoToWoodblockNianhua(imageSource, options = {}) {
  try {
    let fileID = '';
    let httpsUrl = '';
    if (typeof imageSource === 'string' && /^https?:\/\//i.test(imageSource) && !/^http:\/\/(usr|tmp)\//i.test(imageSource)) {
      httpsUrl = imageSource;
    } else if (typeof imageSource === 'string' && imageSource.startsWith('cloud://')) {
      fileID = imageSource;
    } else if (typeof imageSource === 'string' && imageSource.startsWith('data:image/')) {
      const isPng = /^data:image\/png/i.test(imageSource);
      const ext = isPng ? 'png' : 'jpg';
      const b64 = imageSource.replace(/^data:image\/\w+;base64,/, '');
      const tempPath = writeUserFileSafe(`${wx.env.USER_DATA_PATH}/i2i_src_${Date.now()}.${ext}`, wx.base64ToArrayBuffer(b64));
      fileID = await uploadSourceImageToCloud(tempPath, 'user-creation/source');
    } else if (imageSource) {
      fileID = await uploadSourceImageToCloud(imageSource, 'user-creation/source');
    }
    if (fileID && !httpsUrl) {
      httpsUrl = await resolveCloudTempHttpsUrl(fileID);
    }
    if (httpsUrl && wx.cloud && wx.cloud.extend && wx.cloud.extend.AI && wx.cloud.extend.AI.createImageModel) {
      const imgModel = wx.cloud.extend.AI.createImageModel('hunyuan-image');
      if (imgModel && imgModel.generateImageSubUrlConfig && imgModel.generateImageSubUrlConfig['hunyuan-image']) {
        imgModel.generateImageSubUrlConfig['hunyuan-image']['HY-Image-v3.0-I2I-ToB-v1.0.1'] = 'images/ar/generations';
      }
      const i2iPrompt = '严格依据图中主体的构图、姿态与细节结构，1:1重绘为正统广东佛山木版年画平面套印版画。采用刚劲松烟墨黑线勾勒主体轮廓与衣纹肌理，使用高饱和万年红（朱砂红）、石黄（明黄）、石绿（翠青）、靛青蓝四色矿物颜料纯粹平涂，背景为干净平整的米白宣纸，去除摄影反光、阴影与背景杂物，每个色块边界硬朗清晰，完美适合木版分色套印。';
      const i2iRes = await imgModel.generateImage({
        model: 'HY-Image-v3.0-I2I-ToB-v1.0.1',
        prompt: i2iPrompt,
        size: options.size || '1024x1024',
        revise: { value: true },
        image_urls: [httpsUrl],
        timeout: 120000
      });
      const outUrl = i2iRes && i2iRes.data && i2iRes.data[0] && i2iRes.data[0].url;
      if (outUrl) {
        return {
          success: true,
          mode: 'hy-image-3.0-i2i-woodblock',
          imageUrl: outUrl,
          localPath: outUrl,
          fileID: '',
          plateCount: options.maxColors || 'auto',
          splitResult: null
        };
      }
    }
  } catch (aiErr) {
    console.warn('[nianhuaPipeline] HY-Image-v3.0-I2I 1:1 年画化降级至端侧刀刻引擎:', aiErr);
  }

  const splitResult = await runEdgeWoodblockSplit(imageSource, {
    removeBackground: options.removeBackground !== false,
    maxColors: options.maxColors || 'auto'
  });

  if (!splitResult || !splitResult.quantizedPngArrayBuffer) {
    throw new Error('木版年画风格化生成失败');
  }

  const rawPath = `${wx.env.USER_DATA_PATH}/stylized_nianhua_${Date.now()}.png`;
  const stylizedPath = writeUserFileSafe(rawPath, splitResult.quantizedPngArrayBuffer);
  const previewDataUrl = (typeof wx !== 'undefined' && wx.arrayBufferToBase64)
    ? `data:image/png;base64,${wx.arrayBufferToBase64(splitResult.quantizedPngArrayBuffer)}`
    : stylizedPath;

  return {
    success: true,
    mode: 'i2i-woodblock',
    imageUrl: previewDataUrl,
    localPath: stylizedPath,
    fileID: '',
    plateCount: splitResult.plateCount || (splitResult.layers && splitResult.layers.length) || 4,
    splitResult
  };
}

/**
 * 统一调用 v2.1 动态多色木版分色引擎（优先云函数 v2.1，若云端仍为旧版或云不可用则自动切换端侧 v2.1 引擎）
 */
async function requestSplitColors(imageSource, options = {}) {
  const payload = {
    image: imageSource,
    imageBase64: imageSource,
    imageUrl: imageSource,
    removeBackground: options.removeBackground !== false,
    flattenPalette: options.flattenPalette !== false,
    maxColors: options.maxColors || 'auto',
    photoMode: options.photoMode || 'auto',
    palette: options.palette || null,
    paletteLabels: options.paletteLabels || null
  };

  // 1. 优先尝试毫秒级端侧 OffscreenCanvas v2.1 动态多色引擎（支持本地图、cloud://、data:image 及外部图片）
  try {
    return await runEdgeWoodblockSplit(imageSource, payload);
  } catch (edgeFirstErr) {
    console.info('[nianhuaPipeline] 端侧直连分色受限，自动切换云函数中转分色:', String(edgeFirstErr && (edgeFirstErr.message || edgeFirstErr)));
  }

  // 2. 若配置了自建 HTTP 服务则尝试 HTTP
  const baseURL = getApiBaseURL();
  const isCloudFile = typeof imageSource === 'string' && imageSource.startsWith('cloud://');
  if (baseURL && !isCloudFile) {
    try {
      return await requestSplitColorsViaHttp(baseURL, payload);
    } catch (httpErr) {
      console.warn('[nianhuaPipeline] HTTP 分色降级:', httpErr);
    }
  }

  // 3. 调用云函数 splitColors（云端 Node.js 无域名白名单限制，可直接拉取混元 COS 等任意外部图片并转存至本环境 cloud://）
  // 关键：传入 flattenPalette:false 与双锚点 palette，使线上旧版云函数直接将 100% 原始未量化像素写入 2 张 cloud:// 图层，杜绝旧版 RGB 聚类将人像暖肤色预量化为红色
  const cloudPayload = Object.assign({}, payload, {
    removeBackground: false,
    flattenPalette: false,
    maxColors: 2,
    palette: ['#282828', '#B8B8B8'],
    maxDimension: 520
  });
  const cloudResult = await requestSplitColorsViaCloudFunction(cloudPayload);
  if (cloudResult && String(cloudResult.engineVersion || '').startsWith('2.2')) {
    return cloudResult;
  }

  // 4A. 优先将云函数以 flattenPalette:false 转存回来的未量化原始图层合成为 100% 原图 RGB，交由端侧开相留白引擎执行 3~6 版动态多色精修分色
  if (cloudResult && Array.isArray(cloudResult.layers) && cloudResult.layers.length > 0) {
    try {
      return await runEdgeWoodblockSplitFromRelayLayers(cloudResult.layers, payload);
    } catch (relayLayersErr) {
      console.warn('[nianhuaPipeline] 原图图层合成精修降级:', relayLayersErr);
    }
  }

  // 4B. 备选：用云函数返回的 quantizedFileID 交由端侧精修
  const relaySource = (cloudResult && (cloudResult.quantizedFileID || cloudResult.quantizedBase64)) || '';
  if (relaySource) {
    try {
      return await runEdgeWoodblockSplit(relaySource, payload);
    } catch (edgeSecondErr) {
      console.warn('[nianhuaPipeline] 云中转后端侧精修跳过，采用云函数结果:', edgeSecondErr);
    }
  }
  return cloudResult;
}

/**
 * 压缩本地图片，避免上传及云函数负载过大
 */
function compressLocalImage(filePath, quality = 65) {
  if (!filePath || /^cloud:\/\/|^https?:\/\/|^data:/i.test(filePath)) {
    return Promise.resolve(filePath);
  }
  return new Promise((resolve) => {
    wx.compressImage({
      src: filePath,
      quality,
      success: (res) => resolve((res && res.tempFilePath) || filePath),
      fail: () => resolve(filePath)
    });
  });
}

/**
 * 上传用户原图至微信云存储，获取 cloud:// fileID
 */
function uploadSourceImageToCloud(localFilePath, folder = 'user-creation/source') {
  if (!localFilePath) return Promise.reject(new Error('缺少待上传图片路径'));
  if (String(localFilePath).startsWith('cloud://')) {
    return Promise.resolve(localFilePath);
  }

  const extMatch = String(localFilePath).match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const cloudPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath: localFilePath,
      success: (res) => {
        if (res && res.fileID) {
          resolve(res.fileID);
          return;
        }
        reject(new Error('原图上传未返回 fileID'));
      },
      fail: (err) => {
        reject(new Error((err && err.errMsg) || '原图上传云端失败'));
      }
    });
  });
}

/**
 * 将本地图片读取为 Base64 DataURL（作为云上传失败时的降级传输通道）
 */
function readLocalFileAsDataUrl(filePath, mime = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve(`data:${mime};base64,${res.data}`),
      fail: reject
    });
  });
}

/**
 * 将 cloud:// fileID 解析为公网临时 HTTPS 链接（供 HY-Image-v3.0-I2I-ToB-v1.0.1 与多模态识图使用）
 */
async function resolveCloudTempHttpsUrl(source) {
  if (!source) return '';
  if (/^https?:\/\//i.test(source)) return source;
  if (String(source).startsWith('cloud://') && wx.cloud && wx.cloud.getTempFileURL) {
    try {
      const urlRes = await wx.cloud.getTempFileURL({ fileList: [source] });
      const item = urlRes && urlRes.fileList && urlRes.fileList[0];
      if (item && item.tempFileURL) return item.tempFileURL;
    } catch (e) {
      console.warn('[nianhuaPipeline] getTempFileURL 失败:', e);
    }
  }
  return '';
}

/**
 * 生成或重绘四色年画（优先使用微信小程序端原生 wx.cloud.extend.AI.createImageModel 直连小程序成长计划额度，无需云函数中转）
 * - 图生图 (I2I): 优先调用 HY-Image-v3.0-I2I-ToB-v1.0.1 (传入 image_urls: [httpsUrl])，并自动兼容 3.5 新模型 hy-image-v3.5-preview
 * - 文生图 (T2I): 优先调用 HY-Image-3.0-Plus-4090-Tob-v1.0，失败再降级至云函数 generateImage-PBKj5J
 */
async function requestNianhuaImageGeneration(subjectOrOptions, maybeOptions = {}) {
  const isObj = subjectOrOptions && typeof subjectOrOptions === 'object';
  const options = isObj ? subjectOrOptions : (maybeOptions || {});
  const cleanSubject = String((isObj ? options.subject : subjectOrOptions) || '').trim() || '佛山木版年画门神纳福';
  const builtPrompt = buildNianhuaImagePrompt(cleanSubject);
  const finalPrompt = String(options.prompt || builtPrompt.prompt).slice(0, 490);
  const finalNegativePrompt = options.negativePrompt || options.negative_prompt || builtPrompt.negativePrompt;
  const targetSize = options.size || '1024x1024';

  const httpsRefUrl = await resolveCloudTempHttpsUrl(options.sourceImageUrl || options.sourceFileID);

  // 1. 优先通过小程序基础库 wx.cloud.extend.AI.createImageModel 直接调用小程序成长计划生图资源包
  if (wx.cloud && wx.cloud.extend && wx.cloud.extend.AI && wx.cloud.extend.AI.createImageModel) {
    // 1A. 若有垫图 URL，优先调混元 3.0 真·图生图模型 HY-Image-v3.0-I2I-ToB-v1.0.1
    if (httpsRefUrl) {
      try {
        const imageModel = wx.cloud.extend.AI.createImageModel('hunyuan-image');
        if (imageModel && imageModel.generateImageSubUrlConfig && imageModel.generateImageSubUrlConfig['hunyuan-image']) {
          imageModel.generateImageSubUrlConfig['hunyuan-image']['HY-Image-v3.0-I2I-ToB-v1.0.1'] = 'images/ar/generations';
          imageModel.generateImageSubUrlConfig['hunyuan-image']['HY-Image-3.0-Plus-4090-Tob-v1.0'] = 'images/ar/generations';
        }
        const i2iRes = await imageModel.generateImage({
          model: 'HY-Image-v3.0-I2I-ToB-v1.0.1',
          prompt: finalPrompt,
          size: targetSize,
          revise: { value: true },
          image_urls: [httpsRefUrl],
          timeout: 120000
        });
        const url = i2iRes && i2iRes.data && i2iRes.data[0] && i2iRes.data[0].url;
        if (url) {
          return {
            imageUrl: url,
            fileID: '',
            mode: 'hy-image-3.0-i2i'
          };
        }
      } catch (i2iErr) {
        console.warn('[nianhuaPipeline] HY-Image-v3.0-I2I-ToB-v1.0.1 直连降级，尝试 hy-image-v3.5-preview:', i2iErr);
      }

      // 1B. 自动兼容 11月中旬/12月接替的 hy-image-v3.5-preview 图生图协议
      try {
        const cbImageModel = wx.cloud.extend.AI.createImageModel('cloudbase');
        const v35Res = await cbImageModel.generateImage({
          model: 'hy-image-v3.5-preview',
          size: targetSize,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: finalPrompt },
              { type: 'image_url', image_url: { url: httpsRefUrl } }
            ]
          }]
        });
        const v35Url = v35Res && v35Res.choices && v35Res.choices[0] && v35Res.choices[0].delta && v35Res.choices[0].delta.image && v35Res.choices[0].delta.image.url;
        if (v35Url) {
          return {
            imageUrl: v35Url,
            fileID: '',
            mode: 'hy-image-3.5-i2i'
          };
        }
      } catch (v35Err) {
        console.warn('[nianhuaPipeline] hy-image-v3.5-preview I2I 暂未激活，转用 3.0 Plus 文生图:', v35Err);
      }
    }

    // 1C. 小程序端直连 HY-Image-3.0-Plus-4090-Tob-v1.0 文生图（带提示词特征重绘）
    try {
      const imageModel = wx.cloud.extend.AI.createImageModel('hunyuan-image');
      if (imageModel && imageModel.generateImageSubUrlConfig && imageModel.generateImageSubUrlConfig['hunyuan-image']) {
        imageModel.generateImageSubUrlConfig['hunyuan-image']['HY-Image-3.0-Plus-4090-Tob-v1.0'] = 'images/ar/generations';
      }
      const t2iRes = await imageModel.generateImage({
        model: 'HY-Image-3.0-Plus-4090-Tob-v1.0',
        prompt: finalPrompt,
        size: targetSize,
        revise: { value: true },
        timeout: 120000
      });
      const url = t2iRes && t2iRes.data && t2iRes.data[0] && t2iRes.data[0].url;
      if (url) {
        return {
          imageUrl: url,
          fileID: '',
          mode: 'hy-image-3.0-plus-t2i'
        };
      }
    } catch (t2iErr) {
      console.warn('[nianhuaPipeline] HY-Image-3.0-Plus-4090-Tob-v1.0 直连降级至云函数:', t2iErr);
    }
  }

  // 2. 保底降级：调用云函数 generateImage-PBKj5J（依次尝试 I2I -> 3.0-Plus -> hunyuan-image，自动容错未重部署的旧版云函数）
  const cfModels = httpsRefUrl
    ? ['HY-Image-v3.0-I2I-ToB-v1.0.1', 'HY-Image-3.0-Plus-4090-Tob-v1.0', 'hunyuan-image']
    : ['HY-Image-3.0-Plus-4090-Tob-v1.0', 'hunyuan-image'];

  let lastCfErr = null;
  for (const mdl of cfModels) {
    try {
      const cfRes = await new Promise((resolve, reject) => {
        wx.cloud.callFunction({
          name: 'generateImage-PBKj5J',
          data: {
            prompt: finalPrompt,
            negative_prompt: finalNegativePrompt,
            model: mdl,
            size: targetSize,
            n: 1,
            revise: { value: true },
            ...(options.sourceFileID ? { sourceFileID: options.sourceFileID } : {}),
            ...(httpsRefUrl ? { sourceImageUrl: httpsRefUrl } : {})
          },
          success: (res) => {
            const result = (res && res.result) || {};
            if (result.success && (result.fileID || result.imageUrl || result.originalImageUrl)) {
              resolve({
                imageUrl: result.fileID || result.imageUrl || result.originalImageUrl,
                fileID: result.fileID || '',
                originalImageUrl: result.originalImageUrl || '',
                mode: result.mode || mdl
              });
              return;
            }
            reject(new Error(result.message || result.error || `云函数 ${mdl} 生成失败`));
          },
          fail: (err) => {
            reject(new Error((err && err.errMsg) || `云函数 ${mdl} 调用失败`));
          }
        });
      });
      return cfRes;
    } catch (err) {
      lastCfErr = err;
      console.warn(`[nianhuaPipeline] generateImage-PBKj5J (${mdl}) 切换下一候选:`, err && err.message);
    }
  }

  throw lastCfErr || new Error('AI 年画生成失败');
}

/**
 * 调用微信云内置多模态视觉模型（优先使用成长计划上新的 deepseek-v4.1-flash / hy4，降级 hunyuan-vision）识别自拍人像或实拍图的造型特征
 */
async function analyzePhotoWithHunyuanVision(imageSource) {
  let fileID = '';
  let httpsUrl = '';

  try {
    if (typeof imageSource === 'string' && /^https?:\/\//i.test(imageSource) && !/^http:\/\/(usr|tmp)\//i.test(imageSource)) {
      httpsUrl = imageSource;
    } else if (typeof imageSource === 'string' && imageSource.startsWith('cloud://')) {
      fileID = imageSource;
    } else if (typeof imageSource === 'string' && imageSource.startsWith('data:image/')) {
      const isPng = /^data:image\/png/i.test(imageSource);
      const ext = isPng ? 'png' : 'jpg';
      const b64 = imageSource.replace(/^data:image\/\w+;base64,/, '');
      const tempPath = writeUserFileSafe(`${wx.env.USER_DATA_PATH}/selfie_${Date.now()}.${ext}`, wx.base64ToArrayBuffer(b64));
      fileID = await uploadSourceImageToCloud(tempPath, 'user-creation/selfie');
    } else if (imageSource) {
      fileID = await uploadSourceImageToCloud(imageSource, 'user-creation/selfie');
    }

    if (fileID && !httpsUrl) {
      httpsUrl = await resolveCloudTempHttpsUrl(fileID);
    }
  } catch (uploadErr) {
    console.warn('[nianhuaPipeline] 云存储中转不可用，使用多模态默认特征继续生图:', uploadErr && uploadErr.message);
  }

  let visionTraits = '';
  const visionPrompt = '请用50字以内精准提取图中人物或主体的核心造型特征（若是人像：性别年龄感、发型长短、是否戴眼镜/配饰、表情神态、标志性手势如比耶/抱拳、服装颜色与款式，忽略手持手机或杂乱背景；若是景物/器物：主体名称、造型结构与主要配色）。直接输出特征描述，不要客套话。';
  const visionMessages = [{
    role: 'user',
    content: [
      { type: 'text', text: visionPrompt },
      { type: 'image_url', image_url: { url: httpsUrl } }
    ]
  }];

  if (httpsUrl && wx.cloud && wx.cloud.extend && wx.cloud.extend.AI && wx.cloud.extend.AI.createModel) {
    // 优先使用小程序成长计划最新免费的 cloudbase 多模态模型 (deepseek-v4.1-flash / hy4)
    const candidates = [
      { provider: 'cloudbase', model: 'deepseek-v4.1-flash' },
      { provider: 'cloudbase', model: 'hy4' },
      { provider: 'hunyuan-exp', model: 'hunyuan-vision' }
    ];
    for (const cand of candidates) {
      if (visionTraits) break;
      try {
        const modelInstance = wx.cloud.extend.AI.createModel(cand.provider);
        const res = await modelInstance.generateText({
          model: cand.model,
          messages: visionMessages
        });
        const rawText = res && (res.text || (res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content));
        if (rawText && !/没有看到|无法查看|无法提取|信息不足|请提供/.test(rawText)) {
          visionTraits = String(rawText).trim();
        }
      } catch (visionErr) {
        console.warn(`[nianhuaPipeline] ${cand.provider}/${cand.model} 识图切换下一候选:`, visionErr);
      }
    }
  }

  return {
    fileID,
    httpsUrl,
    visionTraits: visionTraits || '青年人物半身自拍，五官端正灵动，面带喜庆微笑'
  };
}

/**
 * 自拍/实拍图 -> 混元视觉识图提取神态穿搭 -> AI 二次元国潮木版年画重绘
 */
async function generateAnimeNianhuaFromPhoto(imageSource, options = {}) {
  const { fileID, httpsUrl, visionTraits } = await analyzePhotoWithHunyuanVision(imageSource);
  const promptConfig = buildAnimeNianhuaPrompt(visionTraits, options.userHint || '');
  const genResult = await requestNianhuaImageGeneration({
    prompt: promptConfig.prompt,
    negativePrompt: promptConfig.negativePrompt,
    sourceFileID: fileID,
    sourceImageUrl: httpsUrl
  });

  return {
    success: true,
    mode: 'vision-anime-i2i',
    imageUrl: genResult.imageUrl || genResult.fileID,
    fileID: genResult.fileID || '',
    visionTraits
  };
}

/**
 * 将后端或端侧返回的图层数组落盘或提取为可直接渲染的图层记录
 */
function normalizeSavedLayers(rawLayers, workId) {
  if (!Array.isArray(rawLayers) || rawLayers.length === 0) return [];
  const fs = wx.getFileSystemManager();
  const savedLayers = [];

  for (let i = 0; i < rawLayers.length; i++) {
    const layer = rawLayers[i] || {};
    const meta = FOSHAN_BLOCK_META[i] || {};
    let layerPath = '';

    if (layer.fileID) {
      layerPath = layer.fileID;
    } else if (layer.pngArrayBuffer) {
      const localPath = `${wx.env.USER_DATA_PATH}/user_layer_${workId}_${i}.png`;
      try {
        layerPath = writeUserFileSafe(localPath, layer.pngArrayBuffer, workId);
      } catch (err) {
        console.error('[nianhuaPipeline] 写入端侧 PNG 图层失败:', err);
      }
    } else if (layer.data || layer.base64 || layer.pngBuffer) {
      const base64Data = layer.pngBuffer
        ? Buffer.from(layer.pngBuffer).toString('base64')
        : String(layer.data || layer.base64 || '').replace(/^data:image\/\w+;base64,/, '');
      if (base64Data) {
        const localPath = `${wx.env.USER_DATA_PATH}/user_layer_${workId}_${i}.png`;
        try {
          layerPath = writeUserFileSafe(localPath, wx.base64ToArrayBuffer(base64Data), workId);
        } catch (err) {
          console.error('[nianhuaPipeline] 写入本地图层失败:', err);
        }
      }
    } else if (layer.tempPath) {
      layerPath = layer.tempPath;
    }

    if (!layerPath) continue;

    let boardPath = '';
    if (layer.boardFileID) {
      boardPath = layer.boardFileID;
    } else if (layer.boardPngArrayBuffer) {
      const localBoardPath = `${wx.env.USER_DATA_PATH}/user_board_${workId}_${i}.png`;
      try {
        boardPath = writeUserFileSafe(localBoardPath, layer.boardPngArrayBuffer, workId);
      } catch (err) {
        console.error('[nianhuaPipeline] 写入端侧雕版木板 PNG 失败:', err);
      }
    } else if (layer.boardData || layer.boardPngBuffer) {
      const boardBase64 = layer.boardPngBuffer
        ? Buffer.from(layer.boardPngBuffer).toString('base64')
        : String(layer.boardData || '').replace(/^data:image\/\w+;base64,/, '');
      if (boardBase64) {
        const localBoardPath = `${wx.env.USER_DATA_PATH}/user_board_${workId}_${i}.png`;
        try {
          boardPath = writeUserFileSafe(localBoardPath, wx.base64ToArrayBuffer(boardBase64), workId);
        } catch (err) {
          console.error('[nianhuaPipeline] 写入本地雕版木板失败:', err);
        }
      }
    } else if (layer.boardTempPath) {
      boardPath = layer.boardTempPath;
    }

    const validName = (layer.name && !/^color_\d+$/i.test(String(layer.name))) ? layer.name : '';
    savedLayers.push({
      key: layer.key || meta.key || ('color_' + (i + 1)),
      tempPath: layerPath,
      fileID: layer.fileID || '',
      boardTempPath: boardPath || layerPath,
      boardFileID: layer.boardFileID || '',
      name: validName || (layer.label ? layer.label.replace(/版$/, '') + '木板' : '') || meta.name || ('色版' + (i + 1) + '木板'),
      color: layer.color || meta.color || '#191512',
      textColor: layer.textColor || meta.textColor || '#ffffff',
      label: layer.label || meta.label || ('图层' + (i + 1)),
      shortName: layer.shortName || meta.shortName || String(layer.label || '版').slice(0, 1),
      material: layer.material || meta.material || '传统矿物颜料',
      purpose: layer.purpose || meta.purpose || '分色套印',
      desc: layer.desc || meta.desc || '佛山传统木版年画动态分色图层。',
      pixelCount: layer.pixelCount || 0,
      coverageRatio: layer.coverageRatio || 0
    });
  }

  return savedLayers;
}

/**
 * 根据分色结果构造可直接挂载到「卷五 · 高级版台」的作品结构
 * 完全解耦早期写死的 4 版限制，支持 3~6 块动态色版全量挂载到卷五版台！
 */
function buildAdvancedWorkFromRecord(record, ordinal = 3) {
  const layers = Array.isArray(record && record.layers) ? record.layers : [];
  const sourceOf = (layer) => (layer && (layer.fileID || layer.tempPath)) || '';
  const boardSourceOf = (layer) => (layer && (layer.boardFileID || layer.boardTempPath || layer.fileID || layer.tempPath)) || '';
  const cleanTitle = String((record && record.title) || '数字二创').replace(/^作品\d+\s*·\s*/, '');

  const steps = layers.map((layer, idx) => {
    const fallbackMeta = FOSHAN_BLOCK_META[idx] || FOSHAN_BLOCK_META[FOSHAN_BLOCK_META.length - 1];
    const imgSrc = sourceOf(layer);
    const boardSrc = boardSourceOf(layer) || imgSrc;
    const key = layer.key || fallbackMeta.key || ('plate_' + (idx + 1));
    return {
      key,
      name: layer.name || (layer.label ? layer.label.replace(/版$/, '') + '木板' : fallbackMeta.name),
      shortName: layer.shortName || fallbackMeta.shortName || String(idx + 1),
      color: layer.color || fallbackMeta.color,
      textColor: layer.textColor || fallbackMeta.textColor || '#ffffff',
      order: idx + 1,
      material: layer.material || fallbackMeta.material || '矿物颜料',
      purpose: layer.purpose || fallbackMeta.purpose || '套印色版',
      desc: layer.desc || fallbackMeta.desc,
      boardImage: boardSrc,
      layerImage: imgSrc,
      modelFileID: '',
      isUserCarvedBoard: true
    };
  });

  const boards = {};
  const layerMap = {};
  const models = {};
  steps.forEach((step) => {
    boards[step.key] = step.boardImage;
    layerMap[step.key] = step.layerImage;
    models[step.key] = '';
  });
  // 保底兼容旧键名
  ['black', 'red', 'yellow', 'green'].forEach((legacyKey, idx) => {
    const fallbackStep = steps[idx] || steps[0] || {};
    if (!boards[legacyKey]) boards[legacyKey] = fallbackStep.boardImage || '';
    if (!layerMap[legacyKey]) layerMap[legacyKey] = fallbackStep.layerImage || '';
    if (!(legacyKey in models)) models[legacyKey] = '';
  });

  return {
    id: (record && record.id) || ('user_' + Date.now()),
    name: `作品${ordinal} · ${cleanTitle}`,
    original: (record && (record.quantizedFileID || record.original || record.originalImage)) || sourceOf(layers[0]),
    isUserCreated: true,
    plateCount: steps.length,
    createdAt: (record && record.timestamp) || Date.now(),
    steps,
    boards,
    layers: layerMap,
    models
  };
}

function setStorageListSafe(key, list) {
  let current = Array.isArray(list) ? list.slice() : [];
  while (current.length > 0) {
    try {
      wx.setStorageSync(key, current);
      return current;
    } catch (e) {
      current.pop();
    }
  }
  return [];
}

/**
 * 统一将分色结果同步写入：
 * 1. 2D 爆炸图展厅缓存 (userColorLayers)
 * 2. 卷五交互版台缓存 (advancedPrintUserWorks)
 */
function saveWorkToDualStores(splitResult, options = {}) {
  const timestamp = Date.now();
  const workId = options.id || ('user_' + timestamp);
  purgeStaleUserFiles(true, workId);
  const savedLayers = normalizeSavedLayers((splitResult && splitResult.layers) || [], workId);

  if (savedLayers.length === 0) {
    throw new Error('分色结果为空，未能生成有效木版图层');
  }

  // 若云函数或端侧引擎返回了宣纸合成图但无 fileID，落盘保存作缩略图
  let quantizedPreview = (splitResult && splitResult.quantizedFileID) || '';
  if (!quantizedPreview && splitResult && (splitResult.quantizedPngArrayBuffer || splitResult.quantizedBase64)) {
    try {
      const previewPath = `${wx.env.USER_DATA_PATH}/quantized_${workId}.png`;
      if (splitResult.quantizedPngArrayBuffer) {
        quantizedPreview = writeUserFileSafe(previewPath, splitResult.quantizedPngArrayBuffer, workId);
      } else {
        const b64 = String(splitResult.quantizedBase64).replace(/^data:image\/\w+;base64,/, '');
        quantizedPreview = writeUserFileSafe(previewPath, wx.base64ToArrayBuffer(b64), workId);
      }
    } catch (e) {
      console.warn('[nianhuaPipeline] 保存合成预览图失败:', e);
    }
  }

  const safeSourceImage = (options.sourceImage && !String(options.sourceImage).startsWith('data:image/'))
    ? options.sourceImage
    : '';
  const originalImage = quantizedPreview || options.sourceFileID || safeSourceImage || savedLayers[0].tempPath;
  const record = {
    id: workId,
    title: String(options.title || '').trim() || ('我的年画 · ' + new Date().toLocaleDateString()),
    isPreset: false,
    mode: (splitResult && splitResult.mode) || options.mode || 'photo',
    layers: savedLayers,
    original: originalImage,
    originalImage,
    quantizedFileID: (splitResult && splitResult.quantizedFileID) || '',
    timestamp
  };

  // 1. 写入 2D 分色展厅缓存
  let galleryList = [];
  try {
    const storedGallery = wx.getStorageSync(USER_GALLERY_CACHE_KEY);
    if (Array.isArray(storedGallery)) galleryList = storedGallery;
  } catch (e) {}
  const nextGalleryList = [record, ...galleryList.filter((item) => item && item.id !== record.id)].slice(0, MAX_USER_RECORDS);
  setStorageListSafe(USER_GALLERY_CACHE_KEY, nextGalleryList);

  // 2. 写入卷五交互版台缓存
  let advancedList = [];
  try {
    const storedAdvanced = wx.getStorageSync(USER_ADVANCED_WORKS_KEY);
    if (Array.isArray(storedAdvanced)) advancedList = storedAdvanced;
  } catch (e) {}
  const newWork = buildAdvancedWorkFromRecord(record, 3);
  const nextAdvancedList = [newWork, ...advancedList.filter((item) => item && item.id !== newWork.id)].slice(0, MAX_ADVANCED_USER_WORKS);
  nextAdvancedList.forEach((item, idx) => {
    const rawName = String(item.name || '数字二创').replace(/^作品\d+\s*·\s*/, '');
    item.name = `作品${idx + 3} · ${rawName}`;
  });
  setStorageListSafe(USER_ADVANCED_WORKS_KEY, nextAdvancedList);

  return {
    record,
    advancedWork: nextAdvancedList[0],
    advancedWorkList: nextAdvancedList
  };
}

/**
 * 将 AI 生成或风格化后的年画图片保存到手机系统相册（自动绕过非白名单外部 COS 域名限制）
 */
async function saveNianhuaImageToAlbum(imageSource, fileID = '') {
  const source = String(fileID || imageSource || '').trim();
  if (!source) {
    throw new Error('暂无可保存的年画图片');
  }

  let localFilePath = '';

  if (source.startsWith('cloud://')) {
    localFilePath = await resolveLocalImagePathForCanvas(source);
  } else if (String(imageSource || '').startsWith('data:image/')) {
    const raw = String(imageSource);
    const isPng = /^data:image\/png/i.test(raw);
    const ext = isPng ? 'png' : 'jpg';
    const b64 = raw.replace(/^data:image\/\w+;base64,/, '');
    localFilePath = writeUserFileSafe(
      `${wx.env.USER_DATA_PATH}/nianhua_album_${Date.now()}.${ext}`,
      wx.base64ToArrayBuffer(b64)
    );
  } else if (isRemoteNonWhitelistedUrl(imageSource)) {
    // 混元生图 COS 等外部域名不在 downloadFile 白名单时，经云函数原图无损中转合成至本地文件
    const cloudResult = await requestSplitColorsViaCloudFunction({
      image: imageSource,
      imageUrl: imageSource,
      removeBackground: false,
      flattenPalette: false,
      maxColors: 2,
      palette: ['#282828', '#B8B8B8'],
      maxDimension: 960
    });
    const validSources = (Array.isArray(cloudResult && cloudResult.layers) ? cloudResult.layers : [])
      .map((item) => item && (item.fileID || item.url || item.data))
      .filter(Boolean);
    if (!validSources.length) {
      throw new Error('云端中转图片失败');
    }
    const localPaths = await Promise.all(validSources.map((src) => resolveLocalImagePathForCanvas(src)));
    const probeCanvas = wx.createOffscreenCanvas({ type: '2d', width: 16, height: 16 });
    const loadedImages = [];
    for (let i = 0; i < localPaths.length; i++) {
      const img = await loadCanvasImageWithFallback(probeCanvas, localPaths[i], validSources[i]);
      if (img) loadedImages.push(img);
    }
    if (!loadedImages.length) {
      throw new Error('年画图片解码失败');
    }
    const rawW = loadedImages[0].width || 512;
    const rawH = loadedImages[0].height || 512;
    const maxDim = 640;
    const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
    const width = Math.max(128, Math.round(rawW * scale));
    const height = Math.max(128, Math.round(rawH * scale));
    const canvas = wx.createOffscreenCanvas({ type: '2d', width, height });
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FAF2E2';
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < loadedImages.length; i++) {
      ctx.drawImage(loadedImages[i], 0, 0, width, height);
    }
    const imageData = ctx.getImageData(0, 0, width, height);
    const pngBuffer = encodeRgbaToPngArrayBuffer(imageData.data, width, height);
    localFilePath = writeUserFileSafe(`${wx.env.USER_DATA_PATH}/nianhua_album_${Date.now()}.png`, pngBuffer);
  } else if (/^https?:\/\//i.test(String(imageSource)) && !/^http:\/\/(usr|tmp)\//i.test(String(imageSource))) {
    localFilePath = await resolveLocalImagePathForCanvas(imageSource);
  } else {
    localFilePath = String(imageSource);
  }

  await new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath: localFilePath,
      success: resolve,
      fail: (err) => {
        const msg = String((err && err.errMsg) || '');
        if (/auth deny|authorize:fail|auth denied/i.test(msg)) {
          wx.showModal({
            title: '需要相册保存权限',
            content: '请在设置中开启「保存到相册」权限，以便保存生成的年画作品。',
            confirmText: '去开启',
            success: (modalRes) => {
              if (modalRes && modalRes.confirm && wx.openSetting) {
                wx.openSetting({});
              }
            }
          });
          reject(new Error('未开启相册权限'));
          return;
        }
        reject(new Error(msg || '保存到相册失败'));
      }
    });
  });

  return localFilePath;
}

module.exports = {
  USER_GALLERY_CACHE_KEY,
  USER_ADVANCED_WORKS_KEY,
  FOSHAN_BLOCK_META,
  requestSplitColors,
  stylizePhotoToWoodblockNianhua,
  analyzePhotoWithHunyuanVision,
  generateAnimeNianhuaFromPhoto,
  compressLocalImage,
  uploadSourceImageToCloud,
  readLocalFileAsDataUrl,
  requestNianhuaImageGeneration,
  normalizeSavedLayers,
  buildAdvancedWorkFromRecord,
  saveWorkToDualStores,
  saveNianhuaImageToAlbum
};
