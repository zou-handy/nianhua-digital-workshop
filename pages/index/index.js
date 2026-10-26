const { layerFileID } = require('../../constants/cloudAssets');
const { buildShareAppMessage } = require('../../utils/shareConfig');

const HOME_LAYER_URLS = [
  layerFileID('logo-demo', 8),
  layerFileID('logo-demo', 7),
  layerFileID('logo-demo', 6),
  layerFileID('logo-demo', 5),
  layerFileID('logo-demo', 4),
  layerFileID('logo-demo', 3),
  layerFileID('logo-demo', 2),
  layerFileID('logo-demo', 1),
  layerFileID('logo-demo', 0)
];

function buildHomeLayers(paths) {
  const total = paths.length;
  const totalDepth = total <= 5 ? 240 : Math.min(420, (total - 1) * 45);
  const spacing = total <= 1 ? 0 : totalDepth / (total - 1);

  return paths.map((url, index) => ({
    id: index + 1,
    name: '图层' + (index + 1),
    url,
    zDist: Math.round(-totalDepth / 2 + index * spacing),
    order: index + 1
  }));
}

Page({
  onShareAppMessage: buildShareAppMessage,

  data: {
    isExploded: true,
    hasTapped: false,
    layersLoading: false,
    layers: buildHomeLayers(HOME_LAYER_URLS),
    rotateX: 15,
    rotateY: -25,
    scale: 1,
    _touchStartX: 0,
    _touchStartY: 0,
    _lastRotateX: 15,
    _lastRotateY: -25,
    _initialPinchDistance: 0,
    _lastScale: 1,
    _isTouchMoved: false
  },

  onLoad() {
    this._autoCollapseLayers();
  },

  _autoCollapseLayers() {
    setTimeout(() => {
      this.setData({ isExploded: false });
    }, 1500);
  },

  toggleExplode() {
    this.setData({ 
      isExploded: !this.data.isExploded,
      hasTapped: true
    });
  },

  onStageTouchStart(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this._initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
      this._lastScale = this.data.scale;
      this._isTouchMoved = true;
    } else if (e.touches.length === 1) {
      this._touchStartX = e.touches[0].clientX;
      this._touchStartY = e.touches[0].clientY;
      this._lastRotateX = this.data.rotateX;
      this._lastRotateY = this.data.rotateY;
      this._isTouchMoved = false;
    }
  },

  onStageTouchMove(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      this._isTouchMoved = true;

      if (this._initialPinchDistance > 0) {
        let newScale = this._lastScale * (currentDistance / this._initialPinchDistance);
        newScale = Math.max(0.5, Math.min(3, newScale));
        this.setData({ scale: newScale });
      }
    } else if (e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - this._touchStartX;
      const deltaY = e.touches[0].clientY - this._touchStartY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        this._isTouchMoved = true;
      }

      this.setData({
        rotateY: this._lastRotateY + deltaX * 0.3,
        rotateX: Math.max(-30, Math.min(60, this._lastRotateX - deltaY * 0.3))
      });
    }
  },

  onStageTouchEnd() {
    this._initialPinchDistance = 0;

    if (!this._isTouchMoved) {
      this.toggleExplode();
    }
  },

  goToCreate() {
    wx.navigateTo({
      url: '/pages/ai-create/ai-create'
    });
  },

  showToast(e) {
    wx.showToast({
      title: e.currentTarget.dataset.msg,
      icon: 'none'
    });
  },

  goTo3D() {
    wx.navigateTo({
      url: '/pages/gallery/gallery'
    });
  },

  goToExplodedView() {
    wx.navigateTo({
      url: '/pages/exploded-view/exploded-view'
    });
  },

  goToHome() {
    wx.redirectTo({
      url: '/pages/home/home'
    });
  }
})
