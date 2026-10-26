const tcb = require('@cloudbase/node-sdk');

const IMAGE_EXT_BY_CONTENT_TYPE = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

function getImageExtension(contentType, url) {
  const normalized = (contentType || '').split(';')[0].trim().toLowerCase();
  if (IMAGE_EXT_BY_CONTENT_TYPE[normalized]) {
    return IMAGE_EXT_BY_CONTENT_TYPE[normalized];
  }

  const match = String(url || '').split('?')[0].match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : 'png';
}

function createCloudPath(ext) {
  const random = Math.random().toString(36).slice(2, 10);
  return `ai-generated-images/${Date.now()}-${random}.${ext}`;
}

async function persistImageToStorage(app, imageUrl) {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return null;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`下载生成图片失败 HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  const ext = getImageExtension(contentType, imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const uploadResult = await app.uploadFile({
    cloudPath: createCloudPath(ext),
    fileContent: Buffer.from(arrayBuffer)
  });

  return {
    fileID: uploadResult.fileID,
    contentType
  };
}

exports.main = async (event) => {
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
  const ai = app.ai();
  const imageModel = ai.createImageModel(process.env.PROVIDER || 'hunyuan-image');

  if (process.env.ENDPOINT_PATH) {
    imageModel.defaultGenerateImageSubUrl = process.env.ENDPOINT_PATH;
  }

  if (!event.prompt) {
    return {
      success: false,
      code: 'invalid_param',
      message: '缺少 prompt 参数'
    };
  }

  const {
    style,
    model = 'hunyuan-image',
    version = 'v1.9',
    size = '1024x1024',
    revise = false,
    ...restEvent
  } = event;
  const supportedSize = ['1024x1024', '768x768'].indexOf(size) > -1 ? size : '1024x1024';

  try {
    const res = await imageModel.generateImage({
      model,
      version,
      size: supportedSize,
      revise,
      ...(style ? { style } : {}),
      ...restEvent
    });

    const { data, error } = res;

    if (error) {
      return { success: false, ...error };
    }

    const img = data?.[0] || {};
    const { url, ...rest } = img;
    const storedImage = await persistImageToStorage(app, url);

    return {
      ...rest,
      imageUrl: storedImage?.fileID || url || '',
      fileID: storedImage?.fileID || '',
      originalImageUrl: url || '',
      contentType: storedImage?.contentType || '',
      success: true
    };
  } catch (e) {
    return {
      success: false,
      code: 'request_error',
      message: e.message
    };
  }
};
