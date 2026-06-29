const THREE = require('./vendor/three-platformize/build/three.module.js')
const WechatPlatformModule = require('./vendor/three-platformize/src/WechatPlatform/index.js')
const { GLTFLoader } = require('./vendor/three-platformize/examples/jsm/loaders/GLTFLoader.js')
const { downloadFileToTemp } = require('./utils/downloadCloudFile')

const WechatPlatform = WechatPlatformModule.default || WechatPlatformModule.WechatPlatform || WechatPlatformModule

Page({
  data: {
    name: '3D模型',
    modelName: '3D模型',
    loading: true
  },

  onLoad(options) {
    const app = getApp();
    const name = app.globalData._pendingModelName || options.name || '3D模型';
    this.setData({ name: decodeURIComponent(name), modelName: decodeURIComponent(name) });
    this._modelUrl = app.globalData._pendingModelUrl || (options.url ? decodeURIComponent(options.url) : '');
    app.globalData._pendingModelUrl = '';
    app.globalData._pendingModelName = '';
  },

  onReady() {
    this._initThree();
  },

  onUnload() {
    if (this._animFrameId && this._canvas) {
      this._canvas.cancelAnimationFrame(this._animFrameId);
    }
    if (THREE.PLATFORM) {
      THREE.PLATFORM.dispose();
    } else if (this._platform) {
      this._platform.dispose();
    }
    this._platform = null;
  },

  goBack() {
    wx.navigateBack();
  },

  _initThree() {
    wx.createSelectorQuery()
      .select('#webgl')
      .node()
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          this.setData({ loading: false });
          wx.showToast({ title: 'Canvas初始化失败', icon: 'none' });
          return;
        }

        const canvas = res[0].node;
        this._canvas = canvas;

        const info = wx.getSystemInfoSync();
        const dpr = info.pixelRatio;
        canvas.width = info.windowWidth * dpr;
        canvas.height = info.windowHeight * dpr;

        const platform = new WechatPlatform(canvas);
        this._platform = platform;
        THREE.PLATFORM.set(platform);

        const gl = canvas.getContext('webgl', { antialias: true });
        const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
        renderer.setPixelRatio(dpr);
        renderer.setSize(info.windowWidth, info.windowHeight);
        renderer.setClearColor(0x1a1a2e);
        renderer.outputEncoding = THREE.sRGBEncoding;
        this._renderer = renderer;

        const scene = new THREE.Scene();
        this._scene = scene;

        const camera = new THREE.PerspectiveCamera(45, info.windowWidth / info.windowHeight, 0.1, 1000);
        camera.position.set(0, 1, 3);
        camera.lookAt(0, 0, 0);
        this._camera = camera;
        this._cameraDistance = 3;

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-5, 5, -5);
        scene.add(backLight);

        this._loadModel();
      });
  },

  async _loadModel() {
    if (!this._modelUrl) {
      this._createDemoCube();
      return;
    }

    if (this._modelUrl.startsWith('wxfile://') || this._modelUrl.startsWith(wx.env.USER_DATA_PATH)) {
      this._loadGLBFromPath(this._modelUrl);
      return;
    }

    wx.showLoading({ title: '下载模型中...' });
    try {
      const tempPath = await downloadFileToTemp(this._modelUrl);
      wx.hideLoading();
      this._loadGLBFromPath(tempPath);
    } catch (err) {
      wx.hideLoading();
      console.error('[3D] 下载失败:', err);
      wx.showToast({ title: '模型下载失败，请重试', icon: 'none' });
      this._createDemoCube();
    }
  },

  _loadGLBFromPath(filePath) {
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath: filePath,
      success: (res) => {
        const loader = new GLTFLoader();
        loader.parse(res.data, '', (gltf) => {
          const model = gltf.scene;

          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2.0 / maxDim;

          model.position.sub(center);

          const group = new THREE.Group();
          group.add(model);
          group.scale.setScalar(scale);

          this._scene.add(group);
          this._modelGroup = group;
          this.setData({ loading: false });
          this._startRenderLoop();
        }, (err) => {
          console.error('[3D] GLB解析失败:', err);
          this._createDemoCube();
        });
      },
      fail: (err) => {
        console.error('[3D] 读取文件失败:', err);
        this._createDemoCube();
      }
    });
  },

  _createDemoCube() {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xD4A849 })
    );
    const group = new THREE.Group();
    group.add(mesh);
    this._scene.add(group);
    this._modelGroup = group;
    this.setData({ loading: false });
    this._startRenderLoop();
  },

  _startRenderLoop() {
    const self = this;
    function render() {
      if (self._modelGroup && !self._touching) {
        self._modelGroup.rotation.y += 0.005;
      }
      self._renderer.render(self._scene, self._camera);
      self._animFrameId = self._canvas.requestAnimationFrame(render);
    }
    this._animFrameId = this._canvas.requestAnimationFrame(render);
  },

  _touching: false,
  _lastX: 0,
  _lastY: 0,
  _lastPinchDist: 0,

  onTouchStart(e) {
    this._touching = true;
    if (e.touches.length === 1) {
      this._lastX = e.touches[0].clientX;
      this._lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this._lastPinchDist = Math.sqrt(dx * dx + dy * dy);
    }
  },

  onTouchMove(e) {
    if (!this._modelGroup) return;

    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (this._lastPinchDist > 0) {
        const ratio = this._lastPinchDist / dist;
        this._cameraDistance = Math.max(1, Math.min(20, this._cameraDistance * ratio));
        this._camera.position.normalize().multiplyScalar(this._cameraDistance);
        this._camera.lookAt(0, 0, 0);
      }
      this._lastPinchDist = dist;
    } else if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - this._lastX;
      const dy = e.touches[0].clientY - this._lastY;
      this._modelGroup.rotation.y += dx * 0.01;
      this._modelGroup.rotation.x += dy * 0.01;
      this._modelGroup.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this._modelGroup.rotation.x));
      this._lastX = e.touches[0].clientX;
      this._lastY = e.touches[0].clientY;
    }
  },

  onTouchEnd() {
    this._touching = false;
    this._lastPinchDist = 0;
  }
});
