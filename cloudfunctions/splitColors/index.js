const tcb = require('@cloudbase/node-sdk');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

const DEFAULT_MAX_COLORS = 4;

/**
 * 佛山木版年画传统九色矿物颜料池（第 0 版固定为松烟墨线骨版，其余 8 色按画面色相动态激活 2~5 块）
 */
const FOSHAN_FOUR_PALETTE = [
  { key: 'black', r: 25, g: 21, b: 18, hex: '#191512', label: '墨线骨版', name: '松烟墨线木板', shortName: '墨', material: '松烟墨', purpose: '线稿定骨' },
  { key: 'red', r: 201, g: 52, b: 52, hex: '#C93434', label: '万年红版', name: '万年红木板', shortName: '红', material: '红丹/朱砂', purpose: '主色铺底' },
  { key: 'yellow', r: 231, g: 184, b: 47, hex: '#E7B82F', label: '石黄色版', name: '石黄提亮木板', shortName: '黄', material: '石黄/藤黄', purpose: '提亮装饰' },
  { key: 'green', r: 47, g: 122, b: 97, hex: '#2F7A61', label: '石绿色版', name: '石绿冷调木板', shortName: '绿', material: '石绿/铜绿', purpose: '冷色压层' },
  { key: 'blue', r: 43, g: 91, b: 132, hex: '#2B5B84', label: '靛青蓝版', name: '靛青沉底木板', shortName: '蓝', material: '靛蓝/石青', purpose: '深冷沉底' },
  { key: 'orange', r: 217, g: 107, b: 39, hex: '#D96B27', label: '丹柿橙版', name: '雄黄丹柿木板', shortName: '橙', material: '雄黄/红丹', purpose: '暖调过渡' },
  { key: 'brown', r: 140, g: 74, b: 39, hex: '#8C4A27', label: '赭石棕版', name: '赭石古拙木板', shortName: '赭', material: '赭石/代赭', purpose: '厚重肌理' },
  { key: 'purple', r: 122, g: 59, b: 105, hex: '#7A3B69', label: '瑞紫霞版', name: '胭脂瑞紫木板', shortName: '紫', material: '胭脂/花青', purpose: '华贵点缀' },
  { key: 'pink', r: 216, g: 108, b: 122, hex: '#D86C7A', label: '桃粉开相版', name: '桃粉开相木板', shortName: '粉', material: '铅粉/胭脂', purpose: '开相柔色' }
];

exports.main = async (event = {}) => {
  const app = event._mockApp || tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });

  try {
    const imageUrl = event.imageUrl || event.imageBase64 || event.image;
    if (!imageUrl && !event.imageBuffer) {
      return {
        success: false,
        error: '缺少 imageUrl'
      };
    }

    const imageBuffer = event.imageBuffer || (await readImageBuffer(app, imageUrl));
    const coreResult = processImageBuffer(imageBuffer, {
      imageHint: String(imageUrl || ''),
      removeBackground: event.removeBackground !== false,
      flattenPalette: event.flattenPalette !== false,
      maxColors: normalizeMaxColors(event.maxColors || event.colorCount),
      palette: normalizePalette(event.palette),
      paletteLabels: normalizePaletteLabels(event.paletteLabels),
      photoMode: event.photoMode || 'auto',
      maxDimension: normalizeMaxDimension(event.maxDimension || 960)
    });

    const shouldReturnBase64 = event.returnBase64 === true || event.localOnly === true;
    const outputPrefix = normalizeOutputPrefix(event.outputPrefix);
    const jobId = createJobId();
    const results = [];

    for (let layerIndex = 0; layerIndex < coreResult.layers.length; layerIndex++) {
      const layer = coreResult.layers[layerIndex];
      let fileID = '';
      let boardFileID = '';

      if (!event.localOnly && app && typeof app.uploadFile === 'function') {
        const uploadResult = await app.uploadFile({
          cloudPath: createLayerCloudPath(jobId, layerIndex, outputPrefix),
          fileContent: layer.pngBuffer
        });
        fileID = uploadResult.fileID || '';
        if (layer.boardPngBuffer) {
          const boardUpload = await app.uploadFile({
            cloudPath: createLayerCloudPath(jobId, 'board_' + layerIndex, outputPrefix),
            fileContent: layer.boardPngBuffer
          });
          boardFileID = boardUpload.fileID || '';
        }
      }

      const layerResult = {
        key: layer.key,
        name: layer.name || layer.label || ('color_' + (layerIndex + 1)),
        label: layer.label,
        shortName: layer.shortName,
        material: layer.material,
        purpose: layer.purpose,
        color: layer.color,
        pixelCount: layer.pixelCount,
        coverageRatio: layer.coverageRatio,
        fileID,
        boardFileID
      };

      if (shouldReturnBase64) {
        layerResult.data = 'data:image/png;base64,' + layer.pngBuffer.toString('base64');
        if (layer.boardPngBuffer) {
          layerResult.boardData = 'data:image/png;base64,' + layer.boardPngBuffer.toString('base64');
        }
      }

      results.push(layerResult);
    }

    let quantizedFileID = '';
    let quantizedBase64 = '';
    if (coreResult.quantizedPngBuffer) {
      if (!event.localOnly && app && typeof app.uploadFile === 'function') {
        const quantizedUpload = await app.uploadFile({
          cloudPath: (outputPrefix || ('split-layers/' + jobId)) + '/quantized-original.png',
          fileContent: coreResult.quantizedPngBuffer
        });
        quantizedFileID = quantizedUpload.fileID || '';
      }
      if (shouldReturnBase64) {
        quantizedBase64 = 'data:image/png;base64,' + coreResult.quantizedPngBuffer.toString('base64');
      }
    }

    return {
      success: true,
      engineVersion: '2.1-dynamic-woodblock',
      mode: coreResult.mode,
      width: coreResult.width,
      height: coreResult.height,
      storagePrefix: outputPrefix || ('split-layers/' + jobId + '/'),
      colorCount: results.length,
      quantizedFileID,
      ...(quantizedBase64 ? { quantizedBase64 } : {}),
      layers: results
    };
  } catch (err) {
    console.error('分色处理失败:', err);
    return {
      success: false,
      error: '分色处理失败: ' + err.message
    };
  }
};

