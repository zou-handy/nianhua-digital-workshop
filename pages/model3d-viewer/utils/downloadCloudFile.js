const { resolveCloudURL } = require('./resolveCloudURL');
const { getPersistentResource, validateGLB } = require('../../../utils/persistentResourceCache');

function downloadCloudFile(fileID) {
  if (!fileID || !fileID.startsWith('cloud://')) {
    return Promise.reject(new Error('invalid cloud fileID'));
  }
  const version = fileID.indexOf('/model/advanced-print/set-1/yellow-board.glb') >= 0
    ? '2026-07-20-set1-yellow-v2'
    : (fileID.indexOf('/model/advanced-print/set-2/black-board-v2.glb') >= 0
      ? '2026-07-20-set2-black-v2'
      : undefined);
  return getPersistentResource(fileID, {
    extension: 'glb',
    validator: validateGLB,
    ...(version ? { version } : {})
  });
}

function downloadRemoteFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      ...(targetPath ? { filePath: targetPath } : {}),
      timeout: 60000,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.filePath || targetPath || res.tempFilePath);
          return;
        }
        reject(new Error('HTTP ' + res.statusCode));
      },
      fail: reject
    });
  });
}

async function downloadFileToTemp(source) {
  if (!source) {
    throw new Error('empty file source');
  }

  if (source.startsWith('cloud://')) {
    return downloadCloudFile(source);
  }

  return downloadRemoteFile(source);
}

async function resolvePreviewURL(source) {
  if (!source || !source.startsWith('cloud://')) {
    return source;
  }

  return resolveCloudURL(source);
}

module.exports = {
  downloadCloudFile,
  downloadFileToTemp,
  resolvePreviewURL
};
