// utils/engine3d.js —— 佛山木版年画 3D 数字展厅引擎（增强版）
// 零依赖 Canvas 2D 软件渲染，支持：实拍图片展板/倒影/惯性/开场动画/扫描环
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const COLORS = {
  bgInner: '#2a1810', bgOuter: '#0b0705',
  gridCyan: '181, 117, 65',
  gold: '#e8c15a', goldRgb: '232, 193, 90',
  vermilion: '#c0392b', paperWhite: '#f5f1e8'
};

/* ---- 向量工具 ---- */
function v3sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function v3dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function v3cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}
function v3norm(a) { const l = Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; }

class Engine3D {
  constructor(opts) {
    this.canvas = opts.canvas;
    this.ctx = opts.ctx;
    this.width = opts.width;
    this.height = opts.height;
    this.artworks = opts.artworks || [];
    this.centerLayers = opts.centerLayers || [];
    this.backgroundImage = opts.backgroundImage || '';
    this.onSelect = opts.onSelect || (() => {});

    // 相机
    this.target = [0, 1.7, 0];
    this.yaw = 0.55;
    this.pitch = 0.24;
    this.radius = 22;           // 开场动画从此推近
    this.focal = this.height * 1.12;

    this.autoRotate = true;
    this.selectedId = null;
    this.ORBIT_R = 6;

    // 展板
    this.panels = this.artworks.map((art, i) => ({
      art, angle: (i / this.artworks.length) * Math.PI * 2,
      phase: i * 1.31, rect: null
    }));

    // 图片缓存
    this.images = {};
    this._loadImages();
    this._loadBackgroundImage();
    this.centerImages = [];
    this._loadCenterImages();
    this.centerExpansion = 1;
    this.centerExpansionTarget = 1;
    this._centerStartTime = null;
    this._centerAutoCollapsed = false;

    // 开场动画
    this._intro = { active: true, start: null, from: 22, to: 13.5 };

    // 惯性
    this.yawVelocity = 0;

    // 粒子（120个）
    this.particles = [];
    for (let i = 0; i < 120; i++) {
      const r = 1.4 + Math.random() * 8.6;
      this.particles.push({
        r, angle: Math.random() * Math.PI * 2,
        y: 0.2 + Math.random() * 6,
        speed: 0.0014 + Math.random() * 0.0032,
        drift: (Math.random() - 0.5) * 0.0008,
        size: 0.8 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        colorIdx: Math.random() < 0.5 ? 0 : (Math.random() < 0.65 ? 1 : 2)
      });
    }

    // 星空
    this.stars = [];
    this._buildStars();

    // 缓存
    this._bgGradient = null;
    this._pickRects = [];
    this._scanStart = Date.now();
    this._lastTime = 0;
  }

  setVelocity(vy) { this.yawVelocity = vy; }
  cancelIntro() {
    if (!this._intro.active) return;
    this._intro.active = false;
    this.radius = this._intro.to;
  }
  rotate(dy, dp) { this.yaw += dy; this.pitch = clamp(this.pitch + dp, -0.08, 1.15); }
  zoomBy(f) { this.radius = clamp(this.radius * f, 6.5, 28); }
  setAutoRotate(v) { this.autoRotate = v; }
  select(id) { this.selectedId = id; }
  toggleCenterLayers() {
    this._centerAutoCollapsed = true;
    this.centerExpansionTarget = this.centerExpansion > 0.35 ? 0 : 1;
  }

  resize(w, h) { this.width = w; this.height = h; this.focal = h * 1.12; this._buildStars(); this._bgGradient = null; }

  /* ---- 图片加载 ---- */
  _loadImages() {
    if (!this.canvas) return;
    for (const art of this.artworks) {
      if (!art.image) { this.images[art.id] = { loaded: false, failed: true }; continue; }
      const img = this.canvas.createImage();
      const entry = { img, loaded: false, failed: false };
      this.images[art.id] = entry;
      img.onload = () => { entry.loaded = true; };
      img.onerror = () => { entry.failed = true; };
      img.src = art.image;
    }
  }

  _loadBackgroundImage() {
    this.backgroundEntry = { loaded: false, failed: false, img: null };
    if (!this.canvas || !this.backgroundImage) return;
    const img = this.canvas.createImage();
    this.backgroundEntry.img = img;
    img.onload = () => { this.backgroundEntry.loaded = true; };
    img.onerror = () => { this.backgroundEntry.failed = true; };
    img.src = this.backgroundImage;
  }