/**
 * 纯内存木版年画分色核心引擎 v2
 * 同时支持：
 * 1. photo 模式（实拍图 -> 双边边缘平滑 -> Sobel 墨线骨架提取 -> CIE Lab 自适应四色矿物映射 -> 形态学众数滤波与连通域降噪）
 * 2. flat 模式（AI 平涂年画 -> Lab 感知分色 -> 抗锯齿杂边清除与连通域降噪）
 */
function processImageBuffer(imageBuffer, options = {}) {
  const decoded = decodeImage(imageBuffer, options.imageHint || '');
  let { width, height, data: rawPixels } = decoded;

  const maxDimension = options.maxDimension || 960;
  if (Math.max(width, height) > maxDimension) {
    const resized = resizeRgbaBilinear(rawPixels, width, height, maxDimension);
    width = resized.width;
    height = resized.height;
    rawPixels = resized.data;
  }

  const totalPixels = width * height;
  const workingPixels = Buffer.from(rawPixels);

  // 1. 检测是实拍连续色调照片还是平涂年画
  const detectedMode = options.photoMode === true || options.photoMode === 'photo'
    ? 'photo'
    : options.photoMode === 'flat'
      ? 'flat'
      : detectImageCharacteristics(workingPixels, width, height);

  // 2. 针对实拍图先执行边缘保持空间平滑（压平皮肤/背景渐变噪点，保留五官与衣纹硬边界）
  if (detectedMode === 'photo') {
    applyEdgePreservingSmooth(workingPixels, width, height, 2);
  } else {
    applyEdgePreservingSmooth(workingPixels, width, height, 1);
  }

  // 3. 智能背景抠除（带边缘梯度阻断，防止误吞人物浅色面部或衣服）
  const bgMask = new Uint8Array(totalPixels);
  if (options.removeBackground !== false) {
    markConnectedBackground(workingPixels, width, height, bgMask, detectedMode);
  }

  // 统计前景像素数；若几乎全被当成背景（例如纯白描或特殊浅色图），回退为保留全部像素
  let foregroundCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (!bgMask[i] && workingPixels[i * 4 + 3] > 16) {
      foregroundCount++;
    }
  }
  if (foregroundCount < totalPixels * 0.04) {
    bgMask.fill(0);
    foregroundCount = totalPixels;
  }

  // 4. 确定目标木版色板（支持 'auto' 3~6 版动态矿物匹配或指定版数 K，兼容自定义色板）
  const targetPalette = buildTargetPalette(options.palette, options.paletteLabels, options.maxColors, workingPixels, totalPixels, bgMask);
  const plateCount = targetPalette.length;

  // 5. 执行像素级版面分配
  let pixelAssignment;
  if (detectedMode === 'photo' && plateCount >= 3) {
    pixelAssignment = assignPhotoToWoodblockPlates(workingPixels, width, height, bgMask, targetPalette);
  } else {
    pixelAssignment = assignFlatToWoodblockPlates(workingPixels, width, height, bgMask, targetPalette);
  }

  // 6. 空间形态学众数滤波（消除抗锯齿假色边与实拍颗粒感）+ 连通域小孤岛剔除（消灭麻点）
  const modeRadius = detectedMode === 'photo' ? 2 : 1;
  pixelAssignment = applyChromaticModeFilter(pixelAssignment, width, height, plateCount, modeRadius);
  const minInkIsland = Math.max(8, Math.round(totalPixels * 0.00012));
  const minColorIsland = Math.max(24, Math.round(totalPixels * 0.00038));
  removeSmallIslands(pixelAssignment, width, height, plateCount, minInkIsland, minColorIsland);

  // 7. 保底检查：确保没有任何一块木版是 0 像素空版（防止卷五版台印出空白）
  ensureNoEmptyPlates(pixelAssignment, workingPixels, width, height, bgMask, plateCount);

  // 8. 生成各色版 PNG 图层与宣纸合成预览图
  const flattenPalette = options.flattenPalette !== false;
  const layers = [];

  for (let layerIndex = 0; layerIndex < plateCount; layerIndex++) {
    const plate = targetPalette[layerIndex];
    const layerPng = new PNG({ width, height });
    let pixelCount = 0;

    for (let i = 0; i < totalPixels; i++) {
      const offset = i * 4;
      if (pixelAssignment[i] === layerIndex) {
        layerPng.data[offset] = flattenPalette ? plate.r : workingPixels[offset];
        layerPng.data[offset + 1] = flattenPalette ? plate.g : workingPixels[offset + 1];
        layerPng.data[offset + 2] = flattenPalette ? plate.b : workingPixels[offset + 2];
        layerPng.data[offset + 3] = 255;
        pixelCount++;
      } else {
        layerPng.data[offset] = 0;
        layerPng.data[offset + 1] = 0;
        layerPng.data[offset + 2] = 0;
        layerPng.data[offset + 3] = 0;
      }
    }

    const boardPng = new PNG({ width, height });
    const carvedRgba = generateCarvedWoodblockRgba(pixelAssignment, layerIndex, [plate.r, plate.g, plate.b], width, height);
    boardPng.data = Buffer.from(carvedRgba);

    layers.push({
      key: plate.key || ('color_' + (layerIndex + 1)),
      name: plate.name || ((plate.label || '').replace(/版$/, '') + '木板'),
      label: plate.label,
      shortName: plate.shortName || plate.label.slice(0, 1),
      material: plate.material || '矿物颜料',
      purpose: plate.purpose || '套印色版',
      color: plate.hex,
      pixelCount,
      coverageRatio: Number((pixelCount / Math.max(1, foregroundCount)).toFixed(4)),
      pngBuffer: PNG.sync.write(layerPng),
      boardPngBuffer: PNG.sync.write(boardPng)
    });
  }

  // 生成宣纸底色（#FAF3E6）上的四色套印合成图（墨线版置于最顶层压线）
  const quantized = new PNG({ width, height });
  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const layerIndex = pixelAssignment[i];
    if (layerIndex >= 0 && layerIndex < plateCount) {
      const plate = targetPalette[layerIndex];
      quantized.data[offset] = plate.r;
      quantized.data[offset + 1] = plate.g;
      quantized.data[offset + 2] = plate.b;
      quantized.data[offset + 3] = 255;
    } else {
      // 传统宣纸暖白底色
      quantized.data[offset] = 250;
      quantized.data[offset + 1] = 243;
      quantized.data[offset + 2] = 230;
      quantized.data[offset + 3] = 255;
    }
  }
  const quantizedPngBuffer = PNG.sync.write(quantized);

  return {
    mode: detectedMode,
    width,
    height,
    layers,
    quantizedPngBuffer
  };
}

