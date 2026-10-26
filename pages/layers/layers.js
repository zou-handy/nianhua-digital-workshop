const { layerFileID } = require('../../constants/cloudAssets');
const { downloadCloudFile } = require('./utils/downloadCloudFile');
const { buildShareAppMessage } = require('../../utils/shareConfig');

const PRESET_LAYER_META = [
  { color: '#1a1a1a', label: '墨线稿', order: 1, desc: '松烟墨·定轮廓' },
  { color: '#cc2936', label: '大红', order: 2, desc: '红丹色·铺喜气' },
  { color: '#2d6a4f', label: '翠绿', order: 3, desc: '石绿·添生气' },
  { color: '#e6a817', label: '橙黄', order: 4, desc: '石黄·提光泽' },
  { color: '#e8b4a2', label: '肉粉', order: 5, desc: '肉粉·补气韵' }
];

const GALLERY_ID = 'nianhua-demo';

Page({
  onShareAppMessage: buildShareAppMessage,

  data: {
    loading: true,
    layers: [],
    // 图层可见性
    layerVisibility: {},
    // 预览模式：堆叠 / 并排
    previewMode: 'stack',
    previewModeIcon: '⊞',
    previewModeLabel: '堆叠',
    // 拖动重排序
    draggingIndex: -1,
    dragTranslateY: 0,
    // 是否显示帮助提示
    showHelp: false,
    // 当前调整透明度
    editingOpacity: false,
    opacityValues: {}
  },

  async onLoad() {
    await this.loadDemoLayers();
  },

  async loadDemoLayers() {
    this.setData({ loading: true });

    const layers = [];
    const cloudPrefix = GALLERY_ID;
    const totalLayers = PRESET_LAYER_META.length;

    for (let i = 0; i < totalLayers; i++) {
      try {
        const fileID = layerFileID(cloudPrefix, i);
        const tempPath = await downloadCloudFile(fileID);
        const fs = wx.getFileSystemManager();
        const savePath = `${wx.env.USER_DATA_PATH}/layer_manage_${cloudPrefix}_${i}.png`;
        try { fs.unlinkSync(savePath); } catch (err) {}
        fs.saveFileSync(tempPath, savePath);

        layers.push({
          index: i,
          tempPath: savePath,
          color: PRESET_LAYER_META[i].color,
          label: PRESET_LAYER_META[i].label,
          order: PRESET_LAYER_META[i].order,
          desc: PRESET_LAYER_META[i].desc,
          opacity: 1
        });
      } catch (err) {
        console.error('[图层管理] 加载失败:', i, err);
      }
    }

    const visibility = {};
    const opacities = {};
    layers.forEach((layer) => {
      visibility[layer.index] = true;
      opacities[layer.index] = 1;
    });

    this.setData({
      layers: this.decorateLayers(layers, visibility, opacities),
      layerVisibility: visibility,
      opacityValues: opacities,
      loading: false
    });
  },

  decorateLayers(layers, visibility, opacities, draggingIndex, dragTranslateY) {
    const activeDraggingIndex = draggingIndex === undefined ? this.data.draggingIndex : draggingIndex;
    const activeDragTranslateY = dragTranslateY === undefined ? this.data.dragTranslateY : dragTranslateY;
    const lastIndex = layers.length - 1;

    return layers.map((layer, position) => {
      const visible = visibility[layer.index] !== false;
      const opacity = opacities[layer.index] === undefined ? 1 : opacities[layer.index];
      const dragging = activeDraggingIndex === layer.index;

      return Object.assign({}, layer, {
        visible,
        opacity,
        opacityPercent: Math.round(opacity * 100),
        hiddenClass: visible ? '' : 'cell-dimmed',
        hiddenItemClass: visible ? '' : 'item-hidden',
        thumbClass: visible ? '' : 'thumb-off',
        draggingClass: dragging ? 'item-dragging' : '',
        dragStyle: dragging ? ('transform: translateY(' + activeDragTranslateY + 'px); z-index: 100;') : '',
        upDisabledClass: position === 0 ? 'disabled' : '',
        downDisabledClass: position === lastIndex ? 'disabled' : ''
      });
    });
  },

  refreshLayerView(nextData = {}) {
    const layers = nextData.layers || this.data.layers;
    const layerVisibility = nextData.layerVisibility || this.data.layerVisibility;
    const opacityValues = nextData.opacityValues || this.data.opacityValues;
    const draggingIndex = nextData.draggingIndex === undefined ? this.data.draggingIndex : nextData.draggingIndex;
    const dragTranslateY = nextData.dragTranslateY === undefined ? this.data.dragTranslateY : nextData.dragTranslateY;

    this.setData(Object.assign({}, nextData, {
      layers: this.decorateLayers(layers, layerVisibility, opacityValues, draggingIndex, dragTranslateY)
    }));
  },

  // ── 可见性切换 ──

  toggleLayer(e) {
    const index = e.currentTarget.dataset.index;
    const current = { ...this.data.layerVisibility };
    current[index] = !current[index];

    this.refreshLayerView({ layerVisibility: current });
    wx.vibrateShort({ type: 'light' });

    const layer = this.data.layers.find(l => l.index === index);
    const label = layer ? layer.label : ('图层' + (index + 1));
    wx.showToast({
      title: current[index] ? (label + ' 已开启') : (label + ' 已关闭'),
      icon: 'none',
      duration: 800
    });
  },

  // ── 全部显示/隐藏 ──

  showAll() {
    const visibility = {};
    this.data.layers.forEach(l => { visibility[l.index] = true; });
    this.refreshLayerView({ layerVisibility: visibility });
    wx.vibrateShort({ type: 'light' });
  },

  hideAll() {
    const visibility = {};
    this.data.layers.forEach((l, i) => { visibility[l.index] = i === 0; });
    this.refreshLayerView({ layerVisibility: visibility });
    wx.vibrateShort({ type: 'light' });
  },

  // ── 预览模式切换 ──

  togglePreviewMode() {
    const mode = this.data.previewMode === 'stack' ? 'grid' : 'stack';
    this.setData({
      previewMode: mode,
      previewModeIcon: mode === 'stack' ? '⊞' : '⊟',
      previewModeLabel: mode === 'stack' ? '堆叠' : '并排'
    });
    wx.vibrateShort({ type: 'light' });
  },

  // ── 透明度调整 ──

  toggleOpacityPanel() {
    this.setData({ editingOpacity: !this.data.editingOpacity });
    wx.vibrateShort({ type: 'light' });
  },

  onOpacityChange(e) {
    const index = e.currentTarget.dataset.index;
    const value = parseInt(e.detail.value) / 100;
    const opacities = { ...this.data.opacityValues };
    opacities[index] = value;
    this.refreshLayerView({ opacityValues: opacities });
  },

  // ── 图层顺序管理 ──

  moveLayerUp(e) {
    const index = e.currentTarget.dataset.index;
    const layers = [...this.data.layers];
    const pos = layers.findIndex(l => l.index === index);
    if (pos <= 0) return;

    // 交换顺序
    [layers[pos], layers[pos - 1]] = [layers[pos - 1], layers[pos]];
    // 更新 order 属性
    layers.forEach((layer, i) => { layer.order = i + 1; });

    this.refreshLayerView({ layers });
    wx.vibrateShort({ type: 'light' });
  },

  moveLayerDown(e) {
    const index = e.currentTarget.dataset.index;
    const layers = [...this.data.layers];
    const pos = layers.findIndex(l => l.index === index);
    if (pos >= layers.length - 1) return;

    [layers[pos], layers[pos + 1]] = [layers[pos + 1], layers[pos]];
    layers.forEach((layer, i) => { layer.order = i + 1; });

    this.refreshLayerView({ layers });
    wx.vibrateShort({ type: 'light' });
  },

  // ── 拖动排序 ──

  onLayerTouchStart(e) {
    const index = e.currentTarget.dataset.index;
    const touchY = e.touches[0].clientY;
    this._dragStartY = touchY;
    this._dragIndex = index;
    this._dragTimer = setTimeout(() => {
      this.refreshLayerView({ draggingIndex: index });
    }, 300);
  },

  onLayerTouchMove(e) {
    if (this.data.draggingIndex < 0) {
      clearTimeout(this._dragTimer);
      return;
    }

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this._dragStartY;
    this.refreshLayerView({ dragTranslateY: deltaY });
  },

  onLayerTouchEnd() {
    clearTimeout(this._dragTimer);
    const dragIndex = this.data.draggingIndex;
    if (dragIndex < 0) return;

    const translateY = this.data.dragTranslateY;
    const itemHeight = 140;
    const moveSteps = Math.round(translateY / itemHeight);

    if (moveSteps !== 0) {
      const layers = [...this.data.layers];
      const fromPos = layers.findIndex(l => l.index === dragIndex);
      if (fromPos >= 0) {
        const toPos = Math.max(0, Math.min(layers.length - 1, fromPos + moveSteps));
        if (fromPos !== toPos) {
          const [moved] = layers.splice(fromPos, 1);
          layers.splice(toPos, 0, moved);
          layers.forEach((layer, i) => { layer.order = i + 1; });
          this.refreshLayerView({ layers });
        }
      }
    }

    this.refreshLayerView({
      draggingIndex: -1,
      dragTranslateY: 0
    });
    wx.vibrateShort({ type: 'medium' });
  },

  // ── 帮助提示 ──

  toggleHelp() {
    this.setData({ showHelp: !this.data.showHelp });
  },

  // ── 返回上一页 ──

  goBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/home/home' })
    });
  }
});
