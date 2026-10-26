const USER_CACHE_KEY = 'userColorLayers';
const PRESET_CACHE_KEY = 'presetColorLayersCloudV2';
const { layerFileID, ADVANCED_PRINT_IMAGES, ADVANCED_PRINT_SETS } = require('../../constants/cloudAssets');
const { requestSplitColors } = require('./utils/splitColors');
const { saveLayerImage } = require('./utils/saveLayerImage');
const { downloadFileToTemp } = require('./utils/downloadCloudFile');
const { buildShareAppMessage } = require('../../utils/shareConfig');

const MAX_USER_RECORDS = 10;

const PRESET_GALLERIES = [
  {
    id: 'advanced-print',
    title: '卷五作品一 · 四色成画',
    isPreset: true,
    layerCount: 4,
    layerFileIDs: [
      ADVANCED_PRINT_IMAGES.backendLayer3,
      ADVANCED_PRINT_IMAGES.backendLayer0,
      ADVANCED_PRINT_IMAGES.backendLayer1,
      ADVANCED_PRINT_IMAGES.backendLayer2
    ],
    layerMeta: [
      { color: '#1A1A1A', label: '墨线版' },
      { color: '#D42F2F', label: '万年红' },
      { color: '#F2C94C', label: '石黄版' },
      { color: '#5396AC', label: '青绿版' }
    ]
  },
  {
    id: 'advanced-print-set-2',
    title: '卷五作品二 · 四色成画',
    isPreset: true,
    layerCount: 4,
    layerFileIDs: [
      ADVANCED_PRINT_SETS[1].layers.black,
      ADVANCED_PRINT_SETS[1].layers.red,
      ADVANCED_PRINT_SETS[1].layers.yellow,
      ADVANCED_PRINT_SETS[1].layers.green
    ],
    layerMeta: [
      { color: '#1A1A1A', label: '墨线版' },
      { color: '#D42F2F', label: '万年红' },
      { color: '#F2C94C', label: '石黄版' },
      { color: '#5396AC', label: '青绿版' }
    ]
  },
  {
    id: 'nianhua-demo',
    title: '佛山木版年画示例',
    isPreset: true,
    cloudPrefix: 'nianhua-demo',
    layerCount: 5
  },
  {
    id: 'longtou',
    title: '龙头年画',
    isPreset: true,
    cloudPrefix: 'longtou',
    layerCount: 5
  }
];

const PRESET_LAYER_META = [
  { color: '#1a1a1a', label: '墨线稿' },
  { color: '#cc2936', label: '大红' },
  { color: '#2d6a4f', label: '翠绿' },
  { color: '#e6a817', label: '橙黄' },
  { color: '#e8b4a2', label: '肉粉' }
];

const DEFAULT_ROTATE_X = 55;
const DEFAULT_ROTATE_Z = -30;
const DEFAULT_SCALE = 1;

function getPreciseLayerLabel(color, fallback) {
  const match = String(color || '').match(/^#?([0-9a-f]{6})$/i);
  if (!match) return fallback || '未命名色版';
  const hex = match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const [h, s, l] = rgbToHslForLabel(r, g, b);

  if (s < 0.14) {
    if (l < 0.2) return '墨黑色版';
    if (l < 0.42) return '深灰色版';
    if (l < 0.72) return '中灰色版';
    return '浅灰色版';
  }
  if (h < 15 || h >= 345) {
    if (l >= 0.7) return '粉红色版';
    if (l < 0.36) return '深红色版';
    return s >= 0.62 ? '朱红色版' : '暗红色版';
  }
  if (h < 45) return l < 0.38 ? '棕红色版' : '橙红色版';
  if (h < 75) return l >= 0.7 ? '浅黄色版' : (l < 0.38 ? '深黄色版' : '金黄色版');
  if (h < 105) return '黄绿色版';
  if (h < 165) return l < 0.36 ? '深绿色版' : '翠绿色版';
  if (h < 205) return l < 0.36 ? '深青色版' : '青绿色版';
  if (h < 245) return l < 0.36 ? '深蓝色版' : '青蓝色版';
  if (h < 285) return '蓝紫色版';
  if (h < 330) return l >= 0.68 ? '粉紫色版' : '紫红色版';
  return '玫红色版';
}

function rgbToHslForLabel(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / delta + 2) * 60;
    else h = ((r - g) / delta + 4) * 60;
  }
  return [h, s, l];
}