/**
 * 识别输入图像是「实拍图 (photo)」还是「平涂年画/插画 (flat)」
 */
function detectImageCharacteristics(pixels, width, height) {
  const stepX = Math.max(1, Math.floor(width / 120));
  const stepY = Math.max(1, Math.floor(height / 120));
  const colorBuckets = new Map();
  let sampleCount = 0;
  let smoothGradientCount = 0;

  for (let y = stepY; y < height - stepY; y += stepY) {
    for (let x = stepX; x < width - stepX; x += stepX) {
      const idx = (y * width + x) * 4;
      const a = pixels[idx + 3];
      if (a <= 16) continue;
      const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
      if (r > 235 && g > 235 && b > 235) continue;

      sampleCount++;
      // 16 级色彩桶统计色域离散度
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      colorBuckets.set(key, (colorBuckets.get(key) || 0) + 1);

      // 检测邻域是否存在连续微渐变（实拍照片典型特征）
      const rightIdx = (y * width + (x + stepX)) * 4;
      const dr = Math.abs(r - pixels[rightIdx]);
      const dg = Math.abs(g - pixels[rightIdx + 1]);
      const db = Math.abs(b - pixels[rightIdx + 2]);
      const diff = dr + dg + db;
      if (diff > 4 && diff < 42) {
        smoothGradientCount++;
      }
    }
  }

  if (sampleCount < 50) return 'flat';

  const sortedCounts = Array.from(colorBuckets.values()).sort((a, b) => b - a);
  let top8Sum = 0;
  for (let i = 0; i < Math.min(8, sortedCounts.length); i++) {
    top8Sum += sortedCounts[i];
  }
  const top8Coverage = top8Sum / sampleCount;
  const gradientRatio = smoothGradientCount / sampleCount;

  // 若前 8 个色桶覆盖不足 72% 或连续微渐变比例较高，判定为实拍图或复杂渲染图
  if (top8Coverage < 0.72 || gradientRatio > 0.28 || colorBuckets.size > 65) {
    return 'photo';
  }
  return 'flat';
}

/**
 * 快速可分离双边边缘保持滤波（抹平实拍图皮肤/光影噪点，保留硬朗轮廓线）
 */
function applyEdgePreservingSmooth(pixels, width, height, passes = 1) {
  const totalPixels = width * height;
  const temp = Buffer.allocUnsafe(totalPixels * 4);
  const rangeThreshold = 38;

  for (let pass = 0; pass < passes; pass++) {
    // 水平方向 5-tap 边缘保持平滑
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const centerIdx = (rowOffset + x) * 4;
        const cr = pixels[centerIdx], cg = pixels[centerIdx + 1], cb = pixels[centerIdx + 2], ca = pixels[centerIdx + 3];
        if (ca <= 16) {
          temp[centerIdx] = cr; temp[centerIdx + 1] = cg; temp[centerIdx + 2] = cb; temp[centerIdx + 3] = ca;
          continue;
        }
        let sumR = cr * 2, sumG = cg * 2, sumB = cb * 2, weightSum = 2;
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const nIdx = (rowOffset + nx) * 4;
          const nr = pixels[nIdx], ng = pixels[nIdx + 1], nb = pixels[nIdx + 2];
          const diff = Math.abs(cr - nr) + Math.abs(cg - ng) + Math.abs(cb - nb);
          if (diff <= rangeThreshold * 3) {
            const w = diff <= rangeThreshold ? 2 : 1;
            sumR += nr * w; sumG += ng * w; sumB += nb * w;
            weightSum += w;
          }
        }
        temp[centerIdx] = (sumR / weightSum) | 0;
        temp[centerIdx + 1] = (sumG / weightSum) | 0;
        temp[centerIdx + 2] = (sumB / weightSum) | 0;
        temp[centerIdx + 3] = ca;
      }
    }

    // 垂直方向 5-tap 边缘保持平滑
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const centerIdx = (rowOffset + x) * 4;
        const cr = temp[centerIdx], cg = temp[centerIdx + 1], cb = temp[centerIdx + 2], ca = temp[centerIdx + 3];
        if (ca <= 16) {
          pixels[centerIdx] = cr; pixels[centerIdx + 1] = cg; pixels[centerIdx + 2] = cb; pixels[centerIdx + 3] = ca;
          continue;
        }
        let sumR = cr * 2, sumG = cg * 2, sumB = cb * 2, weightSum = 2;
        for (let dy = -2; dy <= 2; dy++) {
          if (dy === 0) continue;
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          const nIdx = (ny * width + x) * 4;
          const nr = temp[nIdx], ng = temp[nIdx + 1], nb = temp[nIdx + 2];
          const diff = Math.abs(cr - nr) + Math.abs(cg - ng) + Math.abs(cb - nb);
          if (diff <= rangeThreshold * 3) {
            const w = diff <= rangeThreshold ? 2 : 1;
            sumR += nr * w; sumG += ng * w; sumB += nb * w;
            weightSum += w;
          }
        }
        pixels[centerIdx] = (sumR / weightSum) | 0;
        pixels[centerIdx + 1] = (sumG / weightSum) | 0;
        pixels[centerIdx + 2] = (sumB / weightSum) | 0;
        pixels[centerIdx + 3] = ca;
      }
    }
  }
}

