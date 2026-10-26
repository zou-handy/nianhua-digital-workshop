const CLOUDBASE_ENV_ID = 'cloud1-d7g47tfdyf7a14a31';
const MODEL_SERVICE = 'foshan-seed3d-api';
const VERSION_STORAGE_KEY = 'xiaonianModelVersions';

function isColdStartPollError(error) {
  const message = String(error && (error.errMsg || error.message) || error || '');
  return message.indexOf('-405005') >= 0 || message.indexOf('exceed max poll retry') >= 0;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function callContainer(path, method, data) {
  return wx.cloud.callContainer({
    config: { env: CLOUDBASE_ENV_ID },
    path,
    method,
    header: {
      'X-WX-SERVICE': MODEL_SERVICE,
      'Content-Type': 'application/json'
    },
    data: data || {}
  });
}

async function request(path, method, data) {
  let response;
  try {
    response = await callContainer(path, method, data);
  } catch (error) {
    if (!isColdStartPollError(error)) throw error;
    console.warn('[模型实验室] 云托管冷启动超时，等待实例就绪后重试');
    await wait(900);
    response = await callContainer(path, method, data);
  }
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error((response.data && response.data.error) || '模型实验室请求失败');
  }
  if (!response.data || response.data.success === false) {
    throw new Error((response.data && response.data.error) || '模型实验室处理失败');
  }
  return response.data;
}

function getCurrentModel() {
  const app = getApp();
  if (app.globalData._xiaonianModelContext && app.globalData._xiaonianModelContext.unavailable) {
    return null;
  }
  if (app.globalData._xiaonianModelContext && app.globalData._xiaonianModelContext.source) {
    return app.globalData._xiaonianModelContext;
  }
  const history = wx.getStorageSync('modelHistory') || [];
  const latest = history[0];
  if (!latest || !latest.path) return null;
  return {
    assetId: latest.id || 'latest-user-model',
    name: latest.name || '最近生成的模型',
    source: latest.fileID || latest.path,
    ownerId: 'wechat-user'
  };
}

function setCurrentModel(model) {
  getApp().globalData._xiaonianModelContext = model;
}

function saveVersion(version) {
  const stored = wx.getStorageSync(VERSION_STORAGE_KEY);
  const versions = Array.isArray(stored) ? stored : [];
  const next = [version].concat(versions.filter((item) => item.versionId !== version.versionId)).slice(0, 50);
  wx.setStorageSync(VERSION_STORAGE_KEY, next);
  return next;
}

function listVersions(assetId) {
  const stored = wx.getStorageSync(VERSION_STORAGE_KEY);
  const versions = Array.isArray(stored) ? stored : [];
  return assetId ? versions.filter((item) => item.assetId === assetId) : versions;
}

async function inspectCurrentModel() {
  const model = getCurrentModel();
  if (!model) throw new Error('请先在版台或模型历史中选择一个模型');
  const result = await request('/api/model-lab/inspect', 'POST', { source: model.source });
  return { model, report: result.report };
}

async function transformCurrentModel(operations) {
  const model = getCurrentModel();
  if (!model) throw new Error('请先在版台或模型历史中选择一个模型');
  const result = await request('/api/model-lab/transform', 'POST', {
    requestId: 'edit-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10),
    source: model.source,
    ownerId: model.ownerId || 'wechat-user',
    assetId: model.assetId || 'user-model',
    parentVersionId: model.versionId || '',
    operations
  });
  saveVersion(result.version);
  setCurrentModel({
    assetId: result.version.assetId,
    versionId: result.version.versionId,
    name: model.name + ' · 修改版',
    source: result.version.fileID,
    ownerId: result.version.ownerId,
    originalSource: model.originalSource || model.source
  });
  return result.version;
}

function restoreVersion(versionId) {
  const version = listVersions().find((item) => item.versionId === versionId);
  if (!version) throw new Error('本机没有找到该模型版本');
  setCurrentModel({
    assetId: version.assetId,
    versionId: version.versionId,
    name: '模型版本 ' + version.versionId,
    source: version.fileID,
    ownerId: version.ownerId
  });
  return version;
}

function restoreOriginal() {
  const current = getCurrentModel();
  if (!current || !current.originalSource) throw new Error('当前模型没有记录原始版本');
  const restored = {
    assetId: current.assetId,
    name: String(current.name || '模型').replace(/\s*·\s*修改版$/, '') + ' · 原始版',
    source: current.originalSource,
    originalSource: current.originalSource,
    ownerId: current.ownerId
  };
  setCurrentModel(restored);
  return restored;
}

function openCurrentModel() {
  const model = getCurrentModel();
  if (!model) throw new Error('当前没有可预览模型');
  const app = getApp();
  app.globalData._pendingModelUrl = model.source;
  app.globalData._pendingModelName = model.name || '小年模型实验室';
  app.globalData._pendingModelMode = 'glb';
  wx.navigateTo({ url: '/pages/model3d-viewer/model3d-viewer' });
}

module.exports = {
  getCapabilities: () => request('/api/model-lab/capabilities', 'GET'),
  getCurrentModel,
  setCurrentModel,
  inspectCurrentModel,
  transformCurrentModel,
  restoreVersion,
  restoreOriginal,
  listVersions,
  openCurrentModel
};
