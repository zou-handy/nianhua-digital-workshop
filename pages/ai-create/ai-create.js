const { downloadFileToTemp } = require('./utils/downloadCloudFile');
const { buildNianhuaImagePrompt } = require('../../utils/nianhuaImagePrompt');
const { buildShareAppMessage } = require('../../utils/shareConfig');
const {
  requestSplitColors,
  readLocalFileAsDataUrl,
  requestNianhuaImageGeneration,
  saveWorkToDualStores
} = require('../../utils/nianhuaPipeline');

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

  async onGenerate() {
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

    try {
      const result = await requestNianhuaImageGeneration({
        prompt: promptConfig.prompt,
        negativePrompt: promptConfig.negativePrompt
      });
      this.setData({
        generatedImageUrl: result.imageUrl || result.fileID,
        generatedImageFileID: result.fileID || '',
        loading: false
      });
    } catch (err) {
      console.error('[ai-create] 生图失败:', err);
      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
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
      const splitResult = await requestSplitColors(splitSource, {
        photoMode: 'auto',
        removeBackground: true,
        maxColors: 'auto',
        flattenPalette: true
      });

      saveWorkToDualStores(splitResult, {
        title: this.data.inputText.trim() || 'AI年画作品',
        mode: 'flat',
        sourceFileID: this.data.generatedImageFileID,
        sourceImage: this.data.generatedImageUrl
      });

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
        title: (err && err.message) || '分色失败，请重试',
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

    const localImagePath = await downloadFileToTemp(this.data.generatedImageUrl);
    return readLocalFileAsDataUrl(localImagePath);
  }
});
