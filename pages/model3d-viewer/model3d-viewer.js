const THREE = require('./vendor/three-platformize/build/three.module.js')
const WechatPlatformModule = require('./vendor/three-platformize/src/WechatPlatform/index.js')
const { GLTFLoader } = require('./vendor/three-platformize/examples/jsm/loaders/GLTFLoader.js')
const { downloadFileToTemp } = require('./utils/downloadCloudFile')
const { buildShareAppMessage } = require('../../utils/shareConfig')

const WechatPlatform = WechatPlatformModule.default || WechatPlatformModule.WechatPlatform || WechatPlatformModule

Page({
  onShareAppMessage: buildShareAppMessage,

  data: {
    name: '3D模型',
    modelName: '3D模型',
    loading: true,
    loadingText: '4K 高清模型加载中，正在准备精细木纹...',
    isProcedural: false
  },

  onLoad(options) {
    this._destroyed = false;
    const app = getApp();
    const name = app.globalData._pendingModelName || options.name || '3D模型';
    this.setData({ name: decodeURIComponent(name), modelName: decodeURIComponent(name) });
    this._modelUrl = app.globalData._pendingModelUrl || (options.url ? decodeURIComponent(options.url) : '');
    this._previewImage = app.globalData._pendingModelPreview || (options.preview ? decodeURIComponent(options.preview) : '');
    this._modelMode = app.globalData._pendingModelMode || options.mode || 'glb';
    this.setData({ isProcedural: this._modelMode === 'procedural' });
    app.globalData._pendingModelUrl = '';
    app.globalData._pendingModelName = '';
    app.globalData._pendingModelPreview = '';
    app.globalData._pendingModelMode = '';
  },

  onReady() {
    this._initThree();
    const aiFloat = this.selectComponent('#aiFloat');
    if (aiFloat) {
      const modelContext = getApp().globalData._xiaonianModelContext || {};
      const versionText = modelContext.versionId ? '，当前版本 ' + modelContext.versionId : '，当前为原始版本';
      const galleryType = this.data.isProcedural ? '2.5D展厅：' : '3D展厅：';
      aiFloat.setPageContext({ chapter: galleryType + this.data.modelName + versionText });
    }
  },

  onUnload() {
    this._destroyed = true;
    if (this._animFrameId && this._canvas) {
      this._canvas.cancelAnimationFrame(this._animFrameId);
    }
    this._disposeModelGroup();
    if (THREE.PLATFORM) {
      THREE.PLATFORM.dispose();
    } else if (this._platform) {
      this._platform.dispose();
    }
    this._platform = null;
  },

  _disposeModelGroup() {
    if (!this._modelGroup) return;
    this._modelGroup.traverse((object) => {
      if (object.geometry && object.geometry.dispose) object.geometry.dispose();
      if (!object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (material.map && material.map.dispose) material.map.dispose();
        if (material.dispose) material.dispose();
      });
    });
    if (this._scene) this._scene.remove(this._modelGroup);
    this._modelGroup = null;
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

        const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const dpr = Math.min(Number(info.pixelRatio || 1), 1.5);
        canvas.width = info.windowWidth * dpr;
        canvas.height = info.windowHeight * dpr;

        const platform = new WechatPlatform(canvas);
        this._platform = platform;
        THREE.PLATFORM.set(platform);

        const gl = canvas.getContext('webgl', { antialias: true });
        const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
        renderer.setPixelRatio(dpr);
        renderer.setSize(info.windowWidth, info.windowHeight);
        renderer.setClearColor(0x170d08);
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
    if (this._modelMode === 'procedural' || !this._modelUrl) {
      this._createProceduralBoard();
      return;
    }

    if (this._isLocalFilePath(this._modelUrl)) {
      this._loadGLBFromPath(this._modelUrl);
      return;
    }

    wx.showLoading({ title: '4K高清模型加载中...' });
    this.setData({ loadingText: '4K 高清模型加载中，正在准备精细木纹...' });
    try {
      const localPath = await downloadFileToTemp(this._modelUrl);
      wx.hideLoading();
      this.setData({ loadingText: '高清模型解析中，马上进入展厅...' });
      this._loadGLBFromPath(localPath);
    } catch (err) {
      wx.hideLoading();
      console.error('[3D] 下载失败:', err);
      wx.showToast({ title: '模型下载失败，请重试', icon: 'none' });
      this._createProceduralBoard();
    }
  },

  _isLocalFilePath(filePath) {
    const normalizedPath = String(filePath || '');
    return normalizedPath.startsWith('wxfile://') ||
      normalizedPath.startsWith(wx.env.USER_DATA_PATH) ||
      /^https?:\/\/tmp\//i.test(normalizedPath);
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
          this._createProceduralBoard();
        });
      },
      fail: (err) => {
        console.error('[3D] 读取文件失败:', err);
        wx.showToast({ title: '模型临时文件已失效，请重新生成', icon: 'none' });
        this._createProceduralBoard();
      }
    });
  },

  _createProceduralBoard() {
    const geometry = new THREE.BoxGeometry(1.35, 1.8, 0.16);
    const woodSide = new THREE.MeshStandardMaterial({
      color: 0x6f4325,
      roughness: 0.88,
      metalness: 0
    });
    const woodBack = new THREE.MeshStandardMaterial({
      color: 0x8a5a31,
      roughness: 0.92,
      metalness: 0
    });
    const front = new THREE.MeshStandardMaterial({
      color: 0xd8bd8c,
      transparent: true,
      alphaTest: 0.04,
      roughness: 0.74,
      metalness: 0,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, [
      woodSide,
      woodSide,
      woodSide,
      woodSide,
      front,
      woodBack
    ]);
    mesh.visible = false;
    const group = new THREE.Group();
    group.add(mesh);
    this._scene.add(group);
    this._modelGroup = group;
    this._proceduralBoardMesh = mesh;
    this._proceduralBoardSideMaterial = woodSide;
    this._proceduralBoardBackMaterial = woodBack;
    this._startRenderLoop();
    if (!this._previewImage) {
      this._showProceduralFallback();
      return;
    }
    this._applyPreviewTexture(front);
  },

  _showProceduralFallback() {
    if (this._proceduralBoardMesh) this._proceduralBoardMesh.visible = true;
    if (!this._destroyed) this.setData({ loading: false });
  },

  async _applyPreviewTexture(material) {
    if (!this._previewImage || !this._canvas || !material) {
      this._showProceduralFallback();
      return;
    }

    try {
      const imagePath = await this._downloadPreviewImage(this._previewImage);
      const image = this._canvas.createImage();
      image.onload = () => {
        if (this._destroyed || !this._scene || !material) return;
        const texture = new THREE.Texture(image);
        texture.needsUpdate = true;
        texture.encoding = THREE.sRGBEncoding;
        material.map = texture;
        material.bumpMap = texture;
        material.bumpScale = 0.018;
        material.color.setHex(0xffffff);
        material.needsUpdate = true;
        if (!this._applySilhouetteGeometry(image, material)) {
          this._showProceduralFallback();
          return;
        }
        this.setData({ loading: false });
      };
      image.onerror = (err) => {
        console.warn('[3D] 木板预览纹理加载失败:', err);
        this._showProceduralFallback();
      };
      image.src = imagePath;
    } catch (err) {
      console.warn('[3D] 木板预览图下载失败，保留程序木板:', err);
      this._showProceduralFallback();
    }
  },

  _applySilhouetteGeometry(image, frontMaterial) {
    const mesh = this._proceduralBoardMesh;
    const sideMaterial = this._proceduralBoardSideMaterial;
    const backMaterial = this._proceduralBoardBackMaterial;
    if (
      !mesh ||
      !sideMaterial ||
      !backMaterial ||
      !wx.createOffscreenCanvas ||
      !THREE.ExtrudeGeometry ||
      !THREE.ShapeGeometry
    ) return false;

    try {
      const outline = this._traceImageOutline(image, 72);
      if (!outline || outline.length < 6) return false;

      const sourceWidth = Number(image.width || image.naturalWidth || 1);
      const sourceHeight = Number(image.height || image.naturalHeight || 1);
      const aspect = Math.max(0.45, Math.min(2.2, sourceHeight / sourceWidth));
      const width = aspect > 1 ? 1.8 / aspect : 1.8;
      const height = aspect > 1 ? 1.8 : 1.8 * aspect;
      const shape = new THREE.Shape();

      outline.forEach(function(point, index) {
        const x = (point.x - 0.5) * width;
        const y = (0.5 - point.y) * height;
        if (index === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
      shape.closePath();

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.16,
        steps: 1,
        curveSegments: 1,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.025,
        bevelSegments: 2
      });
      geometry.translate(0, 0, -0.08);
      geometry.computeVertexNormals();

      const frontGeometry = new THREE.ShapeGeometry(shape, 1);
      const frontPosition = frontGeometry.getAttribute('position');
      const frontUv = frontGeometry.getAttribute('uv');
      if (frontPosition && frontUv) {
        for (let i = 0; i < frontPosition.count; i++) {
          frontUv.setXY(
            i,
            Math.max(0, Math.min(1, frontPosition.getX(i) / width + 0.5)),
            Math.max(0, Math.min(1, frontPosition.getY(i) / height + 0.5))
          );
        }
        frontUv.needsUpdate = true;
      }
      const frontMesh = new THREE.Mesh(frontGeometry, frontMaterial);
      frontMesh.position.z = 0.108;

      const previousGeometry = mesh.geometry;
      const previousMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.geometry = geometry;
      mesh.material = [backMaterial, sideMaterial];
      mesh.scale.set(1.045, 1.045, 1);
      mesh.visible = true;
      this._modelGroup.add(frontMesh);
      this._proceduralFrontMesh = frontMesh;
      if (previousGeometry && previousGeometry.dispose) previousGeometry.dispose();
      previousMaterials.forEach(function(previousMaterial) {
        if (
          previousMaterial &&
          previousMaterial !== frontMaterial &&
          previousMaterial !== sideMaterial &&
          previousMaterial !== backMaterial &&
          previousMaterial.dispose
        ) {
          previousMaterial.dispose();
        }
      });
      return true;
    } catch (err) {
      console.warn('[3D] PNG轮廓挤出失败，保留矩形程序木板:', err);
      return false;
    }
  },

  _traceImageOutline(image, size) {
    const canvas = wx.createOffscreenCanvas({ type: '2d', width: size, height: size });
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    const left = [];
    const right = [];
    const threshold = 28;
    const step = 2;

    for (let y = 0; y < size; y += step) {
      let minX = size;
      let maxX = -1;
      for (let x = 0; x < size; x++) {
        if (pixels[(y * size + x) * 4 + 3] > threshold) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
      if (maxX < 0) continue;
      left.push({ x: Math.max(0, minX - 1) / (size - 1), y: y / (size - 1) });
      right.push({ x: Math.min(size - 1, maxX + 1) / (size - 1), y: y / (size - 1) });
    }

    if (left.length < 3) return null;
    return left.concat(right.reverse());
  },

  _downloadPreviewImage(source) {
    if (!source || !source.startsWith('cloud://')) return Promise.resolve(source);
    return new Promise(function(resolve, reject) {
      wx.cloud.downloadFile({
        fileID: source,
        success: function(res) { resolve(res.tempFilePath); },
        fail: reject
      });
    });
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
