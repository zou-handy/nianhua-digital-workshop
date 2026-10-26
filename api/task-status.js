// 根据 taskId 查询 Seed3D 任务状态，完成后返回 .glb 下载 URL

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const ARK_API_KEY = process.env.ARK_API_KEY
  if (!ARK_API_KEY) {
    return res.status(500).json({ error: 'API Key 未配置' })
  }

  const taskId = req.query.taskId
  if (!taskId) {
    return res.status(400).json({ error: '缺少 taskId' })
  }

  try {
    const response = await fetch(
      `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${taskId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ARK_API_KEY}`
        }
      }
    )

    const result = await response.json()
    console.log('[task-status] 完整响应:', JSON.stringify(result))

    if (!response.ok) {
      return res.status(response.status).json({ error: '查询失败', detail: result })
    }

    const taskStatus = {
      taskId: result.id,
      status: result.status,
      progress: result.progress || null
    }

    // 任务成功时，灵活解析模型 URL
    if (result.status === 'succeeded' && result.content) {
      let modelUrl = null
      let fileUrl = null

      // Seed3D 2.0: content.file_url 返回 ZIP 压缩包
      if (result.content.file_url) {
        fileUrl = result.content.file_url
      }

      if (result.content.model_urls && result.content.model_urls.length > 0) {
        const glbFile = result.content.model_urls.find(
          f => f.format === 'glb' || (f.url && f.url.endsWith('.glb'))
        )
        modelUrl = glbFile ? glbFile.url : result.content.model_urls[0].url
      } else if (Array.isArray(result.content)) {
        for (const item of result.content) {
          if (item.url) { modelUrl = item.url; break }
          if (item.file_url) { fileUrl = fileUrl || item.file_url; break }
          if (item.model_url) { modelUrl = item.model_url; break }
          if (item.model_urls && item.model_urls.length > 0) {
            modelUrl = item.model_urls[0].url || item.model_urls[0]; break
          }
        }
      } else if (result.content.url) {
        modelUrl = result.content.url
      } else if (typeof result.content === 'string') {
        modelUrl = result.content
      }

      if (modelUrl) {
        taskStatus.modelUrl = modelUrl
      }
      if (fileUrl) {
        taskStatus.fileUrl = fileUrl
        taskStatus.fileFormat = 'zip'
      }
      taskStatus._debug = result.content
    }

    // 也检查顶层的 output 字段（某些 API 版本用 output 而非 content）
    if (result.status === 'succeeded' && !taskStatus.modelUrl && !taskStatus.fileUrl && result.output) {
      if (result.output.model_urls && result.output.model_urls.length > 0) {
        taskStatus.modelUrl = result.output.model_urls[0].url || result.output.model_urls[0]
      } else if (result.output.url) {
        taskStatus.modelUrl = result.output.url
      } else if (result.output.file_url) {
        taskStatus.fileUrl = result.output.file_url
        taskStatus.fileFormat = 'zip'
      }
      taskStatus._debug = result.output
    }

    if (result.status === 'failed') {
      taskStatus.error = result.error || result.message || '生成失败'
    }

    return res.status(200).json(taskStatus)
  } catch (err) {
    console.error('[task-status] 错误:', err)
    return res.status(500).json({ error: err.message })
  }
}
