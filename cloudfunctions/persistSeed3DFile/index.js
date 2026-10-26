const tcb = require('@cloudbase/node-sdk');

function normalizeFormat(format) {
  return format === 'zip' ? 'zip' : 'glb';
}

exports.main = async (event = {}) => {
  const sourceUrl = String(event.sourceUrl || '');
  const taskId = String(event.taskId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const format = normalizeFormat(event.fileFormat);

  if (!taskId || !/^https:\/\//i.test(sourceUrl)) {
    return { success: false, error: '模型文件参数无效' };
  }

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error('下载火山生成文件失败 HTTP ' + response.status);
    }
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 80 * 1024 * 1024) {
      throw new Error('生成模型超过 80MB 限制');
    }

    const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
    const fileContent = Buffer.from(await response.arrayBuffer());
    const uploadResult = await app.uploadFile({
      cloudPath: 'seed3d-results/' + taskId + '.' + format,
      fileContent
    });
    return {
      success: true,
      fileID: uploadResult.fileID,
      fileFormat: format
    };
  } catch (error) {
    console.error('[Seed3D 转存]', error);
    return { success: false, error: error.message || '模型转存失败' };
  }
};
