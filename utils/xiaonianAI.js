const { generateReply } = require('./nianhuaKnowledge');
const modelLab = require('./modelLabAPI');

const XIAONIAN_BOT_ID = 'ibot-xiaonian-njppux';
const XIAONIAN_AGENT_ENABLED = true;
const SESSION_THREAD_ID = createId('xiaonian-thread');
let agentUnavailable = false;
const AVATAR_STORAGE_KEY = 'xiaonianAvatarGender';
const XIAONIAN_CAPABILITY_TEXT = '我可以讲解佛山年画，也能打开 3D 展厅、完成 AI 创作与分色套印，并通过模型实验室检查、修改和回退你选中的 3D 模型。';
const AVATARS = {
  girl: 'cloud://cloud1-d7g47tfdyf7a14a31.636c-cloud1-d7g47tfdyf7a14a31-1448457900/ui/xiaonian/xiaonian-girl.jpg',
  boy: 'cloud://cloud1-d7g47tfdyf7a14a31.636c-cloud1-d7g47tfdyf7a14a31-1448457900/ui/xiaonian/xiaonian-boy.jpg'
};
const CLIENT_TOOLS = [
  {
    name: 'open_3d_gallery',
    description: '打开佛山年画小程序的 3D 模型展厅',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'open_ai_3d',
    description: '打开 AI 图生 3D 页面，让用户上传图片生成 3D 模型',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'open_ai_creation',
    description: '打开 AI 年画创作页面',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'open_layer_experience',
    description: '打开年画分色与套印体验页面',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'view_latest_model',
    description: '打开用户最近一次成功生成并保存的 3D 模型',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'list_model_capabilities',
    description: '列出小年模型实验室支持的模型检查、几何、材质、纹理、压缩和场景编辑能力',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'inspect_current_model',
    description: '检查用户当前在版台或模型历史中选中的 GLB 模型，不修改模型',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'modify_current_model',
    description: '对当前模型副本执行受控操作。永远生成新版本，不覆盖原模型。执行压缩、删除、简化和纹理转换前必须明确提醒用户可能影响效果',
    parameters: {
      type: 'object',
      required: ['operations'],
      properties: {
        operations: {
          type: 'array',
          maxItems: 24,
          items: {
            type: 'object',
            required: ['type'],
            properties: {
              type: { type: 'string' },
              nodeName: { type: 'string' },
              materialName: { type: 'string' },
              name: { type: 'string' },
              value: { type: 'array', items: { type: 'number' } },
              imageUrl: { type: 'string' },
              mimeType: { type: 'string' },
              slot: { type: 'string' },
              baseColorFactor: { type: 'array', items: { type: 'number' } },
              emissiveFactor: { type: 'array', items: { type: 'number' } },
              metallicFactor: { type: 'number' },
              roughnessFactor: { type: 'number' },
              doubleSided: { type: 'boolean' },
              alphaMode: { type: 'string' },
              options: { type: 'object' }
            }
          }
        }
      }
    }
  },
  {
    name: 'list_model_versions',
    description: '列出当前模型在本机记录的最近修改版本，供用户选择回退点',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'restore_model_version',
    description: '把当前预览指针切回某个历史版本，不删除其他版本',
    parameters: {
      type: 'object',
      required: ['versionId'],
      properties: { versionId: { type: 'string' } }
    }
  },
  {
    name: 'restore_original_model',
    description: '将当前模型预览切回修改前的原始文件，不删除任何历史版本',
    parameters: { type: 'object', properties: {} }
  }
];

const TOOL_ROUTES = {
  open_3d_gallery: '/pages/gallery/gallery',
  open_ai_3d: '/pages/ai-3d/ai-3d',
  open_ai_creation: '/pages/ai-create/ai-create',
  open_layer_experience: '/pages/exploded-view/exploded-view'
};
const LOCAL_TOOL_INTENTS = [
  { toolName: 'list_model_capabilities', pattern: /(?:模型实验室|3d模型).*(?:能力|能做什么|支持什么)/i, reply: '正在读取模型实验室能力。' },
  { toolName: 'inspect_current_model', pattern: /(?:检查|分析|诊断).*(?:当前|这个|3d|模型)/i, reply: '正在检查当前模型。' },
  { toolName: 'view_latest_model', pattern: /(?:打开|查看|看看).*(?:最近|最新).*(?:3d|模型)/i, reply: '正在打开你最近生成的 3D 模型。' },
  { toolName: 'open_3d_gallery', pattern: /(?:打开|进入|去).*(?:3d|模型).*(?:展厅|画廊)/i, reply: '正在打开 3D 模型展厅。' },
  { toolName: 'open_ai_3d', pattern: /(?:打开|进入|去).*(?:图生|生成|制作).*(?:3d|模型)/i, reply: '正在打开 AI 图生 3D 工具。' },
  { toolName: 'open_ai_creation', pattern: /(?:打开|进入|去).*(?:ai|年画).*(?:创作|生成)/i, reply: '正在打开 AI 年画创作。' },
  { toolName: 'open_layer_experience', pattern: /(?:打开|进入|去).*(?:分色|套印|印刷)/i, reply: '正在打开年画分色与套印体验。' }
];

