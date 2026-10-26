const { downloadFileToTemp } = require('./utils/downloadCloudFile');
const { requestSplitColors } = require('./utils/splitColors');
const { saveLayerImage } = require('./utils/saveLayerImage');
const { buildNianhuaImagePrompt } = require('../../utils/nianhuaImagePrompt');
const { buildShareAppMessage } = require('../../utils/shareConfig');

const USER_CACHE_KEY = 'userColorLayers';
const MAX_USER_RECORDS = 10;

Page({
  onShareAppMessage: buildShareAppMessage,

  data: {
    inputText: '',
    generatedImageUrl: '',
    generatedImageFileID: '',
    loading: false,
    splitLoading: false
  },

  onInput(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  onGenerate() {
    const inputText = this.data.inputText.trim();
    if (!inputText) {
      wx.showToast({
        title: '请输入创作主题',
        icon: 'none'
      });
      return;
    }

    if (this.data.loading) return;

    const promptConfig = buildNianhuaImagePrompt(inputText);

    this.setData({
      loading: true,
      generatedImageUrl: '',
      generatedImageFileID: ''
    });

    wx.cloud.callFunction({
      name: 'generateImage-PBKj5J',
      data: {
        prompt: promptConfig.prompt,
        negative_prompt: promptConfig.negativePrompt,
        model: 'hunyuan-image',
        version: 'v1.9',
        size: '1024x1024',
        n: 1,
        revise: false
      },
      success: (res) => {
        const result = res.result || {};
        if (result.success && (result.fileID || result.imageUrl)) {
          this.setData({
            generatedImageUrl: result.imageUrl || result.fileID,
            generatedImageFileID: result.fileID || '',
            loading: false
          });
          return;
        }

        console.error('生图云函数返回异常:', result);
        wx.showToast({
          title: '生成失败，请重试',
          icon: 'none'
        });
        this.setData({ loading: false });
      },
      fail: (err) => {
        console.error('云函数调用失败:', err);
        wx.showToast({
          title: '调用失败，请重试',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },

  onRegenerate() {
    if (this.data.loading || this.data.splitLoading) return;
    this.setData({ generatedImageUrl: '' });
    this.onGenerate();
  },

  async onSplitColors() {
    if (!this.data.generatedImageUrl || this.data.splitLoading) return;

    this.setData({ splitLoading: true });

    try {
      const splitSource = await this._getSplitSource();
      const splitResult = await this._requestSplitColors(splitSource);
      const record = await this._saveSplitLayers(splitResult.layers || []);

      if (!record) {
        throw new Error('分色结果为空');
      }

      this._saveUserGallery(record);
      wx.showToast({
        title: '分色完成',
        icon: 'success'
      });
      wx.navigateTo({
        url: '/pages/exploded-view/exploded-view?showLatestUser=true'
      });
    } catch (err) {
      console.error('生成分色展示失败:', err);
      wx.showToast({
        title: '分色失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ splitLoading: false });
    }
  },

  async _getSplitSource() {
    if (this.data.generatedImageFileID) {
      return this.data.generatedImageFileID;
    }

    const localImagePath = await this._downloadGeneratedImage(this.data.generatedImageUrl);
    return this._readFileAsDataUrl(localImagePath);
  },

  _downloadGeneratedImage(imageUrl) {
    return downloadFileToTemp(imageUrl);
  },

  _readFileAsDataUrl(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success: (res) => {
          resolve('data:image/png;base64,' + res.data);
        },
        fail: reject
      });
    });
  },

  _requestSplitColors(imageBase64) {
    return requestSplitColors(imageBase64);
  },

  async _saveSplitLayers(layers) {
    if (!Array.isArray(layers) || layers.length === 0) return null;

    const fs = wx.getFileSystemManager();
    const timestamp = Date.now();
    const id = 'user_' + timestamp;
    const savedLayers = [];

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (layer.fileID) {
        savedLayers.push({
          tempPath: layer.fileID,
          fileID: layer.fileID,
          color: layer.color || '',
          label: layer.label || ('图层' + (i + 1))
        });
        continue;
      }

      const tempPath = `${wx.env.USER_DATA_PATH}/user_layer_${id}_${i}.png`;
      const saved = await saveLayerImage(layer, tempPath, fs);
      if (!saved) continue;

      savedLayers.push({
        tempPath,
        color: layer.color || '',
        label: layer.label || ('图层' + (i + 1))
      });
    }

    if (savedLayers.length === 0) return null;

    return {
      id,
      title: this.data.inputText.trim() || 'AI年画作品',
      isPreset: false,
      layers: savedLayers,
      timestamp
    };
  },

  _saveUserGallery(record) {
    const currentList = wx.getStorageSync(USER_CACHE_KEY);
    const list = Array.isArray(currentList) ? currentList : [];
    const nextList = [record, ...list.filter((item) => item && item.id !== record.id)].slice(0, MAX_USER_RECORDS);
    wx.setStorageSync(USER_CACHE_KEY, nextList);
  }
});