/**
 * 实拍图 -> 佛山四色木版（墨线 + 万年红 + 石黄 + 青绿）智能版画转化
 */
function assignPhotoToWoodblockPlates(pixels, width, height, bgMask, targetPalette) {
  const totalPixels = width * height;
  const assignment = new Int8Array(totalPixels).fill(-1);

  // Step 1: 计算亮度场 L (0..255) 与 Sobel 边缘梯度场 G
  const lum = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    lum[i] = (pixels[offset] * 77 + pixels[offset + 1] * 150 + pixels[offset + 2] * 29) >> 8;
  }

  const grad = new Uint16Array(totalPixels);
  const localDiff = new Int16Array(totalPixels);
  const lumHist = new Uint32Array(256);
  let fgCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (bgMask[idx] || pixels[idx * 4 + 3] <= 16) continue;
      const l = lum[idx];
      lumHist[l]++;
      fgCount++;

      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const tl = lum[(y - 1) * width + (x - 1)];
        const tc = lum[(y - 1) * width + x];
        const tr = lum[(y - 1) * width + (x + 1)];
        const ml = lum[y * width + (x - 1)];
        const mr = lum[y * width + (x + 1)];
        const bl = lum[(y + 1) * width + (x - 1)];
        const bc = lum[(y + 1) * width + x];
        const br = lum[(y + 1) * width + (x + 1)];

        const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
        const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
        grad[idx] = (Math.abs(gx) + Math.abs(gy)) >> 2;

        const meanNeighbor = (tl + tc + tr + ml + mr + bl + bc + br) >> 3;
        localDiff[idx] = meanNeighbor - l;
      }
    }
  }

  if (fgCount === 0) return assignment;

  // Step 2: 自适应确定「墨线版 (Layer 0)」阈值（控制在前景的 ~16% 左右，提取暗部骨骼与轮廓线）
  const targetInkPixels = Math.round(fgCount * 0.15);
  let acc = 0;
  let darkThreshold = 55;
  for (let l = 0; l < 256; l++) {
    acc += lumHist[l];
    if (acc >= targetInkPixels) {
      darkThreshold = l;
      break;
    }
  }
  darkThreshold = Math.max(38, Math.min(darkThreshold, 108));

  // Step 3: 对非墨线前景像素计算 CIE Lab 并映射到动态遴选的 (plateCount - 1) 块传统矿物色版
  const plateCount = targetPalette.length;
  const plateLabs = targetPalette.map((p) => rgbToLab(p.r, p.g, p.b));

  for (let i = 0; i < totalPixels; i++) {
    if (bgMask[i] || pixels[i * 4 + 3] <= 16) continue;

    const l = lum[i];
    const g = grad[i];
    const ld = localDiff[i];

    // 墨线版判据：暗部骨骼 OR 边缘轮廓凹陷线（兼容浅色宣纸上的细墨线）
    if (l <= darkThreshold || (g >= 24 && ld >= 5 && l < 205) || (ld >= 11 && l < 192)) {
      assignment[i] = 0; // 松烟墨线骨版
      continue;
    }

    const offset = i * 4;
    const r = pixels[offset], gr = pixels[offset + 1], bl = pixels[offset + 2];
    const [L, a, b] = rgbToLab(r, gr, bl);
    const chroma = Math.hypot(a, b);

    // 宣纸留白判据：高明度低饱和的纸白/米白底色直接留白，不强行染黄
    if ((L >= 86 && chroma < 19) || (l >= 224 && chroma < 24)) {
      assignment[i] = -1;
      continue;
    }

    let bestPlate = 1;
    let bestDist = Infinity;
    for (let p = 1; p < plateCount; p++) {
      const [pL, pa, pb] = plateLabs[p];
      const dist = Math.hypot((L - pL) * 0.65, a - pa, b - pb);
      if (dist < bestDist) {
        bestDist = dist;
        bestPlate = p;
      }
    }
    assignment[i] = bestPlate;
  }

  return assignment;
}

/**
 * 平涂年画 / 自定义色板模式：基于 CIE Lab 感知色差精准归类
 */
function assignFlatToWoodblockPlates(pixels, width, height, bgMask, targetPalette) {
  const totalPixels = width * height;
  const assignment = new Int8Array(totalPixels).fill(-1);
  const paletteLabs = targetPalette.map((c) => rgbToLab(c.r, c.g, c.b));

  for (let i = 0; i < totalPixels; i++) {
    if (bgMask[i]) continue;
    const offset = i * 4;
    const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2], a = pixels[offset + 3];
    if (a <= 16 || isNearWhite(r, g, b)) continue;

    const lab = rgbToLab(r, g, b);
    let minDist = Infinity;
    let bestLayer = -1;

    for (let j = 0; j < paletteLabs.length; j++) {
      const dist = deltaE76(lab, paletteLabs[j]);
      if (dist < minDist) {
        minDist = dist;
        bestLayer = j;
      }
    }

    if (bestLayer >= 0) {
      assignment[i] = bestLayer;
    }
  }

  return assignment;
}

/**
 * 空间众数滤波（消除抗锯齿伪色边缘与实拍噪点，同时保护墨线版骨架不被吞噬）
 */
function applyChromaticModeFilter(assignment, width, height, plateCount, radius = 1) {
  if (radius <= 0) return assignment;
  let current = new Int8Array(assignment);
  const next = new Int8Array(assignment.length);
  const counts = new Uint16Array(plateCount);

  for (let pass = 0; pass < 2; pass++) {
    next.set(current);
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = y * width + x;
        const centerLabel = current[idx];
        // 背景与墨线层保持锐利，仅对孤立单像素墨点做过滤
        if (centerLabel < 0) continue;

        counts.fill(0);
        for (let dy = -radius; dy <= radius; dy++) {
          const row = (y + dy) * width;
          for (let dx = -radius; dx <= radius; dx++) {
            const label = current[row + x + dx];
            if (label >= 0 && label < plateCount) {
              counts[label]++;
            }
          }
        }

        // 若中心是墨线，只有当邻域内墨线极少（孤立噪点）时才替换为周围主色
        if (centerLabel === 0) {
          if (counts[0] <= 2) {
            let bestPlate = 1, bestCount = 0;
            for (let p = 1; p < plateCount; p++) {
              if (counts[p] > bestCount) {
                bestCount = counts[p];
                bestPlate = p;
              }
            }
            if (bestCount > 0) next[idx] = bestPlate;
          }
          continue;
        }

        // 彩色版执行邻域众数平滑（排除墨线竞争，防止墨线被膨胀加粗）
        let bestPlate = centerLabel;
        let bestCount = counts[centerLabel];
        for (let p = 1; p < plateCount; p++) {
          if (counts[p] > bestCount) {
            bestCount = counts[p];
            bestPlate = p;
          }
        }
        next[idx] = bestPlate;
      }
    }
    current.set(next);
  }

  return current;
}

