const http = require('http');
const modelLab = require('./model-lab');

const ARK_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';
const PORT = Number(process.env.PORT || 8080);

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  response.end(JSON.stringify(data));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) {
        reject(new Error('请求体过大'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('请求 JSON 格式错误'));
      }
    });
    request.on('error', reject);
  });
}

function getArkApiKey() {
  if (!process.env.ARK_API_KEY) {
    throw new Error('ARK_API_KEY 未配置');
  }
  return process.env.ARK_API_KEY;
}

function getMiniAppIdentity(request) {
  const openId = String(request.headers['x-wx-openid'] || '').trim();
  if (!openId && process.env.MODEL_LAB_ALLOW_PUBLIC !== 'true') {
    const error = new Error('模型实验室仅允许小程序登录用户调用');
    error.statusCode = 401;
    throw error;
  }
  return openId || 'local-model-lab';
}

async function submitGenerate(request, response) {
  const body = await readJsonBody(request);
  if (!body.imageUrl) {
    sendJson(response, 400, { success: false, error: '缺少 imageUrl' });
    return;
  }

  const arkResponse = await fetch(ARK_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getArkApiKey()
    },
    body: JSON.stringify({
      model: 'doubao-seed3d-2-0-260328',
      content: [
        { type: 'text', text: ' --meshquality high --fileformat glb' },
        { type: 'image_url', image_url: { url: body.imageUrl } }
      ]
    })
  });

  const result = await arkResponse.json();
  if (!arkResponse.ok) {
    sendJson(response, arkResponse.status, { success: false, error: '火山方舟请求失败', detail: result });
    return;
  }

  sendJson(response, 200, { success: true, taskId: result.id, status: result.status });
}

function extractTaskResult(result) {
  const taskStatus = {
    taskId: result.id,
    status: result.status,
    progress: result.progress || null
  };
  const content = result.content || result.output;

  if (result.status === 'succeeded' && content) {
    if (content.file_url) {
      taskStatus.fileUrl = content.file_url;
      taskStatus.fileFormat = 'zip';
    } else if (Array.isArray(content.model_urls) && content.model_urls.length) {
      const glb = content.model_urls.find((item) => item.format === 'glb');
      taskStatus.modelUrl = (glb || content.model_urls[0]).url || glb || content.model_urls[0];
    } else if (content.url) {
      taskStatus.modelUrl = content.url;
    } else if (typeof content === 'string') {
      taskStatus.modelUrl = content;
    } else if (Array.isArray(content)) {
      for (const item of content) {
        if (item.file_url) {
          taskStatus.fileUrl = item.file_url;
          taskStatus.fileFormat = 'zip';
          break;
        }
        if (item.model_url || item.url) {
          taskStatus.modelUrl = item.model_url || item.url;
          break;
        }
      }
    }
  }

  if (result.status === 'failed') {
    taskStatus.error = result.error || result.message || '生成失败';
  }
  return taskStatus;
}

async function queryTask(requestUrl, response) {
  const taskId = requestUrl.searchParams.get('taskId');
  if (!taskId) {
    sendJson(response, 400, { error: '缺少 taskId' });
    return;
  }

  const arkResponse = await fetch(ARK_API_BASE + '/' + encodeURIComponent(taskId), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getArkApiKey()
    }
  });
  const result = await arkResponse.json();
  if (!arkResponse.ok) {
    sendJson(response, arkResponse.status, { error: '查询失败', detail: result });
    return;
  }
  sendJson(response, 200, extractTaskResult(result));
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 200, { ok: true });
    return;
  }

  const requestUrl = new URL(request.url, 'http://localhost');
  try {
    if (request.method === 'GET' && requestUrl.pathname === '/healthz') {
      sendJson(response, 200, { ok: true, service: 'foshan-nianhua-seed3d' });
      return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/generate-3d') {
      await submitGenerate(request, response);
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/api/task-status') {
      await queryTask(requestUrl, response);
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/api/model-lab/capabilities') {
      sendJson(response, 200, { success: true, ...modelLab.getCapabilities() });
      return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/model-lab/inspect') {
      getMiniAppIdentity(request);
      sendJson(response, 200, await modelLab.inspectModel(await readJsonBody(request)));
      return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/model-lab/transform') {
      const identity = getMiniAppIdentity(request);
      sendJson(response, 200, await modelLab.transformModel(await readJsonBody(request), identity));
      return;
    }
    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    console.error('[Seed3D]', error);
    sendJson(response, error.statusCode || 500, { error: error.message || '服务器错误' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Seed3D service listening on port ' + PORT);
});