Page({
  onShareAppMessage: buildShareAppMessage,

  data: {
    loading: false,
    loadingText: '正在加载分色展厅',
    loadingProgress: '',

    // 视图状态
    isExploded: false,
    scale: DEFAULT_SCALE,
    rotateX: DEFAULT_ROTATE_X,
    rotateZ: DEFAULT_ROTATE_Z,
    isAdvancedPreset: false,
    displayMode: 'axis',

    // 图层可见性：索引 -> true/false
    layerVisibility: {},
    // 所有图层数组
    layers: [],

    // 作品列表
    colorLayersList: [],
    currentIndex: 0,
    slideDirection: '',

    // 底栏控制面板
    panelExpanded: false,
    // 高亮选中的图层（手指悬停预览）
    highlightedLayer: -1
  },

  async onLoad(options = {}) {
    this._resetTouchState();
    this._clearOldCache();

    this._isSwitching = false;
    this._doubleTapTimer = null;
    this._lastStageTapAt = 0;
    this._printSequenceTimer = null;
    this._longPressActive = false;
    this._suppressNextStageTap = false;

    const isAdvancedPreset = String(options.preset || '').indexOf('advanced-print') === 0;
    this.setData({
      loading: true,
      loadingText: isAdvancedPreset ? '正在展开四色成画' : '正在加载分色展厅',
      loadingProgress: '正在准备分色图层',
      isAdvancedPreset,
      rotateX: isAdvancedPreset ? 0 : DEFAULT_ROTATE_X,
      rotateZ: isAdvancedPreset ? 0 : DEFAULT_ROTATE_Z,
      scale: DEFAULT_SCALE
    });

    try {
      const presetGalleries = await this._getPresetGalleries(options.preset);
      const userGalleries = options.preset
        ? []
        : await this._localizeGalleries(this._getValidUserGalleries());
      const colorLayersList = [...presetGalleries, ...userGalleries];
      const requestedPresetIndex = presetGalleries.findIndex((item) => item.id === options.preset);
      const shouldShowLatestUser = options.showLatestUser === 'true' && userGalleries.length > 0;
      const currentIndex = requestedPresetIndex >= 0
        ? requestedPresetIndex
        : (shouldShowLatestUser ? presetGalleries.length : 0);

      this.setData({
        colorLayersList,
        currentIndex,
        loading: false,
        loadingProgress: ''
      }, () => {
        if (colorLayersList.length > 0) {
          this.applyCurrentLayers();
          this._startGuideTimer = setTimeout(() => {
            const aiFloat = this.selectComponent('#aiFloat');
            if (!aiFloat) return;
            aiFloat.setPageContext({ chapter: '2D分色展厅' });
            aiFloat.startTwoDInteractionGuide();
          }, 500);
        }
      });
    } catch (err) {
      console.error('[分色展厅] 加载失败:', err);
      this.setData({ loading: false, loadingProgress: '' });
      wx.showToast({ title: '图层加载失败，请重试', icon: 'none' });
    }
  },

  onUnload() {
    clearTimeout(this._startGuideTimer);
    this._clearInteractionTimers();
  },

  // ── 导航 ──

  goBack() {
    wx.navigateBack();
  },

  // ── 顶部操作 ──

  /** 点击舞台炸开/复原（有拖拽则不触发） */
  toggleExplode() {
    if (this._touchMoved) return;

    const isExploded = !this.data.isExploded;
    this.setData({ isExploded }, () => {
      this.updateLayerStyles();
    });

    wx.vibrateShort({ type: 'light' });
  },

  /** 单击展开/重合，双击切换轴向与扇形布局。 */
  onStageTap() {
    if (this._suppressNextStageTap) {
      this._suppressNextStageTap = false;
      return;
    }
    if (this._touchMoved) return;
    const now = Date.now();
    if (now - this._lastStageTapAt < 280) {
      clearTimeout(this._doubleTapTimer);
      this._doubleTapTimer = null;
      this._lastStageTapAt = 0;
      this.toggleLayoutMode();
      return;
    }

    this._lastStageTapAt = now;
    this._doubleTapTimer = setTimeout(() => {
      this._doubleTapTimer = null;
      this.toggleExplode();
    }, 280);
  },

  toggleLayoutMode() {
    const displayMode = this.data.displayMode === 'fan' ? 'axis' : 'fan';
    this.setData({
      displayMode,
      isExploded: true
    }, () => this.updateLayerStyles());
    wx.vibrateShort({ type: 'medium' });
  },

  onStageLongPress() {
    if (!this.data.layers.length) return;
    this._longPressActive = true;
    this._suppressNextStageTap = true;
    this._touchMoved = true;
    this._startPrintSequence();
    wx.vibrateShort({ type: 'medium' });
  },

  /** 重置视角 */
  resetView() {
    this.setData({
      rotateX: this.data.isAdvancedPreset ? 0 : DEFAULT_ROTATE_X,
      rotateZ: this.data.isAdvancedPreset ? 0 : DEFAULT_ROTATE_Z,
      scale: DEFAULT_SCALE
    });
    wx.vibrateShort({ type: 'light' });
  },

  // ── 作品切换 ──

  prevItem() {
    if (this.data.currentIndex <= 0) return;
    this._switchItem(this.data.currentIndex - 1, 'right');
  },

  nextItem() {
    if (this.data.currentIndex >= this.data.colorLayersList.length - 1) return;
    this._switchItem(this.data.currentIndex + 1, 'left');
  },

  applyCurrentLayers() {
    const current = this.data.colorLayersList[this.data.currentIndex];
    if (!current || !Array.isArray(current.layers)) return;
    if (current.layers.length === 0) return;

    // 初始化所有图层可见
    const visibility = {};
    current.layers.forEach((_, index) => {
      visibility[index] = true;
    });

    this.setData({
      layers: current.layers,
      layerVisibility: visibility
    }, () => {
      this.updateLayerStyles();
    });
  },

  updateLayerStyles() {
    const { layers, isExploded, layerVisibility, displayMode } = this.data;
    this.setData({
      layers: layers.map((layer, index) => ({
        ...layer,
        visible: layerVisibility[index] !== false,
        layerStyle: this._getLayerStyle(index, isExploded, displayMode)
      }))
    });
  },

  // ── 图层可见性控制 ──

  /** 切换单个图层可见性 */
  toggleLayerVisibility(e) {
    const index = e.currentTarget.dataset.index;
    const currentVisibility = { ...this.data.layerVisibility };
    const newState = currentVisibility[index] === false ? true : false;
    currentVisibility[index] = newState;

    this.setData({ layerVisibility: currentVisibility }, () => {
      this.updateLayerStyles();
    });

    const layer = this.data.layers[index];
    const label = (layer && layer.label) ? layer.label : ('图层' + (index + 1));
    wx.vibrateShort({ type: 'light' });
    wx.showToast({
      title: newState ? (label + ' 已显示') : (label + ' 已隐藏'),
      icon: 'none',
      duration: 800
    });
  },

  /** 全部显示 */
  showAllLayers() {
    const visibility = {};
    this.data.layers.forEach((_, index) => {
      visibility[index] = true;
    });
    this.setData({ layerVisibility: visibility }, () => {
      this.updateLayerStyles();
    });
    wx.vibrateShort({ type: 'light' });
  },

  /** 全部隐藏（只留下第一层） */
  hideAllLayers() {
    const visibility = {};
    this.data.layers.forEach((_, index) => {
      visibility[index] = index === 0;
    });
    this.setData({ layerVisibility: visibility }, () => {
      this.updateLayerStyles();
    });
    wx.vibrateShort({ type: 'light' });
  },

  /** 长按图层高亮预览 */
  onLayerLongPress(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ highlightedLayer: index });
    wx.vibrateShort({ type: 'medium' });
  },

  /** 松开取消高亮 */
  onLayerTouchEnd() {
    this.setData({ highlightedLayer: -1 });
  },

  // ── 手势交互 ──

  onTouchStart(e) {
    const touches = e.touches || [];

    if (touches.length === 2) {
      this._touchMoved = true;
      this._initialPinchDistance = this._getTouchDistance(touches[0], touches[1]);
      this._initialScale = this.data.scale;
      return;
    }

    if (touches.length === 1) {
      this._touchMoved = false;
      this._touchStartX = touches[0].clientX;
      this._touchStartY = touches[0].clientY;
      this._lastTouchX = touches[0].clientX;
      this._lastTouchY = touches[0].clientY;
    }
  },

  onTouchMove(e) {
    const touches = e.touches || [];

    if (touches.length === 2) {
      const currentDistance = this._getTouchDistance(touches[0], touches[1]);
      if (this._initialPinchDistance <= 0) {
        this._initialPinchDistance = currentDistance;
        this._initialScale = this.data.scale;
        return;
      }

      const scale = this._clamp(
        this._initialScale * (currentDistance / this._initialPinchDistance),
        0.5, 3
      );
      this._touchMoved = true;
      this.setData({ scale });
      return;
    }

    if (touches.length === 1) {
      const currentX = touches[0].clientX;
      const currentY = touches[0].clientY;
      const totalDx = currentX - this._touchStartX;
      const totalDy = currentY - this._touchStartY;

      if (Math.sqrt(totalDx * totalDx + totalDy * totalDy) >= 10) {
        this._touchMoved = true;
      }

      const dx = currentX - this._lastTouchX;
      const dy = currentY - this._lastTouchY;
      const rotateX = this._clamp(this.data.rotateX + dy * 0.3, 0, 90);
      const rotateZ = this.data.rotateZ + dx * 0.3;

      this._lastTouchX = currentX;
      this._lastTouchY = currentY;
      this.setData({ rotateX, rotateZ });
    }
  },

  onTouchEnd() {
    if (this._longPressActive) {
      this._longPressActive = false;
      this._stopPrintSequence();
    }
    this._initialPinchDistance = 0;
    this._initialScale = this.data.scale;
  },

  // ── 图库管理 ──

  async addImageToGallery(localImagePath, id, title) {
    const currentList = wx.getStorageSync(USER_CACHE_KEY) || [];
    if (
      Array.isArray(currentList) &&
      currentList.find(
        (item) => item.id === id && this._areLayerFilesValid(item.layers)
      )
    ) {
      return false;
    }

    const fs = wx.getFileSystemManager();
    const base64 = wx.arrayBufferToBase64(fs.readFileSync(localImagePath));
    const dataUrl = 'data:image/jpeg;base64,' + base64;
    const response = await this._requestSplitColors(dataUrl);
    if (!response.layers || response.layers.length === 0) return false;

    const layers = [];
    for (let i = 0; i < response.layers.length; i++) {
      const layer = response.layers[i];
      if (layer.fileID) {
        layers.push({
          tempPath: layer.fileID,
          fileID: layer.fileID,
          color: layer.color || '',
          label: layer.label || ('图层' + (i + 1))
        });
        continue;
      }

      const filePath = `${wx.env.USER_DATA_PATH}/user_layer_${id}_${i}.png`;
      const saved = await saveLayerImage(layer, filePath, fs);
      if (!saved) continue;
      layers.push({
        tempPath: filePath,
        color: layer.color || '',
        label: layer.label || ('图层' + (i + 1))
      });
    }
    if (layers.length === 0) return false;

    const nextList = (
      Array.isArray(wx.getStorageSync(USER_CACHE_KEY))
        ? wx.getStorageSync(USER_CACHE_KEY)
        : []
    ).filter((item) => item.id !== id);
    nextList.unshift({
      id,
      title,
      isPreset: false,
      layers,
      timestamp: Date.now()
    });
    wx.setStorageSync(USER_CACHE_KEY, nextList.slice(0, MAX_USER_RECORDS));
    return true;
  },

  // ── 内部方法 ──

  _clearOldCache() {
    try {
      const oldCache = wx.getStorageSync(PRESET_CACHE_KEY);
      if (oldCache && typeof oldCache !== 'object') {
        wx.removeStorageSync(PRESET_CACHE_KEY);
      }
    } catch (err) {
      wx.removeStorageSync(PRESET_CACHE_KEY);
    }
  },

  async _getPresetGalleries(requestedPreset) {
    const cache = wx.getStorageSync(PRESET_CACHE_KEY) || {};
    const nextCache = { ...cache };
    const galleries = [];

    const galleriesToLoad = requestedPreset
      ? PRESET_GALLERIES.filter((gallery) => gallery.id === requestedPreset)
      : PRESET_GALLERIES;

    for (const gallery of galleriesToLoad) {
      try {
        this.setData({ loadingProgress: '正在准备分色图层' });
        const layers = await this._downloadPresetLayers(gallery);
        if (layers.length === gallery.layerCount) {
          nextCache[gallery.id] = {
            id: gallery.id,
            title: gallery.title,
            isPreset: true,
            layers,
            timestamp: Date.now()
          };
          galleries.push({
            id: gallery.id,
            title: gallery.title,
            isPreset: true,
            layers
          });
        }
      } catch (err) {
        console.error('[分色展厅] 预置图处理失败:', gallery.id, err);
      }
    }

    try {
      wx.setStorageSync(PRESET_CACHE_KEY, nextCache);
    } catch (err) {
      console.error('[分色展厅] 缓存保存失败:', err);
    }
    return galleries;
  },

  _getCachedPresetLayers(gallery, cachedGallery) {
    if (!cachedGallery || !Array.isArray(cachedGallery.layers)) {
      const expectedLayers = this._buildPresetLayersFromCloudPaths(gallery);
      if (this._areLayerFilesValid(expectedLayers)) return expectedLayers;
      return [];
    }

    const storedLayers = cachedGallery.layers;
    if (
      storedLayers.length === gallery.layerCount &&
      this._areLayerFilesValid(storedLayers)
    ) {
      return storedLayers.map((layer, index) => ({
        tempPath: layer.fileID || layer.tempPath,
        fileID: layer.fileID || (this._isCloudFilePath(layer.tempPath) ? layer.tempPath : ''),
        color: layer.color || (PRESET_LAYER_META[index] ? PRESET_LAYER_META[index].color : ''),
        label: layer.label || (PRESET_LAYER_META[index] ? PRESET_LAYER_META[index].label : '图层' + (index + 1))
      }));
    }

    const expectedLayers = this._buildPresetLayersFromCloudPaths(gallery);
    if (this._areLayerFilesValid(expectedLayers)) return expectedLayers;
    return [];
  },

  _buildPresetLayersFromCloudPaths(gallery) {
    const meta = gallery.layerMeta || PRESET_LAYER_META;
    return Array.from({ length: gallery.layerCount }, (_, index) => ({
      tempPath: gallery.layerFileIDs ? gallery.layerFileIDs[index] : layerFileID(gallery.cloudPrefix, index),
      fileID: gallery.layerFileIDs ? gallery.layerFileIDs[index] : layerFileID(gallery.cloudPrefix, index),
      color: meta[index].color,
      label: meta[index].label
    }));
  },

  async _downloadPresetLayers(gallery) {
    const layers = this._buildPresetLayersFromCloudPaths(gallery);
    return Promise.all(layers.map(async (layer) => ({
      ...layer,
      tempPath: await downloadFileToTemp(layer.fileID)
    })));
  },

  async _localizeGalleries(galleries) {
    const localized = [];
    for (const gallery of galleries) {
      try {
        const layers = await Promise.all(gallery.layers.map(async (layer) => {
          const source = layer.fileID || layer.tempPath;
          if (this._isCloudFilePath(source) || /^https?:\/\//i.test(source)) {
            return {
              ...layer,
              tempPath: await downloadFileToTemp(source)
            };
          }
          return layer;
        }));
        localized.push({ ...gallery, layers });
      } catch (error) {
        console.error('[分色展厅] 用户图层本地化失败:', gallery.id, error);
      }
    }
    return localized;
  },

  _getValidUserGalleries() {
    let storedList = [];
    try {
      const cache = wx.getStorageSync(USER_CACHE_KEY);
      storedList = Array.isArray(cache) ? cache : [];
    } catch (err) {
      return [];
    }
    if (storedList.length === 0) return [];

    const validList = storedList
      .filter((record) => {
        return (
          record &&
          Array.isArray(record.layers) &&
          record.layers.length > 0 &&
          this._areLayerFilesValid(record.layers)
        );
      })
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, MAX_USER_RECORDS)
      .map((record) => ({
        id: record.id,
        title: record.title,
        isPreset: false,
        layers: record.layers.map((layer) => ({
          tempPath: layer.fileID || layer.tempPath,
          fileID: layer.fileID || (this._isCloudFilePath(layer.tempPath) ? layer.tempPath : ''),
          color: layer.color,
          label: getPreciseLayerLabel(layer.color, layer.label)
        })),
        timestamp: record.timestamp
      }));

    if (validList.length > 0) {
      try {
        wx.setStorageSync(USER_CACHE_KEY, validList);
      } catch (err) { /* 忽略 */ }
    } else {
      wx.removeStorageSync(USER_CACHE_KEY);
    }
    return validList;
  },

  _areLayerFilesValid(layers) {
    if (!Array.isArray(layers) || layers.length === 0) return false;
    const fs = wx.getFileSystemManager();
    try {
      layers.forEach((layer) => {
        const src = layer.fileID || layer.tempPath;
        if (!src) {
          throw new Error('empty layer source');
        }
        if (this._isCloudFilePath(src)) {
          return;
        }
        fs.accessSync(src);
      });
      return true;
    } catch (err) {
      return false;
    }
  },

  _isCloudFilePath(src) {
    return typeof src === 'string' && src.indexOf('cloud://') === 0;
  },

  _switchItem(newIndex, direction) {
    if (this._isSwitching) return;
    this._stopPrintSequence();
    this._isSwitching = true;

    const outClass = direction === 'left' ? 'slide-out-left' : 'slide-out-right';
    const inClass = direction === 'left' ? 'slide-in-right' : 'slide-in-left';
    this.setData({ slideDirection: outClass });

    setTimeout(() => {
      this.setData({
        currentIndex: newIndex,
        rotateX: DEFAULT_ROTATE_X,
        rotateZ: DEFAULT_ROTATE_Z,
        scale: DEFAULT_SCALE,
        isExploded: false,
        displayMode: 'axis',
        slideDirection: inClass
      }, () => {
        this.applyCurrentLayers();
        setTimeout(() => {
          this.setData({ slideDirection: '' });
          this._isSwitching = false;
        }, 200);
      });
    }, 200);
  },

  _requestSplitColors(imageBase64) {
    return requestSplitColors(imageBase64);
  },

  _getLayerStyle(index, isExploded, displayMode) {
    if (!isExploded) {
      return 'transform: translateZ(0px) translateY(0px); z-index: ' + (10 - index) + ';';
    }

    const totalLayers = this.data.layers.length || 1;
    const center = (totalLayers - 1) / 2;
    const centeredIndex = index - center;

    if (displayMode === 'fan') {
      const xOffset = centeredIndex * Math.min(120, 390 / Math.max(totalLayers - 1, 1));
      const yOffset = Math.abs(centeredIndex) * 18;
      const rotation = centeredIndex * 7;
      const transform = 'translateX(' + Math.round(xOffset) + 'px) translateY(' + Math.round(yOffset) + 'px) rotateZ(' + rotation.toFixed(1) + 'deg) translateZ(' + (index * 3) + 'px)';
      return 'transform: ' + transform + '; z-index: ' + (20 + index) + ';';
    }

    const maxZ = 200;
    const maxY = 80;

    let zOffset, yOffset;
    if (totalLayers === 1) {
      zOffset = 0;
      yOffset = 0;
    } else {
      const ratio = index / (totalLayers - 1);
      zOffset = maxZ - ratio * maxZ * 2;
      yOffset = -maxY + ratio * maxY * 2;
    }

    const transform = 'translateZ(' + Math.round(zOffset) + 'px) translateY(' + Math.round(yOffset) + 'px)';
    return 'transform: ' + transform + '; z-index: ' + (10 - index) + ';';
  },

  _startPrintSequence() {
    this._stopPrintSequence();
    const visibility = {};
    this.data.layers.forEach((_, index) => { visibility[index] = false; });
    this.setData({ layerVisibility: visibility }, () => this.updateLayerStyles());

    let index = 0;
    const advance = () => {
      if (!this._longPressActive || !this.data.layers.length) return;
      const nextVisibility = { ...this.data.layerVisibility };
      if (index >= this.data.layers.length) {
        this.data.layers.forEach((_, layerIndex) => { nextVisibility[layerIndex] = false; });
        index = 0;
        this.setData({ layerVisibility: nextVisibility }, () => this.updateLayerStyles());
        return;
      }
      nextVisibility[index] = true;
      this.setData({ layerVisibility: nextVisibility }, () => this.updateLayerStyles());
      index++;
    };
    this._printSequenceTimer = setInterval(advance, 560);
  },

  _stopPrintSequence() {
    if (!this._printSequenceTimer) return;
    clearInterval(this._printSequenceTimer);
    this._printSequenceTimer = null;
  },

  _clearInteractionTimers() {
    this._longPressActive = false;
    this._stopPrintSequence();
    if (this._doubleTapTimer) {
      clearTimeout(this._doubleTapTimer);
      this._doubleTapTimer = null;
    }
  },

  _getTouchDistance(touchA, touchB) {
    const dx = touchA.clientX - touchB.clientX;
    const dy = touchA.clientY - touchB.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  },

  _clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  _resetTouchState() {
    this._initialPinchDistance = 0;
    this._initialScale = 1;
    this._lastTouchX = 0;
    this._lastTouchY = 0;
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchMoved = false;
  }
});