/**
 * BFS 连通域扫描：将面积小于阈值的孤立碎屑麻点并入相邻主色版
 */
function removeSmallIslands(assignment, width, height, plateCount, minInkArea, minColorArea) {
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  const componentPixels = new Int32Array(Math.max(minInkArea, minColorArea) + 16);
  const neighborCounts = new Uint32Array(plateCount);

  for (let start = 0; start < totalPixels; start++) {
    const label = assignment[start];
    if (label < 0 || visited[start]) continue;

    const minArea = label === 0 ? minInkArea : minColorArea;
    let head = 0, tail = 0;
    let compSize = 0;
    neighborCounts.fill(0);

    visited[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const curr = queue[head++];
      if (compSize < componentPixels.length) {
        componentPixels[compSize] = curr;
      }
      compSize++;

      const x = curr % width;
      const y = (curr / width) | 0;

      // 4-邻域展开
      if (x > 0) {
        const n = curr - 1;
        const nLabel = assignment[n];
        if (nLabel === label) {
          if (!visited[n]) { visited[n] = 1; queue[tail++] = n; }
        } else if (nLabel >= 0 && nLabel < plateCount) {
          neighborCounts[nLabel]++;
        }
      }
      if (x < width - 1) {
        const n = curr + 1;
        const nLabel = assignment[n];
        if (nLabel === label) {
          if (!visited[n]) { visited[n] = 1; queue[tail++] = n; }
        } else if (nLabel >= 0 && nLabel < plateCount) {
          neighborCounts[nLabel]++;
        }
      }
      if (y > 0) {
        const n = curr - width;
        const nLabel = assignment[n];
        if (nLabel === label) {
          if (!visited[n]) { visited[n] = 1; queue[tail++] = n; }
        } else if (nLabel >= 0 && nLabel < plateCount) {
          neighborCounts[nLabel]++;
        }
      }
      if (y < height - 1) {
        const n = curr + width;
        const nLabel = assignment[n];
        if (nLabel === label) {
          if (!visited[n]) { visited[n] = 1; queue[tail++] = n; }
        } else if (nLabel >= 0 && nLabel < plateCount) {
          neighborCounts[nLabel]++;
        }
      }
    }

    if (compSize < minArea) {
      let bestNeighbor = -1;
      let maxBorder = 0;
      for (let p = 0; p < plateCount; p++) {
        if (p !== label && neighborCounts[p] > maxBorder) {
          maxBorder = neighborCounts[p];
          bestNeighbor = p;
        }
      }
      if (bestNeighbor >= 0) {
        for (let i = 0; i < compSize; i++) {
          assignment[componentPixels[i]] = bestNeighbor;
        }
      }
    }
  }
}

/**
 * 保底机制：若某块色版像素占比过低（< 1%），自动从最接近的色版按明度/色相分流，彻底杜绝 0 像素空白木版
 */
function ensureNoEmptyPlates(assignment, pixels, width, height, bgMask, plateCount) {
  const totalPixels = width * height;
  const counts = new Uint32Array(plateCount);
  let totalAssigned = 0;

  for (let i = 0; i < totalPixels; i++) {
    const label = assignment[i];
    if (label >= 0 && label < plateCount) {
      counts[label]++;
      totalAssigned++;
    }
  }

  if (totalAssigned < 100) return;
  const minRequired = Math.max(25, Math.floor(totalAssigned * 0.015));

  for (let targetPlate = 0; targetPlate < plateCount; targetPlate++) {
    if (counts[targetPlate] >= minRequired) continue;

    // 找出当前像素最多的富余色版，按亮度分位数匀出 12% 像素给空缺木版
    let donorPlate = 0;
    let maxDonorCount = 0;
    for (let p = 0; p < plateCount; p++) {
      if (counts[p] > maxDonorCount) {
        maxDonorCount = counts[p];
        donorPlate = p;
      }
    }

    if (maxDonorCount < minRequired * 2) continue;
    const quota = Math.floor(maxDonorCount * 0.15);
    let transferred = 0;

    for (let i = 0; i < totalPixels && transferred < quota; i++) {
      if (assignment[i] !== donorPlate) continue;
      const offset = i * 4;
      const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
      const lum = (r * 77 + g * 150 + b * 29) >> 8;

      const shouldTransfer =
        (targetPlate === 0 && lum < 85) ||
        (targetPlate === 1 && r >= g) ||
        (targetPlate === 2 && lum >= 145) ||
        (targetPlate === 3 && b >= r) ||
        (i % 6 === 0);

      if (shouldTransfer) {
        assignment[i] = targetPlate;
        counts[donorPlate]--;
        counts[targetPlate]++;
        transferred++;
      }
    }
  }
}

