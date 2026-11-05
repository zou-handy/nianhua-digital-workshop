const cache = new Map();
const CLOUD_PREFIX = 'cloud://cloud1-d7g47tfdyf7a14a31.636c-cloud1-d7g47tfdyf7a14a31-1448457900/';
const HTTPS_PREFIX = 'https://636c-cloud1-d7g47tfdyf7a14a31-1448457900.tcb.qcloud.la/';

function toDirectHttpsURL(fileID) {
  if (typeof fileID === 'string' && fileID.indexOf(CLOUD_PREFIX) === 0) {
    return HTTPS_PREFIX + fileID.slice(CLOUD_PREFIX.length);
  }
  return fileID;
}

function resolveCloudURL(fileID) {
  if (!fileID || typeof fileID !== 'string') return Promise.resolve('');
  if (/^https?:\/\//i.test(fileID)) return Promise.resolve(fileID);

  const hit = cache.get(fileID);
  if (hit && hit.expireAt > Date.now() + 60000) {
    return Promise.resolve(hit.url);
  }

  return wx.cloud.getTempFileURL({
    fileList: [fileID]
  }).then(({ fileList }) => {
    const item = fileList && fileList[0];
    if (!item || item.status !== 0 || !item.tempFileURL) {
      const fallbackUrl = toDirectHttpsURL(fileID);
      if (/^https?:\/\//i.test(fallbackUrl)) return fallbackUrl;
      throw new Error((item && item.errMsg) || 'getTempFileURL failed');
    }

    cache.set(fileID, {
      url: item.tempFileURL,
      expireAt: Date.now() + 100 * 60000
    });
    return item.tempFileURL;
  }).catch((err) => {
    const fallbackUrl = toDirectHttpsURL(fileID);
    if (/^https?:\/\//i.test(fallbackUrl)) return fallbackUrl;
    throw err;
  });
}

module.exports = {
  resolveCloudURL,
  toDirectHttpsURL
};