  _loadCenterImages() {
    if (!this.canvas) return;
    this.centerImages = this.centerLayers.map((src) => {
      const img = this.canvas.createImage();
      const entry = { img, loaded: false, failed: false };
      img.onload = () => { entry.loaded = true; };
      img.onerror = () => { entry.failed = true; };
      img.src = src;
      return entry;
    });
  }

  _buildStars() {
    this.stars = [];
    for (let i = 0; i < 46; i++) {
      this.stars.push({
        x: Math.random() * this.width, y: Math.random() * this.height * 0.55,
        size: 0.5 + Math.random() * 1.2, speed: 0.0008 + Math.random() * 0.002,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  /* ---- 相机与投影 ---- */
  _computeCamera() {
    const { yaw, pitch, radius, target } = this;
    const cam = [
      target[0] + radius * Math.sin(yaw) * Math.cos(pitch),
      target[1] + radius * Math.sin(pitch),
      target[2] + radius * Math.cos(yaw) * Math.cos(pitch)
    ];
    this._cam = cam;
    this._fwd = v3norm(v3sub(target, cam));
    this._right = v3norm(v3cross(this._fwd, [0, 1, 0]));
    this._up = v3cross(this._right, this._fwd);
  }

  project(p) {
    const v = v3sub(p, this._cam);
    const vz = v3dot(v, this._fwd);
    if (vz <= 0.3) return { x: 0, y: 0, depth: vz };
    return {
      x: this.width / 2 + (v3dot(v, this._right) / vz) * this.focal,
      y: this.height / 2 - (v3dot(v, this._up) / vz) * this.focal,
      depth: vz
    };
  }

  /* ---- 拾取 ---- */
  pick(x, y) {
    const rects = this._pickRects.slice().sort((a, b) => a.depth - b.depth);
    for (const r of rects) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id;
    }
    return null;
  }

  /* ======== 主渲染 ======== */
  render(t) {
    const ctx = this.ctx, w = this.width, h = this.height;
    const time = typeof t === 'number' ? t : Date.now();

    if (this._centerStartTime === null) this._centerStartTime = time;
    if (!this._centerAutoCollapsed && time - this._centerStartTime > 1800) {
      this.centerExpansionTarget = 0;
      this._centerAutoCollapsed = true;
    }
    this.centerExpansion += (this.centerExpansionTarget - this.centerExpansion) * 0.09;

    // 开场动画
    if (this._intro.active) {
      if (this._intro.start === null) this._intro.start = time;
      const tt = Math.min(1, (time - this._intro.start) / 1600);
      const ease = 1 - Math.pow(1 - tt, 3.5);
      this.radius = this._intro.from + (this._intro.to - this._intro.from) * ease;
      if (tt >= 1) { this._intro.active = false; this.radius = this._intro.to; }
    }

    // 惯性
    if (Math.abs(this.yawVelocity) > 0.0001) {
      this.yaw += this.yawVelocity;
      this.yawVelocity *= 0.92;
    } else { this.yawVelocity = 0; }

    // 自动旋转
    if (this.autoRotate && !this._intro.active) this.yaw += 0.0022;

    // ---- 场景 ---- 
    this._drawBackground(time);
    this._computeCamera();

    this._drawStars(time);
    this._drawHorizonGlow(time);
    this._drawGroundGrid(time);
    this._drawOrbitRings(time);
    this._drawLightPillars(time);
    this._drawScanRing(time);
    this._drawSkyRing(time);

    // 收集深度排序对象
    const drawList = [];
    this._pickRects = [];

    for (const panel of this.panels) {
      const floatY = 2.25 + 0.28 * Math.sin(time * 0.0011 + panel.phase);
      const pos = [this.ORBIT_R * Math.cos(panel.angle), floatY, this.ORBIT_R * Math.sin(panel.angle)];
      const pt = this.project(pos);
      if (pt.depth <= 0.5) { panel.rect = null; continue; }
      const gnd = this.project([pos[0], 0.04, pos[2]]);
      const sel = panel.art.id === this.selectedId;
      const sc = sel ? 1.14 : 1;
      const panelWidth = panel.art.landscape ? 3.4 : 2.2;
      const panelHeight = panel.art.landscape ? 2.25 : 2.9;
      const pw = (panelWidth / pt.depth) * this.focal * sc;
      const ph = (panelHeight / pt.depth) * this.focal * sc;
      panel.rect = { x: pt.x - pw/2, y: pt.y - ph/2, w: pw, h: ph, depth: pt.depth };
      this._pickRects.push({ id: panel.art.id, x: panel.rect.x, y: panel.rect.y, w: pw, h: ph, depth: pt.depth });
      drawList.push({ depth: pt.depth, type: 'panel', panel, pt, pw, ph, sel, gnd });
    }

    const cp = this.project([0, 2.55 + 0.16 * Math.sin(time * 0.001), 0]);
    if (cp.depth > 0.5) drawList.push({ depth: cp.depth, type: 'center', pt: cp });

    for (const p of this.particles) {
      p.angle += p.drift * 16; p.y += p.speed * 16;
      if (p.y > 6.2) { p.y = 0.1; }
      const pt = this.project([p.r * Math.cos(p.angle), p.y, p.r * Math.sin(p.angle)]);
      if (pt.depth <= 0.5) continue;
      drawList.push({ depth: pt.depth, type: 'particle', p, pt });
    }

    drawList.sort((a, b) => b.depth - a.depth);

    for (const item of drawList) {
      if (item.type === 'panel') {
        this._drawPanelReflection(item, time);
        this._drawPanel(item, time);
      } else if (item.type === 'center') {
        this._drawCenterPiece(item.pt, time);
      } else {
        this._drawParticle(item.p, item.pt, time);
      }
    }

    this._drawCenterHalo(time);
    this._drawBottomGlow(time);
    this._lastTime = time;
  }

  /* ======== 场景元素 ======== */
  _drawBackground(t) {
    const ctx = this.ctx, w = this.width, h = this.height;
    ctx.fillStyle = COLORS.bgOuter;
    ctx.fillRect(0, 0, w, h);

    const background = this.backgroundEntry;
    if (background && background.loaded && background.img) {
      const img = background.img;
      const scale = Math.max(w / img.width, h / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
      ctx.restore();
    }

    if (!this._bgGradient) {
      const g = ctx.createRadialGradient(w/2, h*0.40, 10, w/2, h*0.40, Math.max(w,h)*0.85);
      g.addColorStop(0, 'rgba(66, 37, 23, 0.28)');
      g.addColorStop(0.48, 'rgba(29, 16, 10, 0.54)');
      g.addColorStop(1, 'rgba(8, 5, 3, 0.9)');
      this._bgGradient = g;
    }
    ctx.fillStyle = this._bgGradient;
    ctx.fillRect(0, 0, w, h);
  }

  _drawStars(t) {
    const ctx = this.ctx;
    for (const s of this.stars) {
      ctx.globalAlpha = 0.2 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.fillStyle = '#f0d6a5';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }

  _drawHorizonGlow(t) {
    const ctx = this.ctx, w = this.width, h = this.height;
    const yGlow = h * 0.50 + Math.sin(t * 0.0008) * 8;
    const g = ctx.createRadialGradient(w/2, yGlow, 0, w/2, yGlow, w * 0.45);
    g.addColorStop(0, `rgba(${COLORS.gridCyan}, 0.06)`);
    g.addColorStop(0.5, `rgba(${COLORS.gridCyan}, 0.025)`);
    g.addColorStop(1, `rgba(${COLORS.gridCyan}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  _drawBottomGlow(t) {
    const ctx = this.ctx, w = this.width, h = this.height;
    const g = ctx.createRadialGradient(w/2, h*0.88, 0, w/2, h*0.88, w*0.23);
    g.addColorStop(0, `rgba(${COLORS.gridCyan}, 0.04)`);
    g.addColorStop(1, `rgba(${COLORS.gridCyan}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  _drawGroundGrid(t) {
    const ctx = this.ctx;
    const RANGE = 9, STEP = 1.5, SEG = 14;

    const drawLine = (a, b) => {
      for (let i = 0; i < SEG; i++) {
        const p0 = [a[0]+(b[0]-a[0])*(i/SEG), 0, a[2]+(b[2]-a[2])*(i/SEG)];
        const p1 = [a[0]+(b[0]-a[0])*((i+1)/SEG), 0, a[2]+(b[2]-a[2])*((i+1)/SEG)];
        const s0 = this.project(p0), s1 = this.project(p1);
        if (s0.depth <= 0.3 || s1.depth <= 0.3) continue;
        const alpha = clamp(0.45 - (s0.depth / this.radius) * 0.3, 0.03, 0.45);
        ctx.strokeStyle = `rgba(${COLORS.gridCyan}, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(s0.x, s0.y);
        ctx.lineTo(s1.x, s1.y);
        ctx.stroke();
      }
    };

    for (let k = -RANGE; k <= RANGE + 0.01; k += STEP) {
      drawLine([k, 0, -RANGE], [k, 0, RANGE]);
      drawLine([-RANGE, 0, k], [RANGE, 0, k]);
    }
  }

  _drawOrbitRings(t) {
    const ctx = this.ctx, SEG = 56;
    const pulse = 0.18 + 0.10 * Math.sin(t * 0.0015);

    // 金环（展板轨道）
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 6]);
    for (let i = 0; i < SEG; i += 2) {
      const a0 = (i/SEG)*Math.PI*2 + t*0.00015;
      const a1 = ((i+1)/SEG)*Math.PI*2 + t*0.00015;
      const s0 = this.project([this.ORBIT_R*Math.cos(a0),0.02,this.ORBIT_R*Math.sin(a0)]);
      const s1 = this.project([this.ORBIT_R*Math.cos(a1),0.02,this.ORBIT_R*Math.sin(a1)]);
      if (s0.depth<=0.3||s1.depth<=0.3) continue;
      ctx.strokeStyle = `rgba(${COLORS.goldRgb}, ${pulse})`;
      ctx.beginPath(); ctx.moveTo(s0.x,s0.y); ctx.lineTo(s1.x,s1.y); ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  /** 数字光柱（细微发光丝线） */
  _drawLightPillars(t) {
    const ctx = this.ctx;
    const N = 6, R = this.ORBIT_R + 1.4;
    for (let i = 0; i < N; i++) {
      const angle = (i/N)*Math.PI*2 + Math.PI/N + t*0.00004;
      const base = this.project([R*Math.cos(angle), 0, R*Math.sin(angle)]);
      const top = this.project([R*Math.cos(angle), 5.5, R*Math.sin(angle)]);
      if (base.depth<=0.4||top.depth<=0.4) continue;
      const breathe = 0.45 + 0.55 * Math.sin(t*0.0016 + i*1.7);
      const lw = clamp(this.focal*0.04/base.depth, 0.6, 3);
      const g = ctx.createLinearGradient(base.x,base.y,top.x,top.y);
      g.addColorStop(0, `rgba(${COLORS.gridCyan}, ${0.30*breathe})`);
      g.addColorStop(0.6, `rgba(${COLORS.gridCyan}, ${0.10*breathe})`);
      g.addColorStop(1, `rgba(${COLORS.gridCyan},0)`);
      ctx.strokeStyle = g;
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(base.x,base.y); ctx.lineTo(top.x,top.y); ctx.stroke();

      // 顶光点
      ctx.globalAlpha = 0.45 * breathe;
      ctx.fillStyle = '#9be8ff';
      ctx.beginPath();
      ctx.arc(top.x, top.y, clamp(this.focal*0.010/top.depth,0.5,2.2), 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /** 地面扫描脉冲环（每4秒扩散一圈） */
  _drawScanRing(t) {
    const ctx = this.ctx;
    const elapsed = (t - this._scanStart) % 4000;
    const progress = elapsed / 4000; // 0~1
    const sr = 1.0 + progress * 9.5; // 半径1→10.5
    const alpha = progress < 0.08 ? progress * 8 : (1 - progress) * 1.1;
    if (alpha <= 0.01) return;

    const SEG = 48;
    ctx.strokeStyle = `rgba(${COLORS.goldRgb}, ${alpha * 0.3})`;
    ctx.lineWidth = 1.2 + (1 - progress) * 2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= SEG; i++) {
      const a = (i/SEG)*Math.PI*2;
      const s = this.project([sr*Math.cos(a), 0.03, sr*Math.sin(a)]);
      if (s.depth <= 0.3) { started = false; continue; }
      if (!started) { ctx.moveTo(s.x,s.y); started = true; }
      else ctx.lineTo(s.x,s.y);
    }
    ctx.stroke();
  }

  /** 天穹光环（y=6.5 缓慢旋转的金环） */
  _drawSkyRing(t) {
    const ctx = this.ctx;
    const SEG = 40;
    const offset = t * 0.00008;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = `rgba(${COLORS.goldRgb}, 0.15)`;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= SEG; i++) {
      const a = (i/SEG)*Math.PI*2 + offset;
      const s = this.project([this.ORBIT_R*1.15 * Math.cos(a), 6.5, this.ORBIT_R*1.15 * Math.sin(a)]);
      if (s.depth <= 0.3) { started = false; continue; }
      if (!started) { ctx.moveTo(s.x,s.y); started = true; }
      else ctx.lineTo(s.x,s.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** 中心 Logo 分色层叠 */
  _drawCenterPiece(pt, t) {
    const ctx = this.ctx;
    const baseSize = (3.25 / pt.depth) * this.focal;
    const baseWidth = baseSize * 0.74;
    const layerCount = this.centerImages.length;

    // 冲天光束
    const topPt = this.project([0, 8.5, 0]);
    if (topPt.depth > 0.4) {
      const g = ctx.createLinearGradient(pt.x,pt.y,topPt.x,topPt.y);
      g.addColorStop(0, `rgba(${COLORS.goldRgb},0.28)`);
      g.addColorStop(1, `rgba(${COLORS.goldRgb},0)`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y - baseSize*0.45);
      ctx.lineTo(topPt.x, topPt.y);
      ctx.stroke();
    }

    if (!layerCount) return;
    const half = (layerCount - 1) / 2;
    const layers = this.centerImages.map((entry, index) => {
      const offset = (index - half) * 0.34 * this.centerExpansion;
      const layerPt = this.project([0, 2.55, offset]);
      return { entry, index, pt: layerPt };
    }).filter((layer) => layer.pt.depth > 0.4);
    layers.sort((a, b) => b.pt.depth - a.pt.depth || a.index - b.index);

    for (const layer of layers) {
      if (!layer.entry.loaded) continue;
      const h = (3.25 / layer.pt.depth) * this.focal;
      const w = h * 0.74;
      ctx.save();
      ctx.globalAlpha = 0.98;
      ctx.shadowColor = `rgba(${COLORS.goldRgb},${0.12 + this.centerExpansion * 0.12})`;
      ctx.shadowBlur = 8 + this.centerExpansion * 12;
      ctx.drawImage(layer.entry.img, layer.pt.x - w / 2, layer.pt.y - h / 2, w, h);
      ctx.restore();
    }

    this._pickRects.push({
      id: '__center_logo__',
      x: pt.x - baseWidth / 2,
      y: pt.y - baseSize / 2,
      w: baseWidth,
      h: baseSize,
      depth: pt.depth
    });
  }

  _drawCenterHalo(t) {
    const ctx = this.ctx; const SEG = 40;
    const r = 2.0 + 0.15 * Math.sin(t*0.002);
    ctx.fillStyle = `rgba(${COLORS.goldRgb}, 0.12)`;
    ctx.strokeStyle = `rgba(${COLORS.goldRgb}, 0.25)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= SEG; i++) {
      const a = (i/SEG)*Math.PI*2;
      const s = this.project([r*Math.cos(a), 0.04, r*Math.sin(a)]);
      if (s.depth<=0.3) { started=false; continue; }
      if (!started) { ctx.moveTo(s.x,s.y); started=true; }
      else ctx.lineTo(s.x,s.y);
    }
    ctx.stroke();
  }

  /* ---- 粒子 ---- */
  _drawParticle(p, pt, t) {
    const ctx = this.ctx;
    const ss = clamp(this.focal/pt.depth/220, 0.35, 1.6) * p.size;
    const twinkle = 0.4 + 0.6 * Math.sin(t*0.003 + p.phase);
    const df = clamp(1.3 - pt.depth/16, 0.12, 1);
    const alpha = twinkle * df * 0.8;
    const colors = [`rgba(${COLORS.goldRgb},`, `rgba(${COLORS.gridCyan},`, 'rgba(245,241,232,'];
    ctx.fillStyle = colors[p.colorIdx] + alpha + ')';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, ss, 0, Math.PI*2);
    ctx.fill();
  }

  /* ======== 展板（核心） ======== */
  _drawPanelReflection(item, t) {
    const { panel, pt, pw, ph, gnd } = item;
    if (!gnd || gnd.depth <= 0.4) return;
    const ctx = this.ctx;
    const gy = gnd.y;
    const imgEntry = this.images[panel.art.id];
    const r = Math.min(10, pw*0.08);

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.translate(pt.x, gy);
    ctx.scale(1, -0.50);

    const reflectH = ph;
    if (imgEntry && imgEntry.loaded) {
      this._roundRectPath(-pw/2, 0, pw, reflectH, r);
      ctx.clip();
      ctx.drawImage(imgEntry.img, -pw/2, 0, pw, reflectH);
    } else {
      this.drawArtwork(panel.art.pattern, -pw/2, 0, pw, reflectH);
    }
    ctx.restore();
  }

  _drawPanel(item, t) {
    const { panel, pt, pw, ph, sel } = item;
    const ctx = this.ctx;
    const depthFade = clamp(1.3 - pt.depth/20, 0.45, 1);
    const imgEntry = this.images[panel.art.id];
    const r = Math.min(12, pw*0.08);

    ctx.save();
    ctx.globalAlpha = depthFade;

    // 选中发光
    if (sel) {
      const pulse = 0.5 + 0.5 * Math.sin(t*0.004);
      ctx.shadowColor = `rgba(196,30,58,${0.42+0.24*pulse})`;
      ctx.shadowBlur = 30;
      ctx.strokeStyle = `rgba(${COLORS.gridCyan}, 0.85)`;
      ctx.lineWidth = 2.5;
      this._roundRectPath(pt.x-pw/2-5, pt.y-ph/2-5, pw+10, ph+10, r+2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 底板阴影
    ctx.shadowBlur = sel ? 18 : 8;
    ctx.shadowColor = sel ? 'rgba(196,30,58,0.38)' : 'rgba(232,193,90,0.20)';
    this._roundRectPath(pt.x-pw/2, pt.y-ph/2, pw, ph, r);
    ctx.fillStyle = 'rgba(7,10,23,0.15)';
    ctx.fill();
    ctx.shadowBlur = 0;

    // 内容：图片 or 手绘
    if (imgEntry && imgEntry.loaded) {
      this._roundRectPath(pt.x-pw/2, pt.y-ph/2, pw, ph, r);
      ctx.clip();
      ctx.drawImage(imgEntry.img, pt.x-pw/2, pt.y-ph/2, pw, ph);
    } else {
      this.drawArtwork(panel.art.pattern, pt.x-pw/2, pt.y-ph/2, pw, ph);
    }

    // 外金框
    ctx.strokeStyle = `rgba(${COLORS.goldRgb}, ${sel?0.9:0.55})`;
    ctx.lineWidth = sel ? 2.5 : 1.5;
    this._roundRectPath(pt.x-pw/2, pt.y-ph/2, pw, ph, r);
    ctx.stroke();

    // 内框
    if (!sel) {
      ctx.strokeStyle = `rgba(${COLORS.goldRgb}, 0.30)`;
      ctx.lineWidth = 0.8;
      this._roundRectPath(pt.x-pw/2+pw*0.04, pt.y-ph/2+pw*0.04, pw-pw*0.08, ph-pw*0.08, r*0.7);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    this._drawPanelLabel(pt, pw, ph, panel.art.name, sel, depthFade);
    ctx.restore();
  }

  _drawPanelLabel(pt, pw, ph, name, sel, df) {
    const ctx = this.ctx;
    const labelH = Math.max(16, ph * 0.10);
    const labelY = pt.y + ph/2 + labelH*0.35;
    const labelW = pw * 0.82;
    ctx.globalAlpha = df * 0.95;
    ctx.fillStyle = 'rgba(7,10,23,0.72)';
    this._roundRectPath(pt.x - labelW/2, labelY, labelW, labelH, labelH/2);
    ctx.fill();
    ctx.strokeStyle = sel ? 'rgba(196,30,58,0.78)' : `rgba(${COLORS.goldRgb}, 0.42)`;
    ctx.lineWidth = 1;
    this._roundRectPath(pt.x - labelW/2, labelY, labelW, labelH, labelH/2);
    ctx.stroke();
    ctx.fillStyle = sel ? '#bfeaff' : COLORS.gold;
    ctx.font = `${Math.floor(labelH*0.50)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, pt.x, labelY + labelH/2);
    ctx.globalAlpha = 1;
  }

  /* ======== 手绘年画图案（图片加载失败/无图时回退） ======== */
  drawArtwork(pattern, x, y, w, h) {
    const ctx = this.ctx;
    ctx.save();

    const bg = ctx.createLinearGradient(x,y,x,y+h);
    bg.addColorStop(0,'#c23325'); bg.addColorStop(0.55,'#a01f18'); bg.addColorStop(1,'#7c110c');
    ctx.fillStyle = bg;
    this._roundRectPath(x,y,w,h,10);
    ctx.fill();

    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = Math.max(1.5, w*0.018);
    this._roundRectPath(x,y,w,h,10);
    ctx.stroke();

    const inset = w*0.055;
    ctx.strokeStyle = `rgba(${COLORS.goldRgb},0.55)`;
    ctx.lineWidth = Math.max(0.8, w*0.008);
    this._roundRectPath(x+inset,y+inset,w-inset*2,h-inset*2,6);
    ctx.stroke();

    const cx = x + w/2;

    switch (pattern) {
      case 'menshen-qin': this._drawMenShen(x,y,w,h,'#f2d8a0','秦琼','锏'); break;
      case 'menshen-yuchi': this._drawMenShen(x,y,w,h,'#5a3a28','尉迟恭','鞭'); break;
      case 'fu': {
        const s = w*0.56;
        ctx.strokeStyle = COLORS.gold; ctx.lineWidth = Math.max(1.5,w*0.016);
        ctx.save(); ctx.translate(cx,y+h*0.44); ctx.rotate(Math.PI/4);
        ctx.strokeRect(-s/2,-s/2,s,s); ctx.restore();
        ctx.fillStyle = COLORS.gold;
        ctx.font = `bold ${Math.floor(w*0.42)}px serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('福', cx, y+h*0.45);
        this._drawCaption(x,y,w,h,'福字临门'); break;
      }
      case 'caishen': {
        const by = y+h*0.42;
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath(); ctx.ellipse(cx,by,w*0.26,w*0.13,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx,by-w*0.09,w*0.13,w*0.10,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#a8241c'; ctx.lineWidth = Math.max(1,w*0.012);
        ctx.beginPath(); ctx.arc(cx,by,w*0.18,Math.PI*0.15,Math.PI*0.85); ctx.stroke();
        ctx.strokeStyle = COLORS.gold; ctx.lineWidth = Math.max(1.2,w*0.014);
        ctx.beginPath(); ctx.arc(cx,y+h*0.66,w*0.09,0,Math.PI*2); ctx.stroke();
        ctx.strokeRect(cx-w*0.035,y+h*0.66-w*0.035,w*0.07,w*0.07);
        this._drawCaption(x,y,w,h,'财神到'); break;
      }
      case 'zhuangyuan': {
        const hy = y+h*0.36;
        ctx.fillStyle = COLORS.gold;
        this._roundRectPath(cx-w*0.18,hy,w*0.36,w*0.16,4); ctx.fill();
        ctx.fillRect(cx-w*0.30,hy+w*0.05,w*0.12,w*0.05);
        ctx.fillRect(cx+w*0.18,hy+w*0.05,w*0.12,w*0.05);
        ctx.fillStyle = '#e05545';
        ctx.beginPath(); ctx.arc(cx,hy-w*0.02,w*0.045,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = COLORS.gold; ctx.lineWidth = Math.max(1.5,w*0.016);
        ctx.beginPath(); ctx.arc(cx,y+h*0.62,w*0.07,0,Math.PI*2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx,y+h*0.62+w*0.07); ctx.lineTo(cx,y+h*0.62+w*0.24);
        ctx.moveTo(cx-w*0.14,y+h*0.62+w*0.16); ctx.lineTo(cx+w*0.14,y+h*0.62+w*0.16);
        ctx.stroke();
        this._drawCaption(x,y,w,h,'状元及第'); break;
      }
      case 'tuanhe': {
        const ry = y+h*0.44, rr = w*0.27;
        ctx.fillStyle = '#f2d8a0';
        ctx.beginPath(); ctx.arc(cx,ry,rr,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = COLORS.gold; ctx.lineWidth = Math.max(1.5,w*0.016);
        ctx.beginPath(); ctx.arc(cx,ry,rr,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle = '#7c110c'; ctx.lineWidth = Math.max(1.2,w*0.012);
        ctx.beginPath(); ctx.arc(cx-rr*0.35,ry-rr*0.15,rr*0.16,Math.PI*1.1,Math.PI*1.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx+rr*0.35,ry-rr*0.15,rr*0.16,Math.PI*1.1,Math.PI*1.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,ry+rr*0.15,rr*0.38,Math.PI*0.15,Math.PI*0.85); ctx.stroke();
        this._drawCaption(x,y,w,h,'壹团和气'); break;
      }
    }
    ctx.restore();
  }

  _drawMenShen(x, y, w, h, faceColor, name, weapon) {
    const ctx = this.ctx, cx = x + w/2;
    ctx.strokeStyle = COLORS.gold; ctx.lineWidth = Math.max(1, w*0.01);
    for (let i=-1;i<=1;i++) { ctx.beginPath(); ctx.arc(cx+i*w*0.2,y+h*0.13,w*0.06,Math.PI,0); ctx.stroke(); }
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath(); ctx.moveTo(cx-w*0.16,y+h*0.30); ctx.lineTo(cx-w*0.10,y+h*0.20);
    ctx.lineTo(cx+w*0.10,y+h*0.20); ctx.lineTo(cx+w*0.16,y+h*0.30); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(cx,y+h*0.19,w*0.035,0,Math.PI*2); ctx.fill();
    const fy = y+h*0.42, fr = w*0.17;
    ctx.fillStyle = faceColor;
    ctx.beginPath(); ctx.arc(cx,fy,fr,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = COLORS.gold; ctx.lineWidth = Math.max(1.2,w*0.012);
    ctx.beginPath(); ctx.arc(cx,fy,fr,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle = '#1a0d08'; ctx.lineWidth = Math.max(1.4,w*0.016);
    ctx.beginPath(); ctx.moveTo(cx-fr*0.62,fy-fr*0.34); ctx.lineTo(cx-fr*0.18,fy-fr*0.52);
    ctx.moveTo(cx+fr*0.62,fy-fr*0.34); ctx.lineTo(cx+fr*0.18,fy-fr*0.52); ctx.stroke();
    ctx.fillStyle = '#1a0d08';
    ctx.beginPath(); ctx.ellipse(cx-fr*0.36,fy-fr*0.08,fr*0.16,fr*0.10,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+fr*0.36,fy-fr*0.08,fr*0.16,fr*0.10,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#1a0d08'; ctx.lineWidth = Math.max(1,w*0.009);
    for (let i=-2;i<=2;i++) {
      ctx.beginPath(); ctx.moveTo(cx+i*fr*0.22,fy+fr*0.42);
      ctx.quadraticCurveTo(cx+i*fr*0.30,fy+fr*0.85,cx+i*fr*0.36,fy+fr*1.15);
      ctx.stroke();
    }
    const wx = cx+w*0.30;
    ctx.strokeStyle = COLORS.gold; ctx.lineWidth = Math.max(2,w*0.02);
    ctx.beginPath(); ctx.moveTo(wx,y+h*0.30); ctx.lineTo(wx,y+h*0.68); ctx.stroke();
    ctx.lineWidth = Math.max(1,w*0.008);
    for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(wx-w*0.03,y+h*(0.36+i*0.08)); ctx.lineTo(wx+w*0.03,y+h*(0.36+i*0.08)); ctx.stroke(); }
    ctx.fillStyle = COLORS.gold;
    ctx.font = `bold ${Math.floor(w*(name.length>2?0.13:0.17))}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(name,cx,y+h*0.72);
    ctx.strokeStyle = `rgba(${COLORS.goldRgb},0.6)`; ctx.lineWidth = Math.max(1,w*0.009);
    ctx.beginPath(); ctx.moveTo(x+w*0.18,y+h*0.80); ctx.quadraticCurveTo(cx,y+h*0.86,x+w*0.82,y+h*0.80); ctx.stroke();
  }

  _drawCaption(x, y, w, h, text) {
    const ctx = this.ctx; const cx = x+w/2;
    ctx.fillStyle = COLORS.gold;
    const size = Math.floor(w*(text.length>3?0.105:0.13));
    ctx.font = `bold ${size}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    if (text.length===4) {
      ctx.fillText(text[0],x+w*0.35,y+h*0.76);
      ctx.fillText(text[1],x+w*0.65,y+h*0.76);
      ctx.fillText(text[2],x+w*0.35,y+h*0.86);
      ctx.fillText(text[3],x+w*0.65,y+h*0.86);
    } else { ctx.fillText(text,cx,y+h*0.80); }
  }

  _roundRectPath(x, y, w, h, r) {
    const ctx = this.ctx; const rr = Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y); ctx.lineTo(x+w-rr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
    ctx.lineTo(x+w,y+h-rr); ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
    ctx.lineTo(x+rr,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
    ctx.lineTo(x,y+rr); ctx.quadraticCurveTo(x,y,x+rr,y); ctx.closePath();
  }
}

module.exports = { Engine3D };