function buildTargetPalette(requestedPalette, paletteLabels, maxColors, workingPixels, totalPixels, bgMask) {
  if (Array.isArray(requestedPalette) && requestedPalette.length >= 2) {
    return requestedPalette.map((c, idx) => {
      const fallback = FOSHAN_FOUR_PALETTE[idx] || {};
      const hex = rgbToHex(c.r, c.g, c.b);
      const label = (paletteLabels && paletteLabels[idx]) || fallback.label || getColorLabel(c.r, c.g, c.b);
      return {
        key: fallback.key || ('color_' + (idx + 1)),
        r: c.r,
        g: c.g,
        b: c.b,
        hex,
        label,
        name: fallback.name || (label.replace(/版$/, '') + '木板'),
        shortName: fallback.shortName || label.replace(/色版|木板|版/g, '').slice(0, 1),
        material: fallback.material || '传统矿物颜料',
        purpose: fallback.purpose || '分色套印'
      };
    });
  }

  const candidates = FOSHAN_FOUR_PALETTE.slice(1);
  const candidateLabs = candidates.map((c) => rgbToLab(c.r, c.g, c.b));
  const hitCounts = new Int32Array(candidates.length);
  const sumR = new Float64Array(candidates.length);
  const sumG = new Float64Array(candidates.length);
  const sumB = new Float64Array(candidates.length);
  let chromTotal = 0;

  if (workingPixels && totalPixels > 0) {
    const step = Math.max(1, Math.floor(totalPixels / 16000));
    for (let i = 0; i < totalPixels; i += step) {
      if ((bgMask && bgMask[i]) || workingPixels[i * 4 + 3] <= 16) continue;
      const off = i * 4;
      const r = workingPixels[off], g = workingPixels[off + 1], b = workingPixels[off + 2];
      const lum = (r * 77 + g * 150 + b * 29) >> 8;
      if (lum < 58 || lum > 224) continue;
      const [L, a, bStar] = rgbToLab(r, g, b);
      if (Math.hypot(a, bStar) < 16) continue;

      let bestIdx = 0, bestDist = Infinity;
      for (let c = 0; c < candidates.length; c++) {
        const [pL, pa, pb] = candidateLabs[c];
        const dist = Math.hypot((L - pL) * 0.68, a - pa, bStar - pb);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = c;
        }
      }
      hitCounts[bestIdx]++;
      sumR[bestIdx] += r;
      sumG[bestIdx] += g;
      sumB[bestIdx] += b;
      chromTotal++;
    }
  }

  const isAuto = maxColors === 'auto' || maxColors === 0 || !maxColors;
  const ranked = candidates.map((meta, idx) => ({
    idx,
    meta,
    count: hitCounts[idx],
    ratio: chromTotal > 0 ? hitCounts[idx] / chromTotal : 0
  })).sort((a, b) => b.count - a.count);

  let selected = [];
  if (isAuto) {
    selected = ranked.filter((item) => item.ratio >= 0.015 && item.count >= 4).slice(0, 5);
    if (selected.length < 3) selected = ranked.slice(0, 3);
  } else {
    const targetChromatic = Math.max(2, Math.min(Number(maxColors) - 1, 5));
    selected = ranked.slice(0, targetChromatic);
  }

  const orderPriority = { red: 1, orange: 2, yellow: 3, pink: 4, green: 5, blue: 6, purple: 7, brown: 8 };
  selected.sort((a, b) => (orderPriority[a.meta.key] || 9) - (orderPriority[b.meta.key] || 9));

  const finalPalette = [Object.assign({}, FOSHAN_FOUR_PALETTE[0])];
  selected.forEach((item) => {
    const cIdx = item.idx;
    let r = item.meta.r, g = item.meta.g, b = item.meta.b;
    if (hitCounts[cIdx] > 10) {
      r = Math.round(r * 0.72 + (sumR[cIdx] / hitCounts[cIdx]) * 0.28);
      g = Math.round(g * 0.72 + (sumG[cIdx] / hitCounts[cIdx]) * 0.28);
      b = Math.round(b * 0.72 + (sumB[cIdx] / hitCounts[cIdx]) * 0.28);
    }
    finalPalette.push(Object.assign({}, item.meta, {
      r, g, b,
      hex: rgbToHex(r, g, b)
    }));
  });

  return finalPalette;
}

/**
 * 边缘感知连通背景标记（从四角漫水填充，遇到强边缘或高饱和主体立即停止）
 */
function markConnectedBackground(pixels, width, height, bgMask, mode) {
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0, tail = 0;

  // 采样四角判断是否存在统一浅色背景或纯黑摄影棚背景
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  let seedR = 250, seedG = 245, seedB = 238, validLightCorners = 0, validDarkCorners = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  for (const idx of corners) {
    const off = idx * 4;
    const r = pixels[off], g = pixels[off + 1], b = pixels[off + 2], a = pixels[off + 3];
    const brightness = (r + g + b) / 3;
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    if (a <= 16 || (brightness > 185 && sat < 0.25)) {
      sumR += r; sumG += g; sumB += b;
      validLightCorners++;
    } else if (brightness < 20 && sat < 0.18) {
      validDarkCorners++;
    }
  }

  const hasDarkStudioBackdrop = validDarkCorners >= 2;
  if (mode === 'photo' && validLightCorners < 2 && !hasDarkStudioBackdrop) {
    return;
  }
  if (validLightCorners > 0) {
    seedR = (sumR / validLightCorners) | 0;
    seedG = (sumG / validLightCorners) | 0;
    seedB = (sumB / validLightCorners) | 0;
  }

  const isBgCandidate = (index, prevIndex) => {
    const off = index * 4;
    const r = pixels[off], g = pixels[off + 1], b = pixels[off + 2], a = pixels[off + 3];
    if (a <= 16) return true;

    const brightness = (r + g + b) / 3;
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    if (brightness > 212 && sat < 0.18) return true;

    if (hasDarkStudioBackdrop && brightness < 18 && sat < 0.16) {
      if (prevIndex < 0) return true;
      const pOff = prevIndex * 4;
      const stepDiff = Math.abs(r - pixels[pOff]) + Math.abs(g - pixels[pOff + 1]) + Math.abs(b - pixels[pOff + 2]);
      return stepDiff <= 15;
    }

    if (mode === 'photo' && validLightCorners >= 2 && prevIndex >= 0) {
      const pOff = prevIndex * 4;
      const stepDiff = Math.abs(r - pixels[pOff]) + Math.abs(g - pixels[pOff + 1]) + Math.abs(b - pixels[pOff + 2]);
      const seedDiff = Math.abs(r - seedR) + Math.abs(g - seedG) + Math.abs(b - seedB);
      return stepDiff <= 22 && seedDiff <= 55 && brightness > 175 && sat < 0.22;
    }
    return false;
  };

  const enqueue = (x, y, prevIndex) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    if (!isBgCandidate(index, prevIndex)) return;
    visited[index] = 1;
    bgMask[index] = 1;
    queue[tail++] = index;
  };

  enqueue(0, 0, -1);
  enqueue(width - 1, 0, -1);
  enqueue(0, height - 1, -1);
  enqueue(width - 1, height - 1, -1);

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = (index / width) | 0;
    enqueue(x + 1, y, index);
    enqueue(x - 1, y, index);
    enqueue(x, y + 1, index);
    enqueue(x, y - 1, index);
  }
}