function createId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function getAvatarGender() {
  const storedGender = wx.getStorageSync(AVATAR_STORAGE_KEY);
  return storedGender === 'boy' ? 'boy' : 'girl';
}

function getAvatarState() {
  const avatarGender = getAvatarGender();
  return { avatarGender, avatarUrl: AVATARS[avatarGender] };
}

function getCapabilityText() {
  return XIAONIAN_CAPABILITY_TEXT;
}

function toggleAvatar() {
  const avatarGender = getAvatarGender() === 'girl' ? 'boy' : 'girl';
  wx.setStorageSync(AVATAR_STORAGE_KEY, avatarGender);
  return { avatarGender, avatarUrl: AVATARS[avatarGender] };
}

function compareVersion(left, right) {
  const leftParts = String(left || '0').split('.').map(Number);
  const rightParts = String(right || '0').split('.').map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index++) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function supportsCloudBaseAgent() {
  const appBaseInfo = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
  const sdkVersion = appBaseInfo.SDKVersion || '0';
  return compareVersion(sdkVersion, '3.15.1') >= 0;
}

async function parseAgentEvent(event) {
  let payload = event && Object.prototype.hasOwnProperty.call(event, 'json') ? event.json : event;
  if (typeof payload === 'function') payload = payload();
  payload = await payload;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (err) { return null; }
  }
  if (payload && payload.data && !payload.type) payload = payload.data;
  return payload || null;
}

async function callCloudBaseAgent(text, pageContext) {
  const botApi = wx.cloud && wx.cloud.extend && wx.cloud.extend.AI && wx.cloud.extend.AI.bot;
  if (!botApi || typeof botApi.sendMessage !== 'function') {
    throw new Error('当前基础库不支持 CloudBase Agent');
  }

  const content = pageContext ? pageContext + '\n\n用户问题：' + text : text;
  const response = await botApi.sendMessage({
    botId: XIAONIAN_BOT_ID,
    data: {
      threadId: SESSION_THREAD_ID,
      runId: createId('run'),
      messages: [{ id: createId('message'), role: 'user', content }],
      tools: CLIENT_TOOLS,
      context: pageContext ? [{ description: pageContext, value: pageContext }] : [],
      state: {},
      forwardedProps: {}
    }
  });

  let reply = '';
  const toolCalls = new Map();
  for await (const event of response.eventStream) {
    const payload = await parseAgentEvent(event);
    if (!payload) continue;
    if (payload.type === 'TEXT_MESSAGE_CONTENT' || payload.type === 'TEXT_MESSAGE_CHUNK') {
      reply += payload.delta || payload.content || payload.text || '';
    }
    if (payload.type === 'MESSAGES_SNAPSHOT' && Array.isArray(payload.messages)) {
      const assistantMessage = payload.messages.slice().reverse().find((message) => message.role === 'assistant');
      if (assistantMessage && assistantMessage.content) reply = assistantMessage.content;
    }
    if (payload.type === 'RUN_ERROR') {
      throw new Error(payload.message || 'CloudBase Agent 运行失败');
    }
    if (payload.type === 'TOOL_CALL_START') {
      toolCalls.set(payload.toolCallId, { name: payload.toolCallName || payload.name, args: '' });
    }
    if (payload.type === 'TOOL_CALL_ARGS') {
      const toolCall = toolCalls.get(payload.toolCallId);
      if (toolCall) toolCall.args += payload.delta || payload.args || '';
    }
    if (payload.type === 'TOOL_CALL_END') {
      const toolCall = toolCalls.get(payload.toolCallId);
      if (toolCall) {
        let args = {};
        try { args = toolCall.args ? JSON.parse(toolCall.args) : {}; } catch (error) { args = {}; }
        const toolReply = await executeClientTool(toolCall.name, args);
        if (toolReply && !reply.trim()) reply = toolReply;
      }
    }
  }

  if (!reply.trim()) {
    throw new Error('CloudBase Agent 未返回文字内容');
  }
  return reply.trim();
}

function confirmModelChange(operations) {
  const summary = operations.map((operation) => operation.type).join('、');
  return new Promise((resolve) => {
    wx.showModal({
      title: '生成模型新版本',
      content: '将执行：' + summary + '。原模型不会被覆盖，完成后可以回退。',
      confirmText: '开始处理',
      success: (result) => resolve(Boolean(result.confirm)),
      fail: () => resolve(false)
    });
  });
}

