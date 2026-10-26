const app = getApp()
const { buildShareAppMessage } = require('../../utils/shareConfig')

const CLOUDBASE_ENV_ID = 'cloud1-d7g47tfdyf7a14a31'
const SEED3D_SERVICE = 'foshan-seed3d-api'

Page({
  onShareAppMessage: buildShareAppMessage,

  data: {
    imagePath: '',
    loading: false,
    loadingText: '',
    modelHistory: []
  },

  onLoad(options) {
    const history = wx.getStorageSync('modelHistory') || []
    const presetImage = app.globalData._pendingSeed3DImage || ''
    const presetName = app.globalData._pendingSeed3DName || ''
    app.globalData._pendingSeed3DImage = ''
    app.globalData._pendingSeed3DName = ''
    this._presetModelName = presetName
    this.setData({
      modelHistory: history,
      imagePath: presetImage
    })
    if (presetImage && options && options.source === 'volume5') {
      wx.showToast({ title: '已预置卷五木板', icon: 'none' })
    }
  },

  onShow() {
    const history = wx.getStorageSync('modelHistory') || []
    this.setData({ modelHistory: history })
  },

  chooseImage() {
    if (this.data.loading) return

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          imagePath: res.tempFiles[0].tempFilePath
        })
      }
    })
  },

  async generate3D() {
    if (!this.data.imagePath || this.data.loading) return

    this._sourceCloudFiles = []
    this.setData({ loading: true, loadingText: '正在压缩图片...' })

    try {
      const compressedPath = await this._compressImage(this.data.imagePath, 50)
      this.setData({ loadingText: '正在上传图片到云端...' })
      const imageUrl = await this._uploadSourceImage(compressedPath)

      let genRes
      try {
        genRes = await this._submitGenerate(imageUrl)
      } catch (firstErr) {
        console.log('[AI-3D] 首次上传失败，重试中...', firstErr)
        this.setData({ loadingText: '上传超时，正在压缩后重试...' })
        const compressedPath2 = await this._compressImage(this.data.imagePath, 30)
        const imageUrlRetry = await this._uploadSourceImage(compressedPath2)
        genRes = await this._submitGenerate(imageUrlRetry)
      }

      const taskId = genRes.taskId
      console.log('[AI-3D] 任务已创建:', taskId)

      // 轮询任务状态
      this.setData({ loadingText: 'AI 正在生成 3D 模型...' })
      const remoteResult = await this._pollTaskStatus(taskId)
      const result = await this._persistGeneratedFile(taskId, remoteResult)
      let localGlbPath = ''

      if (result.modelUrl) {
        localGlbPath = await this._downloadModelFile(result.modelUrl)
      } else if (result.fileUrl) {
        localGlbPath = result.fileFormat === 'zip' || this._isZipUrl(result.fileUrl)
          ? await this._downloadAndUnzip(result.fileUrl)
          : await this._downloadModelFile(result.fileUrl)
      }

      if (!localGlbPath) {
        throw new Error('生成完成但模型文件保存失败')
      }

      app.globalData._pendingModelUrl = localGlbPath
      app.globalData._pendingModelName = this._presetModelName || 'AI 生成模型'
      wx.showToast({ title: '生成成功！', icon: 'success' })
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/model3d-viewer/model3d-viewer' })
      }, 500)
    } catch (err) {
      console.error('[AI-3D] 错误:', err)
      wx.showModal({
        title: '生成失败',
        content: err.message || '未知错误，请重试',
        showCancel: false
      })
    } finally {
      await this._cleanupSourceImages()
      this.setData({ loading: false, loadingText: '' })
    }
  },

  // 每10秒查一次，最多90次（15分钟）
  _pollTaskStatus(taskId) {
    return new Promise((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 90
      const pollInterval = 10000

      const poll = () => {
        attempts++

        if (attempts > maxAttempts) {
          reject(new Error('生成超时，请稍后重试'))
          return
        }

        let loadingText = '正在生成3D模型...'
        if (attempts > 60) {
          loadingText = '即将完成，请再等等...'
        } else if (attempts >= 40) {
          loadingText = '模型较复杂，还需要一点时间...'
        } else if (attempts >= 20) {
          loadingText = 'AI正在努力生成中，请耐心等待...'
        }

        this.setData({
          loadingText: loadingText
        })

        this._callSeed3D('/api/task-status?taskId=' + encodeURIComponent(taskId), 'GET')
          .then((data) => {
            console.log('[AI-3D] 任务状态:', data.status, data)

            if (data._debug) {
              console.log('[AI-3D] 返回内容结构:', JSON.stringify(data._debug))
            }

            if (data.status === 'succeeded') {
              if (data.modelUrl) {
                resolve({ modelUrl: data.modelUrl })
              } else if (data.fileUrl) {
                resolve({ fileUrl: data.fileUrl, fileFormat: data.fileFormat })
              } else {
                console.error('[AI-3D] 生成完成但无可用URL，_debug:', data._debug)
                reject(new Error('生成完成但模型URL解析失败，请查看控制台日志'))
              }
            } else if (data.status === 'failed') {
              let errorMsg = 'AI 生成失败'
              if (data.error) {
                if (typeof data.error === 'string') {
                  errorMsg = data.error
                } else if (data.error.message) {
                  errorMsg = data.error.message
                } else {
                  errorMsg = JSON.stringify(data.error)
                }
              }
              reject(new Error(errorMsg))
            } else {
              setTimeout(poll, pollInterval)
            }
          })
          .catch(() => {
            setTimeout(poll, pollInterval)
          })
      }

      poll()
    })
  },

  _downloadAndUnzip(fileUrl) {
    const self = this
    return new Promise((resolve, reject) => {
      self.setData({ loadingText: '正在下载模型文件...' })

      const zipPath = self._prepareDownloadPath('seed3d_downloads', 'seed3d_' + Date.now() + '.zip')

      self._resolveDownloadURL(fileUrl).then((downloadUrl) => {
        const downloadTask = wx.downloadFile({
        url: downloadUrl,
        filePath: zipPath,
        success: (dlRes) => {
          if (dlRes.statusCode !== 200) {
            reject(new Error('下载失败，HTTP ' + dlRes.statusCode))
            return
          }

          const fs = wx.getFileSystemManager()
          const unzipDir = wx.env.USER_DATA_PATH + '/seed3d_temp'

          self.setData({ loadingText: '正在解压模型...' })

          if (!self._hasFileSignature(zipPath, [0x50, 0x4b])) {
            reject(new Error('下载结果不是有效 ZIP，火山引擎可能返回了错误信息'))
            return
          }

          try {
            fs.accessSync(unzipDir)
            self._removeDir(fs, unzipDir)
          } catch (e) {}

          fs.unzip({
            zipFilePath: zipPath,
            targetPath: unzipDir,
            success: () => {
              try {
                const files = self._listAllFiles(fs, unzipDir)
                console.log('[AI-3D] 解压文件列表:', files)

                const glbFile = files.find(f => f.toLowerCase().endsWith('.glb'))
                if (!glbFile) {
                  reject(new Error('ZIP 中未找到 .glb 模型文件'))
                  return
                }

                console.log('[AI-3D] 找到 GLB 文件:', glbFile)
                const savedModel = self._saveModelToHistory(glbFile, 'AI 生成模型')
                if (!savedModel) {
                  reject(new Error('模型保存失败'))
                  return
                }
                resolve(savedModel.path)
              } catch (err) {
                console.error('[AI-3D] 读取解压目录失败:', err)
                reject(new Error('解压后读取文件失败'))
              }
            },
            fail: (err) => {
              console.error('[AI-3D] 解压失败:', err)
              reject(new Error('ZIP 解压失败'))
            }
          })
        },
        fail: (err) => {
          console.error('[AI-3D] 下载失败:', err)
          reject(new Error('模型文件下载失败，请重试'))
        }
        })

        downloadTask.onProgressUpdate((progress) => {
          const received = (progress.totalBytesWritten / 1048576).toFixed(1)
          const total = (progress.totalBytesExpectedToWrite / 1048576).toFixed(1)
          self.setData({
            loadingText: '正在下载模型 (' + received + 'MB/' + total + 'MB)...'
          })
        })
      }).catch(reject)
    })
  },

  _downloadModelFile(fileUrl) {
    const self = this
    return new Promise((resolve, reject) => {
      self.setData({ loadingText: '正在下载模型文件...' })

      const glbPath = self._prepareDownloadPath('seed3d_downloads', 'seed3d_' + Date.now() + '.glb')

      self._resolveDownloadURL(fileUrl).then((downloadUrl) => {
        const downloadTask = wx.downloadFile({
        url: downloadUrl,
        filePath: glbPath,
        success: (dlRes) => {
          if (dlRes.statusCode !== 200) {
            reject(new Error('下载失败，HTTP ' + dlRes.statusCode))
            return
          }

          const downloadedPath = dlRes.filePath || glbPath
          if (!self._hasFileSignature(downloadedPath, [0x67, 0x6c, 0x54, 0x46])) {
            reject(new Error('下载结果不是有效 GLB，火山引擎可能返回了文本或 JSON'))
            return
          }

          const savedModel = self._saveModelToHistory(downloadedPath, 'AI 生成模型')
          if (!savedModel) {
            reject(new Error('模型保存失败'))
            return
          }
          resolve(savedModel.path)
        },
        fail: (err) => {
          console.error('[AI-3D] 下载失败:', err)
          reject(new Error('模型文件下载失败，请重试'))
        }
        })

        downloadTask.onProgressUpdate((progress) => {
          const received = (progress.totalBytesWritten / 1048576).toFixed(1)
          const total = progress.totalBytesExpectedToWrite > 0
            ? '/' + (progress.totalBytesExpectedToWrite / 1048576).toFixed(1) + 'MB'
            : ''
          self.setData({
            loadingText: '正在下载模型 (' + received + 'MB' + total + ')...'
          })
        })
      }).catch(reject)
    })
  },

  _compressImage(src, quality) {
    return new Promise((resolve) => {
      wx.compressImage({
        src: src,
        quality: quality,
        success: (res) => resolve(res.tempFilePath),
        fail: (err) => {
          console.error('[AI-3D] 图片压缩失败:', err)
          resolve(src)
        }
      })
    })
  },

  async _submitGenerate(imageUrl) {
    const data = await this._callSeed3D('/api/generate-3d', 'POST', {
      imageUrl
    })
    if (!data.success) throw new Error(data.error || '提交失败')
    return data
  },

  async _callSeed3D(path, method, data) {
    const response = await wx.cloud.callContainer({
      config: { env: CLOUDBASE_ENV_ID },
      path,
      method,
      header: {
        'X-WX-SERVICE': SEED3D_SERVICE,
        'Content-Type': 'application/json'
      },
      data
    })
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error((response.data && response.data.error) || 'Seed3D 服务请求失败')
    }
    return response.data
  },

  async _uploadSourceImage(filePath) {
    const extensionMatch = String(filePath).match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
    const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg'
    const cloudPath = 'seed3d-inputs/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + extension
    const uploadResult = await wx.cloud.uploadFile({ cloudPath, filePath })
    this._sourceCloudFiles.push(uploadResult.fileID)

    const urlResult = await wx.cloud.getTempFileURL({ fileList: [uploadResult.fileID] })
    const fileInfo = urlResult.fileList && urlResult.fileList[0]
    if (!fileInfo || fileInfo.status !== 0 || !fileInfo.tempFileURL) {
      throw new Error((fileInfo && fileInfo.errMsg) || '获取输入图片地址失败')
    }
    return fileInfo.tempFileURL
  },

  async _cleanupSourceImages() {
    const fileList = this._sourceCloudFiles || []
    this._sourceCloudFiles = []
    if (!fileList.length) return
    try {
      await wx.cloud.deleteFile({ fileList })
    } catch (error) {
      console.warn('[AI-3D] 清理输入图片失败:', error)
    }
  },

  async _persistGeneratedFile(taskId, result) {
    const sourceUrl = result.fileUrl || result.modelUrl
    if (!sourceUrl || sourceUrl.startsWith('cloud://')) return result

    this.setData({ loadingText: '正在保存模型到云端...' })
    const response = await wx.cloud.callFunction({
      name: 'persistSeed3DFile',
      data: {
        taskId,
        sourceUrl,
        fileFormat: result.fileFormat === 'zip' || result.fileUrl ? 'zip' : 'glb'
      }
    })
    const persisted = response.result || {}
    if (!persisted.success || !persisted.fileID) {
      throw new Error(persisted.error || '模型转存失败')
    }
    return {
      fileUrl: persisted.fileID,
      fileFormat: persisted.fileFormat
    }
  },

  _resolveDownloadURL(source) {
    if (!source || !source.startsWith('cloud://')) return Promise.resolve(source)
    return wx.cloud.getTempFileURL({ fileList: [source] }).then((result) => {
      const fileInfo = result.fileList && result.fileList[0]
      if (!fileInfo || fileInfo.status !== 0 || !fileInfo.tempFileURL) {
        throw new Error((fileInfo && fileInfo.errMsg) || '获取模型下载地址失败')
      }
      return fileInfo.tempFileURL
    })
  },

  _saveModelToHistory(glbSourcePath, modelName) {
    const fs = wx.getFileSystemManager()
    const saveDir = wx.env.USER_DATA_PATH + '/saved_models'

    try { fs.accessSync(saveDir) } catch (e) { fs.mkdirSync(saveDir) }

    const timestamp = Date.now()
    const savePath = saveDir + '/model_' + timestamp + '.glb'

    try {
      fs.copyFileSync(glbSourcePath, savePath)
    } catch (err) {
      console.error('[AI-3D] 保存模型文件失败:', err)
      return null
    }

    let thumbnailPath = ''
    const thumbnailSource = this.data.imagePath
    if (thumbnailSource) {
      const extensionMatch = String(thumbnailSource).match(/\.(jpg|jpeg|png|webp)(?:\?|$)/i)
      const thumbnailExtension = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg'
      thumbnailPath = saveDir + '/model_' + timestamp + '_thumb.' + thumbnailExtension
      try {
        fs.copyFileSync(thumbnailSource, thumbnailPath)
      } catch (error) {
        console.warn('[AI-3D] 保存模型缩略图失败:', error)
        thumbnailPath = ''
      }
    }

    let history = wx.getStorageSync('modelHistory') || []
    const record = {
      id: 'model_' + timestamp,
      name: modelName,
      path: savePath,
      thumbnailPath,
      timestamp: timestamp,
      time: this._formatTime(new Date())
    }
    history.unshift(record)

    while (history.length > 5) {
      const old = history.pop()
      try { fs.unlinkSync(old.path) } catch (e) {}
      if (old.thumbnailPath) {
        try { fs.unlinkSync(old.thumbnailPath) } catch (e) {}
      }
    }

    wx.setStorageSync('modelHistory', history)
    this.setData({ modelHistory: history })
    return record
  },

  _hasFileSignature(filePath, expectedBytes) {
    const fs = wx.getFileSystemManager()
    try {
      const data = fs.readFileSync(filePath)
      const bytes = new Uint8Array(data)
      return expectedBytes.every((value, index) => bytes[index] === value)
    } catch (err) {
      console.error('[AI-3D] 校验模型文件失败:', err)
      return false
    }
  },

  _prepareDownloadPath(directoryName, fileName) {
    const fs = wx.getFileSystemManager()
    const directoryPath = wx.env.USER_DATA_PATH + '/' + directoryName
    try { fs.accessSync(directoryPath) } catch (err) { fs.mkdirSync(directoryPath) }
    const targetPath = directoryPath + '/' + fileName
    try { fs.unlinkSync(targetPath) } catch (err) {}
    return targetPath
  },

  _isZipUrl(fileUrl) {
    return fileUrl.split('?')[0].toLowerCase().endsWith('.zip')
  },

  _formatTime(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return y + '-' + m + '-' + d + ' ' + h + ':' + min
  },

  viewHistoryModel(e) {
    const index = e.currentTarget.dataset.index
    const model = this.data.modelHistory[index]
    if (!model) return

    const fs = wx.getFileSystemManager()
    try {
      fs.accessSync(model.path)
    } catch (e) {
      wx.showToast({ title: '模型文件已删除', icon: 'none' })
      let history = this.data.modelHistory
      if (model.thumbnailPath) {
        try { fs.unlinkSync(model.thumbnailPath) } catch (err) {}
      }
      history.splice(index, 1)
      wx.setStorageSync('modelHistory', history)
      this.setData({ modelHistory: history })
      return
    }

    app.globalData._pendingModelUrl = model.path
    app.globalData._pendingModelName = model.name
    wx.navigateTo({ url: '/pages/model3d-viewer/model3d-viewer' })
  },

  _removeDir(fs, dir) {
    try {
      const entries = fs.readdirSync(dir)
      for (const entry of entries) {
        const fullPath = dir + '/' + entry
        try {
          const stat = fs.statSync(fullPath)
          if (stat.isDirectory()) {
            this._removeDir(fs, fullPath)
          } else {
            fs.unlinkSync(fullPath)
          }
        } catch (e) {
          try { fs.unlinkSync(fullPath) } catch (e2) {}
        }
      }
      fs.rmdirSync(dir)
    } catch (e) {}
  },

  _listAllFiles(fs, dir) {
    let results = []
    const entries = fs.readdirSync(dir)
    for (const entry of entries) {
      const fullPath = dir + '/' + entry
      try {
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          results = results.concat(this._listAllFiles(fs, fullPath))
        } else {
          results.push(fullPath)
        }
      } catch (e) {
        results.push(fullPath)
      }
    }
    return results
  }
})