function createJobId() {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

function createLayerCloudPath(jobId, layerIndex, outputPrefix) {
  if (outputPrefix) {
    return outputPrefix + '/layer_' + layerIndex + '.png';
  }
  return 'split-layers/' + jobId + '/layer_' + layerIndex + '.png';
}

function normalizeMaxColors(value) {
  if (value === 'auto' || value === 0 || value === '0' || !value) return 'auto';
  const count = parseInt(value, 10);
  if (!Number.isFinite(count) || count <= 0) return 'auto';
  return Math.max(3, Math.min(count, 6));
}

function normalizePalette(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((color) => {
    const match = String(color || '').trim().match(/^#?([0-9a-f]{6})$/i);
    if (!match) return null;
    const hex = match[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      count: 0
    };
  }).filter(Boolean);
}

function normalizePaletteLabels(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((label) => String(label || '').trim().slice(0, 16));
}

function normalizeMaxDimension(value) {
  const size = parseInt(value, 10);
  if (!Number.isFinite(size) || size <= 0) return 960;
  return Math.max(400, Math.min(size, 1800));
}

function normalizeOutputPrefix(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/^\/+|\/+$/g, '');
}

function resizeRgbaBilinear(src, width, height, maxDimension) {
  const scale = maxDimension / Math.max(width, height);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const out = Buffer.allocUnsafe(targetWidth * targetHeight * 4);

  for (let y = 0; y < targetHeight; y++) {
    const srcY = Math.min(height - 1, Math.floor(y / scale));
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.min(width - 1, Math.floor(x / scale));
      const srcOffset = (srcY * width + srcX) * 4;
      const targetOffset = (y * targetWidth + x) * 4;
      out[targetOffset] = src[srcOffset];
      out[targetOffset + 1] = src[srcOffset + 1];
      out[targetOffset + 2] = src[srcOffset + 2];
      out[targetOffset + 3] = src[srcOffset + 3];
    }
  }

  return { width: targetWidth, height: targetHeight, data: out };
}

async function readImageBuffer(app, imageUrl) {
  if (Buffer.isBuffer(imageUrl)) return imageUrl;

  if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
    const base64Data = imageUrl.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  }

  if (typeof imageUrl === 'string' && imageUrl.startsWith('cloud://')) {
    const res = await app.downloadFile({ fileID: imageUrl });
    return Buffer.isBuffer(res.fileContent) ? res.fileContent : Buffer.from(res.fileContent);
  }

  if (typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl)) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('下载图片失败 HTTP ' + response.status);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error('不支持的图片格式');
}

function decodeImage(imageBuffer, imageUrl) {
  const contentHint = String(imageUrl || '').split(';')[0].toLowerCase();
  const isPng = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4e && imageBuffer[3] === 0x47;
  const isJpeg = imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8;

  if (isPng || contentHint.includes('image/png')) {
    const png = PNG.sync.read(imageBuffer);
    return {
      width: png.width,
      height: png.height,
      data: Buffer.from(png.data)
    };
  }

  if (isJpeg || contentHint.includes('image/jpeg') || contentHint.includes('image/jpg')) {
    const rawImageData = jpeg.decode(imageBuffer, { useTArray: true });
    return {
      width: rawImageData.width,
      height: rawImageData.height,
      data: Buffer.from(rawImageData.data)
    };
  }

  throw new Error('仅支持 PNG/JPEG 图片分色');
}

