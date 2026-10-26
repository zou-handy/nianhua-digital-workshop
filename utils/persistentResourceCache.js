const CACHE_STORAGE_KEY = 'nianhuaPersistentResourceCacheV1';
const CACHE_DIRECTORY = wx.env.USER_DATA_PATH + '/nianhua_resource_cache';
const CACHE_VERSION = '2026-07-17-assets-v2';
const MAX_CACHE_BYTES = 50 * 1024 * 1024;

function ensureCacheDirectory(fs) {
  try {
    fs.accessSync(CACHE_DIRECTORY);
  } catch (error) {
    fs.mkdirSync(CACHE_DIRECTORY);
  }
}

function readManifest() {
  try {
    const value = wx.getStorageSync(CACHE_STORAGE_KEY);
    return value && typeof value === 'object' ? value : {};
  } catch (error) {
    return {};
  }
}

function writeManifest(manifest) {
  try {
    wx.setStorageSync(CACHE_STORAGE_KEY, manifest);
  } catch (error) {
    console.warn('[资源缓存] 清单保存失败:', error);
  }
}

function hashSource(source) {
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function normalizeExtension(extension) {
  const safe = String(extension || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  return safe || 'bin';
}

function fileExists(fs, filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

function removeFile(fs, filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {}
}

function validateFile(fs, filePath, validator) {
  if (!fileExists(fs, filePath)) return false;
  if (!validator) return true;
  try {
    return validator(filePath, fs) !== false;
  } catch (error) {
    return false;
  }
}

function downloadSource(source) {
  if (source.indexOf('cloud://') === 0) {
    return new Promise((resolve, reject) => {
      wx.cloud.downloadFile({
        fileID: source,
        success: (result) => resolve(result.tempFilePath),
        fail: reject
      });
    });
  }

  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: source,
      timeout: 120000,
      success: (result) => {
        if (result.statusCode >= 200 && result.statusCode < 300 && result.tempFilePath) {
          resolve(result.tempFilePath);
          return;
        }
        reject(new Error('资源下载失败 HTTP ' + result.statusCode));
      },
      fail: reject
    });
  });
}

function trimCache(fs, manifest, protectedSource, requiredBytes = 0) {
  const entries = Object.keys(manifest).map((source) => ({
    source,
    entry: manifest[source]
  })).filter((item) => fileExists(fs, item.entry.path));

  let totalBytes = entries.reduce((sum, item) => sum + Number(item.entry.size || 0), 0);
  entries.sort((a, b) => Number(a.entry.lastAccess || 0) - Number(b.entry.lastAccess || 0));

  const targetBytes = Math.max(0, MAX_CACHE_BYTES - Number(requiredBytes || 0));
  for (const item of entries) {
    if (totalBytes <= targetBytes) break;
    if (item.source === protectedSource) continue;
    removeFile(fs, item.entry.path);
    totalBytes -= Number(item.entry.size || 0);
    delete manifest[item.source];
  }
}

async function getPersistentResource(source, options = {}) {
  if (!source) throw new Error('资源地址为空');
  if (source.indexOf('cloud://') !== 0 && !/^https?:\/\//i.test(source)) return source;

  const fs = wx.getFileSystemManager();
  ensureCacheDirectory(fs);
  const manifest = readManifest();
  const version = options.version || CACHE_VERSION;
  const extension = normalizeExtension(options.extension);
  const targetPath = CACHE_DIRECTORY + '/' + hashSource(source + '@' + version) + '.' + extension;
  const cached = manifest[source];

  if (
    cached &&
    cached.version === version &&
    cached.path === targetPath &&
    validateFile(fs, targetPath, options.validator)
  ) {
    cached.lastAccess = Date.now();
    writeManifest(manifest);
    return targetPath;
  }

  if (cached && cached.path && cached.path !== targetPath) removeFile(fs, cached.path);
  removeFile(fs, targetPath);

  const tempPath = await downloadSource(source);

  if (!validateFile(fs, tempPath, options.validator)) {
    throw new Error('下载资源校验失败');
  }

  const tempStat = fs.statSync(tempPath);
  const tempSize = Number(tempStat.size || 0);
  if (tempSize > MAX_CACHE_BYTES) {
    return tempPath;
  }

  // Reserve space before copying. A cache failure must not invalidate a
  // successfully downloaded temporary resource.
  trimCache(fs, manifest, source, tempSize);
  writeManifest(manifest);
  try {
    fs.copyFileSync(tempPath, targetPath);
  } catch (error) {
    removeFile(fs, targetPath);
    console.warn('[资源缓存] 持久化失败，改用临时文件:', error);
    return tempPath;
  }

  if (!validateFile(fs, targetPath, options.validator)) {
    removeFile(fs, targetPath);
    throw new Error('下载资源校验失败');
  }

  const stat = fs.statSync(targetPath);
  manifest[source] = {
    path: targetPath,
    version,
    size: Number(stat.size || 0),
    lastAccess: Date.now()
  };
  trimCache(fs, manifest, source);
  writeManifest(manifest);
  return targetPath;
}

function validateGLB(filePath, fs) {
  const data = fs.readFileSync(filePath);
  const bytes = new Uint8Array(data);
  return bytes.length >= 4 &&
    bytes[0] === 0x67 &&
    bytes[1] === 0x6c &&
    bytes[2] === 0x54 &&
    bytes[3] === 0x46;
}

module.exports = {
  CACHE_VERSION,
  getPersistentResource,
  validateGLB
};
