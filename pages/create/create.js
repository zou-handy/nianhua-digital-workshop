const { buildShareAppMessage } = require('../../utils/shareConfig');
const {
  requestSplitColors,
  stylizePhotoToWoodblockNianhua,
  generateAnimeNianhuaFromPhoto,
  compressLocalImage,
  uploadSourceImageToCloud,
  readLocalFileAsDataUrl,
  saveWorkToDualStores
} = require('../../utils/nianhuaPipeline');

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
      sourceType: ['camera', 'album'],
      camera: 'front',
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        this._rawImage = tempPath;
        this._cachedSplit = null;
        this.setData({ previewImage: tempPath });
      }
    });
  },

  async animeAndAnalyze() {
    if (!this.data.previewImage || this.data.analyzing) return;
    this.setData({ analyzing: true, analyzeText: '正在识别自拍特征并生成二次元年画...' });
    try {
      const src = this._rawImage || this.data.previewImage;
      const animeRes = await generateAnimeNianhuaFromPhoto(src);
      const animeImg = animeRes.fileID || animeRes.imageUrl;
      this.setData({ previewImage: animeRes.imageUrl || animeRes.fileID, analyzeText: '正在拆解二次元年画多色雕版...' });
      const result = await requestSplitColors(animeImg, {
        photoMode: 'auto',
        removeBackground: true,
        maxColors: 'auto',
        flattenPalette: true
      });
      const saved = saveWorkToDualStores(result, {
        title: '自拍二次元年画 · ' + new Date().toLocaleDateString(),
        mode: 'flat',
        sourceFileID: animeRes.fileID || '',
        sourceImage: animeRes.imageUrl || animeImg
      });
      const plateCount = (saved && saved.advancedWork && saved.advancedWork.steps && saved.advancedWork.steps.length) || 4;
      this.setData({ analyzing: false, previewImage: '' });
      wx.showModal({
        title: `${plateCount}色二次元年画制版完成！`,
        content: `已将自拍转化为国潮二次元木版年画并拆出 ${plateCount} 块雕版，同步至展厅与卷五版台`,
        confirmText: '去展厅查看',
        cancelText: '继续自拍',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/exploded-view/exploded-view?showLatestUser=true' });
          }
        }
      });
    } catch (err) {
      console.error('[create] 二次元年画化失败:', err);
      this.setData({ analyzing: false });
      wx.showToast({ title: 'AI生成超时，请点动态分色制版', icon: 'none' });
    }
  },

  async stylizeImage() {
    if (!this.data.previewImage || this.data.analyzing) return;
    this.setData({ analyzing: true, analyzeText: '正在转木版年画风格...' });
    try {
      const src = this._rawImage || this.data.previewImage;
      const stylized = await stylizePhotoToWoodblockNianhua(src, {
        removeBackground: true,
        maxColors: 'auto'
      });
      this._cachedSplit = stylized.splitResult || null;
      this.setData({
        previewImage: stylized.imageUrl,
        analyzing: false
      });
      wx.showToast({ title: `已转为${stylized.plateCount || 4}色木版画`, icon: 'success' });
    } catch (err) {
      console.error('[create] 风格化失败:', err);
      this.setData({ analyzing: false });
      wx.showToast({ title: '风格化失败，可直接分色', icon: 'none' });
    }
  },

  async startAnalyze() {
    if (!this.data.previewImage || this.data.analyzing) return;

    this.setData({ analyzing: true, analyzeText: '正在压缩预处理...' });

    try {
      const compressedPath = await compressLocalImage(this._rawImage || this.data.previewImage, 80);

      let result = this._cachedSplit;
      if (!result) {
        this.setData({ analyzeText: '正在提取墨线与动态套版...' });
        let imageSource = '';
        try {
          imageSource = await uploadSourceImageToCloud(compressedPath, 'user-creation/source');
        } catch (uploadErr) {
          console.warn('[create] 云存储上传降级为 Base64:', uploadErr);
          imageSource = await readLocalFileAsDataUrl(compressedPath);
        }

        result = await requestSplitColors(imageSource, {
          photoMode: 'photo',
          removeBackground: true,
          maxColors: 'auto',
          flattenPalette: true
        });
      }
      this._cachedSplit = null;

      this.setData({ analyzeText: '正在装入展厅与卷五版台...' });
      const saved = saveWorkToDualStores(result, {
        title: '实拍年画 · ' + new Date().toLocaleDateString(),
        mode: 'photo',
        sourceImage: compressedPath
      });
      const plateCount = (saved && saved.advancedWork && saved.advancedWork.steps && saved.advancedWork.steps.length) || 4;

      this.setData({ analyzing: false, previewImage: '' });

      wx.showModal({
        title: `${plateCount}色木版制版完成！`,
        content: `已提取 ${plateCount} 块雕版并同步至 2D 分色展厅与卷五交互版台`,
        confirmText: '去展厅查看',
        cancelText: '继续上传',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/exploded-view/exploded-view?showLatestUser=true' });
          }
        }
      });
    } catch (err) {
      console.error('[分色] 错误:', err);
      this.setData({ analyzing: false });
      wx.showModal({
        title: '分色失败',
        content: (err && err.message) || '请重试',
        showCancel: false
      });
    }
  },

  goToExplodedView() {
    wx.navigateTo({
      url: '/pages/exploded-view/exploded-view'
    });
  }
});