async function executeClientTool(toolName, args) {
  if (toolName === 'list_model_capabilities') {
    const result = await modelLab.getCapabilities();
    const count = Object.keys(result.operations || {}).reduce((total, key) => total + result.operations[key].length, 0);
    wx.showModal({ title: '小年模型实验室', content: '已开放 ' + count + ' 项受控操作，覆盖几何、压缩、场景、材质和纹理。', showCancel: false });
    return '模型实验室当前开放 ' + count + ' 项操作。';
  }
  if (toolName === 'inspect_current_model') {
    wx.showLoading({ title: '正在检查模型' });
    try {
      const result = await modelLab.inspectCurrentModel();
      const report = result.report;
      wx.showModal({
        title: result.model.name || '模型检查结果',
        content: '大小 ' + (report.byteLength / 1048576).toFixed(1) + 'MB，' + report.meshes + ' 个网格，' + report.nodes + ' 个节点，' + report.materials + ' 个材质，' + report.textures + ' 张纹理。',
        showCancel: false
      });
      return '模型检查完成，没有修改原文件。';
    } finally {
      wx.hideLoading();
    }
  }
  if (toolName === 'modify_current_model') {
    const operations = Array.isArray(args && args.operations) ? args.operations : [];
    if (!operations.length) throw new Error('没有收到有效的模型操作');
    if (!(await confirmModelChange(operations))) return '已取消模型修改。';
    wx.showLoading({ title: '模型处理中', mask: true });
    try {
      const version = await modelLab.transformCurrentModel(operations);
      const requiresDecoder = operations.some((operation) => ['draco', 'meshopt', 'textureCompress'].includes(operation.type));
      if (requiresDecoder) {
        wx.showModal({
          title: '实验版本已生成',
          content: '该版本使用了压缩扩展，已保存但暂不自动进入小程序展厅。需要先接入对应解码器再预览。',
          showCancel: false
        });
      } else {
        modelLab.openCurrentModel();
      }
      return '模型新版本 ' + version.versionId + ' 已生成，原版本仍然保留。';
    } finally {
      wx.hideLoading();
    }
  }
  if (toolName === 'list_model_versions') {
    const current = modelLab.getCurrentModel();
    const versions = modelLab.listVersions(current && current.assetId).slice(0, 5);
    const content = versions.length
      ? versions.map((version, index) => (index + 1) + '. ' + version.versionId).join('\n')
      : '当前模型还没有修改版本。';
    wx.showModal({ title: '最近模型版本', content, showCancel: false });
    return content;
  }
  if (toolName === 'restore_model_version') {
    const version = modelLab.restoreVersion(args && args.versionId);
    modelLab.openCurrentModel();
    return '已切换到模型版本 ' + version.versionId + '。';
  }
  if (toolName === 'restore_original_model') {
    modelLab.restoreOriginal();
    modelLab.openCurrentModel();
    return '已经切回原始模型，所有修改版本仍然保留。';
  }
  if (toolName === 'view_latest_model') {
    const history = wx.getStorageSync('modelHistory') || [];
    const latestModel = history[0];
    if (!latestModel || !latestModel.path) {
      wx.showToast({ title: '还没有生成过 3D 模型', icon: 'none' });
      return '还没有生成过 3D 模型。';
    }
    const app = getApp();
    app.globalData._pendingModelUrl = latestModel.path;
    app.globalData._pendingModelName = latestModel.name || 'AI 生成模型';
    wx.navigateTo({ url: '/pages/model3d-viewer/model3d-viewer' });
    return '已打开最近生成的 3D 模型。';
  }

  const route = TOOL_ROUTES[toolName];
  if (route) {
    wx.navigateTo({ url: route });
    return '页面已打开。';
  }
  return '';
}

function tryExecuteClientCommand(text) {
  const intent = LOCAL_TOOL_INTENTS.find((item) => item.pattern.test(text));
  if (!intent) return '';
  executeClientTool(intent.toolName).catch((error) => {
    console.error('[小年] 客户端工具执行失败:', error);
    wx.showToast({ title: error.message || '操作失败', icon: 'none' });
  });
  return intent.reply;
}

async function callChatFunction(history, pageContext) {
  const response = await wx.cloud.callFunction({
    name: 'chatWithNianhua',
    data: {
      messages: history,
      currentPage: pageContext
    }
  });
  const result = response.result || {};
  if (!result.success || !result.reply) {
    throw new Error(result.error || '小年云函数调用失败');
  }
  return result.reply;
}

async function askXiaonian(options) {
  const text = String(options.text || '').trim();
  const history = Array.isArray(options.history) ? options.history : [];
  const pageContext = options.pageContext || '';
  const commandReply = tryExecuteClientCommand(text);
  if (commandReply) {
    return { reply: commandReply, source: 'clientTool' };
  }

  try {
    if (XIAONIAN_AGENT_ENABLED && !agentUnavailable && supportsCloudBaseAgent()) {
      return { reply: await callCloudBaseAgent(text, pageContext), source: 'agent' };
    }
  } catch (agentError) {
    agentUnavailable = true;
    console.warn('[小年] CloudBase Agent 调用失败，降级到云函数:', agentError);
  }

  try {
    return { reply: await callChatFunction(history, pageContext), source: 'cloudFunction' };
  } catch (functionError) {
    console.warn('[小年] 云函数调用失败，降级到本地知识库:', functionError);
  }

  return { reply: generateReply(text), source: 'local' };
}

module.exports = {
  askXiaonian,
  getCapabilityText,
  getAvatarState,
  toggleAvatar
};
