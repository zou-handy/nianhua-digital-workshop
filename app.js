App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d7g47tfdyf7a14a31'
      });
    }
    console.log('佛山年画AI创作小程序启动');
  },
  globalData: {
    apiBaseUrl: '',
    userInfo: null,
    currentLayers: null,
    _pendingModelUrl: '',
    _pendingModelName: '',
    _pendingModelPreview: '',
    _pendingModelMode: ''
  }
})
