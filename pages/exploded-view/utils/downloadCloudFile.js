const { resolveCloudURL } = require('./resolveCloudURL');
const { getPersistentResource } = require('../../../utils/persistentResourceCache');

function downloadCloudFile(fileID) {
  if (!fileID || !fileID.startsWith('cloud://')) {
    return Promise.reject(new Error('invalid cloud fileID'));
  }

  const fileName = fileID.split('/').pop() || '';
  const extensionMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  return getPersistentResource(fileID, {
    extension: extensionMatch ? extensionMatch[1] : 'png'
  });
}

function downloadRemoteFile(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      timeout: 60000,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath);
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
