const { requestSplitColors } = require('./utils/splitColors');
const { saveLayerImage } = require('./utils/saveLayerImage');
const { buildShareAppMessage } = require('../../utils/shareConfig');

const USER_CACHE_KEY = 'userColorLayers';
const MAX_USER_RECORDS = 10;

Page({
  onShareAppMessage: buildShareAppMessage,

  data: {
    previewImage: '',
    analyzing: false,
    analyzeText: '正在分析中...'
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        this.setData({ previewImage: tempPath });
      }
    });
  },

  async startAnalyze() {
    if (!this.data.previewImage) return;

    this.setData({ analyzing: true, analyzeText: '正在压缩图片...' });

    try {
      // 压缩图片
      const compressedPath = await this._compressImage(this.data.previewImage);

      this.setData({ analyzeText: '正在上传分析...' });

      // 转 base64
      const fs = wx.getFileSystemManager();
      const base64 = wx.arrayBufferToBase64(fs.readFileSync(compressedPath));
      const dataUrl = 'data:image/jpeg;base64,' + base64;

      // 调用分色API
      this.setData({ analyzeText: '正在AI分色处理...' });
      const result = await this._requestSplitColors(dataUrl);

      if (!result.layers || result.layers.length === 0) {
        throw new Error('分色结果为空');
      }

      this.setData({ analyzeText: '正在保存结果...' });

      // 保存图层到本地文件
      const timestamp = Date.now();
      const id = 'user_' + timestamp;
      const layers = [];

      for (let i = 0; i < result.layers.length; i++) {
        const layer = result.layers[i];
        if (layer.fileID) {
          layers.push({
            tempPath: layer.fileID,
            fileID: layer.fileID,
            color: layer.color || '',
            label: layer.label || ('图层' + (i + 1))
          });
          continue;
        }

        const filePath = wx.env.USER_DATA_PATH + '/user_layer_' + id + '_' + i + '.png';
        const saved = await saveLayerImage(layer, filePath, fs);
        if (!saved) continue;

        layers.push({
          tempPath: filePath,
          color: layer.color || '',
          label: layer.label || ('图层' + (i + 1))
        });
      }

      if (layers.length === 0) throw new Error('图层保存失败');

      // 保存原图到本地（用于展厅卡片缩略图）
      const originalSavePath = wx.env.USER_DATA_PATH + '/original_' + id + '.jpg';
      try {
        fs.saveFileSync(this.data.previewImage, originalSavePath);
      } catch(e) {
        // 如果 saveFile 失败，尝试 copyFile
        try {
          fs.copyFileSync(this.data.previewImage, originalSavePath);
        } catch(e2) {
          console.error('保存原图失败:', e2);
        }
      }

      // 存入用户分色历史
      let userList = [];
      try {
        const stored = wx.getStorageSync(USER_CACHE_KEY);
        userList = Array.isArray(stored) ? stored : [];
      } catch(e) {}

      userList.unshift({
        id: id,
        title: '我的年画 · ' + new Date().toLocaleDateString(),
        isPreset: false,
        layers: layers,
        originalImage: originalSavePath,
        timestamp: timestamp
      });

      wx.setStorageSync(USER_CACHE_KEY, userList.slice(0, MAX_USER_RECORDS));

      this.setData({ analyzing: false, previewImage: '' });

      wx.showModal({
        title: '分色完成！',
        content: '已保存到2D分色展厅',
        confirmText: '去查看',
        cancelText: '继续上传',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/exploded-view/exploded-view' });
          }
        }
      });

    } catch (err) {
      console.error('[分色] 错误:', err);
      this.setData({ analyzing: false });
      wx.showModal({
        title: '分色失败',
        content: err.message || '请重试',
        showCancel: false
      });
    }
  },

  goToExplodedView() {
    wx.navigateTo({
      url: '/pages/exploded-view/exploded-view'
    });
  },

  _compressImage(src) {
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src: src,
        quality: 50,
        success: (res) => resolve(res.tempFilePath),
        fail: () => resolve(src) // 压缩失败就用原图
      });
    });
  },

  _requestSplitColors(imageBase64) {
    return requestSplitColors(imageBase64, { removeBackground: false });
  }
});