function rgbToLab(r, g, b) {
  const linear = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  const x = (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047;
  const y = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const z = (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883;
  const pivot = (value) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  const fx = pivot(x), fy = pivot(y), fz = pivot(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE76(labA, labB) {
  const dl = labA[0] - labB[0];
  const da = labA[1] - labB[1];
  const db = labA[2] - labB[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

function isNearWhite(r, g, b) {
  return r > 224 && g > 224 && b > 220;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function getColorLabel(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  if (s < 0.14 || l < 0.22) return '墨黑色版';
  if (h < 22 || h >= 335) return '朱红色版';
  if (h < 78) return '石黄色版';
  return '青绿色版';
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return [h, s, l];
}

function clampByte(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function generateCarvedWoodblockRgba(cleanedLabels, plateIndex, plateRgb, width, height) {
  const total = width * height;
  const out = new Uint8Array(total * 4);
  const bevel = Math.max(5, Math.round(Math.min(width, height) * 0.022));
  const cornerR = Math.max(7, Math.round(Math.min(width, height) * 0.032));

  const xWave = new Float32Array(width);
  const xGouge = new Float32Array(width);
  const xSheen = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    xWave[x] = Math.sin(x * 0.022) * 5.2 + Math.cos(x * 0.058) * 2.1;
    xGouge[x] = Math.sin(x * 0.15) * 2.8;
    xSheen[x] = Math.cos((x / width - 0.34) * 2.1) * 13;
  }

  const ySheen = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    ySheen[y] = Math.cos((y / height - 0.30) * 2.1);
  }

  const fiberLen = (height + 32) * 4;
  const fiberLut = new Float32Array(fiberLen);
  for (let k = 0; k < fiberLen; k++) {
    const yf = k * 0.25;
    fiberLut[k] = Math.sin(yf * 0.56) * 6.8 + Math.cos(yf * 1.45) * 3.2 + Math.sin(yf * 0.13) * 8.4;
  }

  const pr = plateRgb[0], pg = plateRgb[1], pb = plateRgb[2];
  const isInkPlate = plateIndex === 0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    const ys = ySheen[y];
    const inTopBevel = y < bevel;
    const inBottomBevel = y >= height - bevel;

    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const outIdx = idx * 4;

      let dx = 0, dy = 0;
      if (x < cornerR && y < cornerR) { dx = cornerR - x; dy = cornerR - y; }
      else if (x >= width - cornerR && y < cornerR) { dx = x - (width - 1 - cornerR); dy = cornerR - y; }
      else if (x < cornerR && y >= height - cornerR) { dx = cornerR - x; dy = y - (height - 1 - cornerR); }
      else if (x >= width - cornerR && y >= height - cornerR) { dx = x - (width - 1 - cornerR); dy = y - (height - 1 - cornerR); }
      if (dx > 0 && dy > 0 && (dx * dx + dy * dy > cornerR * cornerR)) {
        out[outIdx + 3] = 0;
        continue;
      }

      const lutIdx = clampByte(Math.round((y + 12 + xWave[x]) * 4), 0, fiberLen - 1);
      const grain = fiberLut[lutIdx];
      const sheen = xSheen[x] * ys;
      const inLeftBevel = x < bevel;
      const inRightBevel = x >= width - bevel;

      if (inTopBevel || inBottomBevel || inLeftBevel || inRightBevel) {
        let bevelLight = 0;
        if (inTopBevel || inLeftBevel) bevelLight += 24;
        if (inBottomBevel || inRightBevel) bevelLight -= 36;
        if ((inTopBevel && inLeftBevel)) bevelLight += 10;
        if ((inBottomBevel && inRightBevel)) bevelLight -= 12;

        const dEdge = Math.min(x, width - 1 - x, y, height - 1 - y);
        const rimLine = dEdge === bevel - 1 ? -18 : 0;
        const delta = grain * 0.72 + sheen * 0.65 + bevelLight + rimLine;

        out[outIdx] = clampByte(Math.round(114 + delta), 24, 235);
        out[outIdx + 1] = clampByte(Math.round(66 + delta * 0.68), 14, 185);
        out[outIdx + 2] = clampByte(Math.round(35 + delta * 0.45), 8, 130);
        out[outIdx + 3] = 255;
        continue;
      }

      const raised = cleanedLabels[idx] === plateIndex;
      if (raised) {
        const tlRecessed = (cleanedLabels[idx - width - 1] !== plateIndex)
          || (cleanedLabels[idx - width] !== plateIndex)
          || (cleanedLabels[idx - 1] !== plateIndex);
        const brRecessed = (cleanedLabels[idx + width + 1] !== plateIndex)
          || (cleanedLabels[idx + width] !== plateIndex)
          || (cleanedLabels[idx + 1] !== plateIndex);

        const woodMod = grain * 0.55 + sheen * 0.42;
        let r = pr * 0.86 + (118 + woodMod) * 0.14 + woodMod * 0.45;
        let g = pg * 0.86 + (70 + woodMod * 0.7) * 0.14 + woodMod * 0.38;
        let b = pb * 0.86 + (38 + woodMod * 0.45) * 0.14 + woodMod * 0.30;

        if (tlRecessed) {
          if (isInkPlate) {
            r += 62; g += 40; b += 22;
          } else {
            r += 38; g += 32; b += 24;
          }
        } else if (brRecessed) {
          r -= 20; g -= 18; b -= 14;
        }

        out[outIdx] = clampByte(Math.round(r), 12, 252);
        out[outIdx + 1] = clampByte(Math.round(g), 10, 248);
        out[outIdx + 2] = clampByte(Math.round(b), 8, 240);
        out[outIdx + 3] = 255;
        continue;
      }

      const gougeRipple = Math.sin((y + (x >> 2)) * 0.68 + xGouge[x]) * 4.8;
      let recessDelta = grain * 0.88 + sheen * 0.55 + gougeRipple;

      if (x <= bevel + 2 || y <= bevel + 2) {
        recessDelta -= (x === bevel || y === bevel) ? 34 : 18;
      } else if (x >= width - bevel - 2 || y >= height - bevel - 2) {
        recessDelta += 12;
      }

      const ul1 = (cleanedLabels[idx - width - 1] === plateIndex)
        || (cleanedLabels[idx - width] === plateIndex)
        || (cleanedLabels[idx - 1] === plateIndex);
      const ul2 = !ul1 && x > bevel + 1 && y > bevel + 1 && (
        cleanedLabels[idx - width * 2 - 2] === plateIndex ||
        cleanedLabels[idx - width * 2 - 1] === plateIndex ||
        cleanedLabels[idx - width - 2] === plateIndex
      );
      const ul3 = !ul1 && !ul2 && x > bevel + 2 && y > bevel + 2 && (
        cleanedLabels[idx - width * 3 - 3] === plateIndex ||
        cleanedLabels[idx - width * 2 - 3] === plateIndex ||
        cleanedLabels[idx - width * 3 - 2] === plateIndex
      );

      const dr1 = (cleanedLabels[idx + width + 1] === plateIndex)
        || (cleanedLabels[idx + width] === plateIndex)
        || (cleanedLabels[idx + 1] === plateIndex);
      const dr2 = !dr1 && x < width - bevel - 2 && y < height - bevel - 2 && (
        cleanedLabels[idx + width * 2 + 2] === plateIndex
      );

      if (ul1) recessDelta -= 44;
      else if (ul2) recessDelta -= 28;
      else if (ul3) recessDelta -= 14;
      else if (dr1) recessDelta += 22;
      else if (dr2) recessDelta += 10;

      out[outIdx] = clampByte(Math.round(86 + recessDelta), 18, 210);
      out[outIdx + 1] = clampByte(Math.round(48 + recessDelta * 0.64), 10, 155);
      out[outIdx + 2] = clampByte(Math.round(25 + recessDelta * 0.42), 5, 105);
      out[outIdx + 3] = 255;
    }
  }

  return out;
}

exports.processImageBuffer = processImageBuffer;
exports.FOSHAN_FOUR_PALETTE = FOSHAN_FOUR_PALETTE;
