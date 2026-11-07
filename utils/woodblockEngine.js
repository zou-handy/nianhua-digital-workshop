/**
 * 佛山木版年画 · 端云同构动态多色制版核心引擎 (v2.1-dynamic-woodblock)
 * -------------------------------------------------------------------
 * 零外部依赖（Pure JS），同时兼容微信小程序端（OffscreenCanvas + ArrayBuffer）与 Node.js。
 * 突破早期固定 4 色限制，支持：
 * - 「智能自适应版数 (3~6版)」：根据实拍图/画作的实际色相分布，从佛山传统九色矿物颜料库中动态激活 3~6 块雕版
 * - 「指定版数 (3 / 4 / 5 / 6 版)」：按画面主色权重自动遴选最优的 K 块色版并融合真实色温
 */

const INK_KEY_PLATE = {
  key: 'black',
  hex: '#191512',
  label: '墨线骨版',
  name: '松烟墨线木板',
  shortName: '墨',
  textColor: '#ffffff',
  material: '松烟墨',
  purpose: '线稿定骨',
  rgb: [25, 21, 18],
  desc: '墨版先行定骨，刻出人物五官神态与衣纹主轮廓，是后续各色木板套印对位的基准。'
};

const MINERAL_CANDIDATE_POOL = [
  {
    key: 'red',
    hex: '#C93434',
    label: '万年红版',
    name: '万年红木板',
    shortName: '红',
    textColor: '#ffffff',
    material: '红丹/朱砂',
    purpose: '主色铺底',
    rgb: [201, 52, 52],
    desc: '万年红承担佛山年画最醒目的喜庆色面，压稳主体衣袍与核心视觉重心。'
  },
  {
    key: 'yellow',
    hex: '#E7B82F',
    label: '石黄色版',
    name: '石黄提亮木板',
    shortName: '黄',
    textColor: '#1A0F08',
    material: '石黄/藤黄',
    purpose: '提亮装饰',
    rgb: [231, 184, 47],
    desc: '石黄版负责提亮面部、金饰、背光与暖调亮面，让画面从深色底中跃出。'
  },
  {
    key: 'green',
    hex: '#2F7A61',
    label: '石绿色版',
    name: '石绿冷调木板',
    shortName: '绿',
    textColor: '#ffffff',
    material: '石绿/铜绿',
    purpose: '冷色压层',
    rgb: [47, 122, 97],
    desc: '石绿版负责翠色衣甲、草木与冷调装饰，与朱红形成鲜明的岭南互补色对比。'
  },
  {
    key: 'blue',
    hex: '#2B5B84',
    label: '靛青蓝版',
    name: '靛青沉底木板',
    shortName: '蓝',
    textColor: '#ffffff',
    material: '靛蓝/石青',
    purpose: '深冷沉底',
    rgb: [43, 91, 132],
    desc: '靛青版承接深冷衣袍、远景与暗部冷调色块，赋予多色套印更深邃的层次。'
  },
  {
    key: 'orange',
    hex: '#D96B27',
    label: '丹柿橙版',
    name: '雄黄丹柿木板',
    shortName: '橙',
    textColor: '#ffffff',
    material: '雄黄/红丹',
    purpose: '暖调过渡',
    rgb: [217, 107, 39],
    desc: '丹柿橙版衔接朱红与石黄，表现暖光肌肤、瑞兽毛色与热烈霞光。'
  },
  {
    key: 'brown',
    hex: '#8C4A27',
    label: '赭石棕版',
    name: '赭石古拙木板',
    shortName: '赭',
    textColor: '#ffffff',
    material: '赭石/代赭',
    purpose: '厚重肌理',
    rgb: [140, 74, 39],
    desc: '赭石版刻画器物、大地、建筑木纹与古朴暗暖色层，增强木版画的厚重质感。'
  },
  {
    key: 'purple',
    hex: '#7A3B69',
    label: '瑞紫霞版',
    name: '胭脂瑞紫木板',
    shortName: '紫',
    textColor: '#ffffff',
    material: '胭脂/花青',
    purpose: '华贵点缀',
    rgb: [122, 59, 105],
    desc: '瑞紫版点缀华服绶带、祥云瑞气与特殊冷暖交界色块。'
  },
  {
    key: 'pink',
    hex: '#D86C7A',
    label: '桃粉开相版',
    name: '桃粉开相木板',
    shortName: '粉',
    textColor: '#ffffff',
    material: '铅粉/胭脂',
    purpose: '开相柔色',
    rgb: [216, 108, 122],
    desc: '桃粉版用于人物面庞开相、花卉瓣叶与柔和浅暖色面。'
  }
];

const FOSHAN_PALETTE_V2 = [
  INK_KEY_PLATE,
  MINERAL_CANDIDATE_POOL[0],
  MINERAL_CANDIDATE_POOL[1],
  MINERAL_CANDIDATE_POOL[2]
];

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function rgbToLuma(r, g, b) {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

function rgbToLab(r, g, b) {
  let sr = r / 255;
  let sg = g / 255;
  let sb = b / 255;
  sr = sr > 0.04045 ? Math.pow((sr + 0.055) / 1.055, 2.4) : sr / 12.92;
  sg = sg > 0.04045 ? Math.pow((sg + 0.055) / 1.055, 2.4) : sg / 12.92;
  sb = sb > 0.04045 ? Math.pow((sb + 0.055) / 1.055, 2.4) : sb / 12.92;

  const x = (sr * 0.4124 + sg * 0.3576 + sb * 0.1805) / 0.95047;
  const y = (sr * 0.2126 + sg * 0.7152 + sb * 0.0722) / 1.00000;
  const z = (sr * 0.0193 + sg * 0.1192 + sb * 0.9505) / 1.08883;

  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function applyEdgePreservingSmooth(rgba, width, height, passes = 2) {
  let src = new Uint8ClampedArray(rgba);
  let tmp = new Uint8ClampedArray(rgba.length);
  const spatialWeights = [1, 4, 6, 4, 1];
  const colorThreshold = 42;

  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const centerIdx = (rowOffset + x) * 4;
        const cr = src[centerIdx], cg = src[centerIdx + 1], cb = src[centerIdx + 2], ca = src[centerIdx + 3];
        if (ca < 16) { tmp[centerIdx + 3] = 0; continue; }
        let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
        for (let k = -2; k <= 2; k++) {
          const nx = clamp(x + k, 0, width - 1);
          const nIdx = (rowOffset + nx) * 4;
          if (src[nIdx + 3] < 16) continue;
          const nr = src[nIdx], ng = src[nIdx + 1], nb = src[nIdx + 2];
          const diff = Math.abs(nr - cr) + Math.abs(ng - cg) + Math.abs(nb - cb);
          const rangeW = diff < colorThreshold ? 4 : diff < colorThreshold * 2 ? 1 : 0;
          const w = spatialWeights[k + 2] * rangeW;
          if (w > 0) { sumR += nr * w; sumG += ng * w; sumB += nb * w; sumW += w; }
        }
        if (sumW > 0) {
          tmp[centerIdx] = Math.round(sumR / sumW);
          tmp[centerIdx + 1] = Math.round(sumG / sumW);
          tmp[centerIdx + 2] = Math.round(sumB / sumW);
          tmp[centerIdx + 3] = ca;
        } else {
          tmp[centerIdx] = cr; tmp[centerIdx + 1] = cg; tmp[centerIdx + 2] = cb; tmp[centerIdx + 3] = ca;
        }
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const centerIdx = (y * width + x) * 4;
        const cr = tmp[centerIdx], cg = tmp[centerIdx + 1], cb = tmp[centerIdx + 2], ca = tmp[centerIdx + 3];
        if (ca < 16) { src[centerIdx + 3] = 0; continue; }
        let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
        for (let k = -2; k <= 2; k++) {
          const ny = clamp(y + k, 0, height - 1);
          const nIdx = (ny * width + x) * 4;
          if (tmp[nIdx + 3] < 16) continue;
          const nr = tmp[nIdx], ng = tmp[nIdx + 1], nb = tmp[nIdx + 2];
          const diff = Math.abs(nr - cr) + Math.abs(ng - cg) + Math.abs(nb - cb);
          const rangeW = diff < colorThreshold ? 4 : diff < colorThreshold * 2 ? 1 : 0;
          const w = spatialWeights[k + 2] * rangeW;
          if (w > 0) { sumR += nr * w; sumG += ng * w; sumB += nb * w; sumW += w; }
        }
        if (sumW > 0) {
          src[centerIdx] = Math.round(sumR / sumW);
          src[centerIdx + 1] = Math.round(sumG / sumW);
          src[centerIdx + 2] = Math.round(sumB / sumW);
          src[centerIdx + 3] = ca;
        } else {
          src[centerIdx] = cr; src[centerIdx + 1] = cg; src[centerIdx + 2] = cb; src[centerIdx + 3] = ca;
        }
      }
    }
  }
  return src;
}

function markConnectedBackground(rgba, width, height) {
  const total = width * height;
  const mask = new Uint8Array(total);
  const cornerCoords = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    [Math.min(4, width - 1), Math.min(4, height - 1)],
    [Math.max(0, width - 5), Math.min(4, height - 1)],
    [Math.min(4, width - 1), Math.max(0, height - 5)],
    [Math.max(0, width - 5), Math.max(0, height - 5)]
  ];

  const samples = [];
  for (const [cx, cy] of cornerCoords) {
    const idx = (cy * width + cx) * 4;
    if (rgba[idx + 3] < 24) continue;
    const r = rgba[idx], g = rgba[idx + 1], b = rgba[idx + 2];
    const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
    const luma = rgbToLuma(r, g, b);
    const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
    if ((luma >= 182 && sat <= 0.34) || (luma <= 38 && sat <= 0.35)) {
      samples.push([r, g, b]);
    }
  }
  if (samples.length < 2) return mask;

  const avg = samples.reduce((acc, s) => [acc[0] + s[0], acc[1] + s[1], acc[2] + s[2]], [0, 0, 0])
    .map((v) => Math.round(v / samples.length));
  const avgLuma = rgbToLuma(avg[0], avg[1], avg[2]);
  const isDarkBg = avgLuma <= 45;

  const isBgPixel = (pixelIndex) => {
    const idx = pixelIndex * 4;
    if (rgba[idx + 3] < 24) return true;
    const r = rgba[idx], g = rgba[idx + 1], b = rgba[idx + 2];
    const luma = rgbToLuma(r, g, b);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const dist = Math.abs(r - avg[0]) + Math.abs(g - avg[1]) + Math.abs(b - avg[2]);
    if (isDarkBg) return luma <= 42 && chroma <= 32 && dist <= 90;
    return luma >= 180 && chroma <= 58 && dist <= 115;
  };

  const queue = new Int32Array(total);
  let head = 0, tail = 0;
  const tryPush = (pIdx) => {
    if (mask[pIdx] === 0 && isBgPixel(pIdx)) {
      mask[pIdx] = 1;
      queue[tail++] = pIdx;
    }
  };

  for (let x = 0; x < width; x++) {
    tryPush(x);
    tryPush((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    tryPush(y * width);
    tryPush(y * width + (width - 1));
  }

  while (head < tail) {
    const curr = queue[head++];
    const x = curr % width;
    const y = (curr - x) / width;
    if (x > 0) tryPush(curr - 1);
    if (x < width - 1) tryPush(curr + 1);
    if (y > 0) tryPush(curr - width);
    if (y < height - 1) tryPush(curr + width);
  }
  return mask;
}

function computeLuminanceAndEdges(rgba, bgMask, width, height) {
  const total = width * height;
  const luma = new Uint8Array(total);
  const grad = new Uint16Array(total);
  const localDiff = new Int16Array(total);

  for (let i = 0; i < total; i++) {
    if (bgMask[i] || rgba[i * 4 + 3] < 24) {
      luma[i] = 255;
    } else {
      luma[i] = rgbToLuma(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
    }
  }

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const i = row + x;
      if (bgMask[i]) continue;
      const tl = luma[i - width - 1], tc = luma[i - width], tr = luma[i - width + 1];
      const ml = luma[i - 1], mr = luma[i + 1];
      const bl = luma[i + width - 1], bc = luma[i + width], br = luma[i + width + 1];
      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      grad[i] = Math.min(1020, Math.round(Math.hypot(gx, gy)));
    }
  }

  const radius = 4;
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (bgMask[i]) continue;
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const mean = (
        luma[y0 * width + x0] + luma[y0 * width + x1] +
        luma[y1 * width + x0] + luma[y1 * width + x1] +
        luma[y0 * width + x] + luma[y1 * width + x] +
        luma[y * width + x0] + luma[y * width + x1]
      ) >> 3;
      localDiff[i] = mean - luma[i];
    }
  }
  return { luma, grad, localDiff };
}

function applyChromaticModeFilter(labels, width, height, numPlates, passes = 2) {
  let src = new Int8Array(labels);
  let dst = new Int8Array(labels);
  const counts = new Int32Array(numPlates);

  for (let pass = 0; pass < passes; pass++) {
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const i = y * width + x;
        const c = src[i];
        if (c <= 0) {
          dst[i] = c;
          continue;
        }
        counts.fill(0);
        for (let dy = -2; dy <= 2; dy++) {
          const rOff = (y + dy) * width;
          for (let dx = -2; dx <= 2; dx++) {
            const v = src[rOff + x + dx];
            if (v > 0 && v < numPlates) counts[v]++;
          }
        }
        let best = c;
        let bestCount = counts[c];
        for (let k = 1; k < numPlates; k++) {
          if (counts[k] > bestCount) {
            bestCount = counts[k];
            best = k;
          }
        }
        dst[i] = best;
      }
    }
    src.set(dst);
  }
  return src;
}

function removeSmallIslands(labels, width, height, numPlates) {
  const total = width * height;
  const out = new Int8Array(labels);
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const component = [];
  const neighborCounts = new Int32Array(numPlates);

  for (let i = 0; i < total; i++) {
    const targetClass = out[i];
    if (targetClass < 0 || visited[i]) continue;
    const minArea = targetClass === 0 ? 5 : 15;
    let head = 0, tail = 0;
    visited[i] = 1;
    queue[tail++] = i;
    component.length = 0;
    neighborCounts.fill(0);

    while (head < tail) {
      const curr = queue[head++];
      component.push(curr);
      const x = curr % width;
      const y = (curr - x) / width;
      const neighbors = [];
      if (x > 0) neighbors.push(curr - 1);
      if (x < width - 1) neighbors.push(curr + 1);
      if (y > 0) neighbors.push(curr - width);
      if (y < height - 1) neighbors.push(curr + width);
      for (let k = 0; k < neighbors.length; k++) {
        const nIdx = neighbors[k];
        const nClass = out[nIdx];
        if (nClass === targetClass) {
          if (!visited[nIdx]) {
            visited[nIdx] = 1;
            queue[tail++] = nIdx;
          }
        } else if (nClass >= 0 && nClass < numPlates) {
          neighborCounts[nClass]++;
        }
      }
    }

    if (component.length < minArea) {
      let replacement = -1, bestN = 0;
      for (let c = 1; c < numPlates; c++) {
        if (c !== targetClass && neighborCounts[c] > bestN) {
          bestN = neighborCounts[c];
          replacement = c;
        }
      }
      if (targetClass === 0 && bestN < 3) replacement = -1;
      for (let k = 0; k < component.length; k++) {
        out[component[k]] = replacement;
      }
    }
  }
  return out;
}

/**
 * 根据原图实际色相分布，动态从 8 种传统矿物色候选池中遴选出最匹配的 (K-1) 块彩色版（支持 3~6 版自适应或指定版数）
 */
function selectDynamicMineralPlates(smoothed, bgMask, initialLabels, LStar, aStar, bStar, total, options = {}) {
  const candidateLabs = MINERAL_CANDIDATE_POOL.map((p) => rgbToLab(p.rgb[0], p.rgb[1], p.rgb[2]));
  const hitCounts = new Int32Array(MINERAL_CANDIDATE_POOL.length);
  const sumR = new Float64Array(MINERAL_CANDIDATE_POOL.length);
  const sumG = new Float64Array(MINERAL_CANDIDATE_POOL.length);
  const sumB = new Float64Array(MINERAL_CANDIDATE_POOL.length);
  let chromaticTotal = 0;

  let meanA = 0, meanB = 0, meanL = 0;
  for (let i = 0; i < total; i++) {
    if (initialLabels[i] === 99) {
      meanL += LStar[i];
      meanA += aStar[i];
      meanB += bStar[i];
      chromaticTotal++;
    }
  }
  if (chromaticTotal > 0) {
    meanL /= chromaticTotal;
    meanA /= chromaticTotal;
    meanB /= chromaticTotal;
  }

  // 第一遍扫描：统计每个候选矿物色在原图中的真实像素占比与平均 RGB
  // 对实拍图暗淡色温做色相优先校正：优先激活佛山年画四大核心正色（万年红0、石黄1、石绿2、靛青3）与丹柿橙4/赭石5，抑制低饱和阴影误入紫6/粉7
  for (let i = 0; i < total; i++) {
    if (initialLabels[i] !== 99) continue;
    const L = LStar[i], a = aStar[i], b = bStar[i];
    const chroma = Math.hypot(a, b);
    let bestIdx = 0;
    let bestDist = Infinity;

    const px = i * 4;
    const r = smoothed[px], g = smoothed[px + 1], bRgb = smoothed[px + 2];

    // 强色相直通规则：保护实拍室内光下的朱砂红、鱼鳞金黄、石绿、靛青不被灰褐阴影稀释，同时严防人物暖肤色误入红版
    if (a >= 20 && a > b * 0.65 && (r - g) >= 62 && g < 148) {
      bestIdx = (b >= 24 && L >= 54 && g >= 75) ? 4 : 0; // 丹柿橙 vs 万年红
    } else if (b >= 11 && L >= 56 && a > -10 && a < 20) {
      bestIdx = 1; // 室内光下的金色/米黄鱼鳞甲与暖亮面 -> 石黄版
    } else if (a <= -5 && b >= -12) {
      bestIdx = 2; // 翠绿/青绿战袍 -> 石绿版
    } else if (b <= -5) {
      bestIdx = 3; // 靛蓝飘带/剑鞘 -> 靛青蓝版
    } else if (chroma < 28 && L < 66) {
      bestIdx = 5; // 暗木雕祥云/古铜色/肤色暗影 -> 赭石棕版
    } else {
      for (let c = 0; c < MINERAL_CANDIDATE_POOL.length; c++) {
        const [pL, pa, pb] = candidateLabs[c];
        let dist = Math.hypot((L - pL) * 0.65, a - pa, b - pb);
        if (c === 0 && a > meanA + 8 && (r - g) >= 62 && g < 145) dist -= 12; // 万年红
        if ((c === 0 || c === 4) && g >= 132 && bRgb >= 92 && (r - g) <= 74) dist += 42; // 抑制暖肤色落入红/橙版
        if (c === 1 && b > meanB + 4 && L >= meanL - 6) dist -= 14; // 石黄
        if (c === 2 && a < meanA - 3 && b >= -10) dist -= 12; // 石绿
        if (c === 3 && b < -4) dist -= 12; // 靛青蓝
        if ((c === 6 || c === 7) && chroma < 30) dist += 28; // 惩罚低饱和像素落入瑞紫/桃粉
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = c;
        }
      }
    }
    hitCounts[bestIdx]++;
    sumR[bestIdx] += r;
    sumG[bestIdx] += g;
    sumB[bestIdx] += bRgb;
  }

  // 解析目标版数：支持 'auto' (3~6版自适应) 或具体数字 3..6
  const rawMax = options.maxColors;
  const isAuto = rawMax === 'auto' || rawMax === 0 || rawMax === '0' || !rawMax;
  const requestedTotalPlates = isAuto ? 0 : clamp(Number(rawMax) || 4, 3, 6);

  const ranked = MINERAL_CANDIDATE_POOL.map((meta, idx) => ({
    idx,
    meta,
    count: hitCounts[idx],
    ratio: chromaticTotal > 0 ? hitCounts[idx] / chromaticTotal : 0
  })).sort((a, b) => b.count - a.count);

  let selectedChromatic = [];
  if (isAuto) {
    // 智能自适应：挑选占比 >= 1.5% 的所有显著色相版，保证总版数在 3~6 之间（即彩色版 2~5 块）
    selectedChromatic = ranked.filter((item) => item.ratio >= 0.015 && item.count >= 16).slice(0, 5);
    if (selectedChromatic.length < 3) {
      selectedChromatic = ranked.slice(0, 3);
    }
  } else {
    const targetChromaticCount = requestedTotalPlates - 1;
    selectedChromatic = ranked.slice(0, targetChromaticCount);
  }

  // 按照传统套印工序排序（红 -> 橙 -> 黄 -> 粉 -> 绿 -> 蓝 -> 紫 -> 赭）
  const orderPriority = { red: 1, orange: 2, yellow: 3, pink: 4, green: 5, blue: 6, purple: 7, brown: 8 };
  selectedChromatic.sort((a, b) => (orderPriority[a.meta.key] || 9) - (orderPriority[b.meta.key] || 9));

  // 将原图聚类均值与传统矿物标准色按 30% : 70% 融合，既有原图真实色相，又保持年画矿物质感
  const activePlates = [Object.assign({ order: 1 }, INK_KEY_PLATE)];
  selectedChromatic.forEach((item, idx) => {
    const cIdx = item.idx;
    const baseRgb = item.meta.rgb;
    let finalRgb = baseRgb.slice();
    if (hitCounts[cIdx] > 30) {
      const avgR = sumR[cIdx] / hitCounts[cIdx];
      const avgG = sumG[cIdx] / hitCounts[cIdx];
      const avgB = sumB[cIdx] / hitCounts[cIdx];
      finalRgb = [
        Math.round(baseRgb[0] * 0.72 + avgR * 0.28),
        Math.round(baseRgb[1] * 0.72 + avgG * 0.28),
        Math.round(baseRgb[2] * 0.72 + avgB * 0.28)
      ];
    }
    activePlates.push(Object.assign({}, item.meta, {
      order: idx + 2,
      rgb: finalRgb,
      hex: rgbToHex(finalRgb[0], finalRgb[1], finalRgb[2])
    }));
  });

  return activePlates;
}

function ensureNoEmptyDynamicPlates(labels, activePlates, luma, LStar, aStar, bStar, bgMask, total) {
  const numPlates = activePlates.length;
  const counts = new Int32Array(numPlates);
  let activeTotal = 0;
  for (let i = 0; i < total; i++) {
    const c = labels[i];
    if (c >= 0 && c < numPlates) {
      counts[c]++;
      activeTotal++;
    }
  }
  if (activeTotal < 64) return labels;
  const minRequired = Math.max(36, Math.round(activeTotal * 0.015));

  if (counts[0] < minRequired) {
    const candidates = [];
    for (let i = 0; i < total; i++) {
      if (!bgMask[i] && labels[i] > 0) candidates.push(i);
    }
    candidates.sort((i, j) => luma[i] - luma[j]);
    const take = Math.min(candidates.length, Math.max(minRequired, Math.round(activeTotal * 0.05)));
    for (let k = 0; k < take; k++) labels[candidates[k]] = 0;
  }

  for (let c = 1; c < numPlates; c++) {
    counts.fill(0);
    for (let i = 0; i < total; i++) {
      if (labels[i] >= 0 && labels[i] < numPlates) counts[labels[i]]++;
    }
    if (counts[c] >= minRequired) continue;

    const targetLab = rgbToLab(activePlates[c].rgb[0], activePlates[c].rgb[1], activePlates[c].rgb[2]);
    const candidates = [];
    for (let i = 0; i < total; i++) {
      if (!bgMask[i] && labels[i] > 0 && labels[i] !== c && counts[labels[i]] > minRequired * 2) {
        const dLab = Math.hypot((LStar[i] - targetLab[0]) * 0.6, aStar[i] - targetLab[1], bStar[i] - targetLab[2]);
        if (dLab <= 30) {
          candidates.push({ idx: i, dist: dLab });
        }
      }
    }
    if (candidates.length === 0) continue;
    candidates.sort((a, b) => a.dist - b.dist);
    const take = Math.min(candidates.length, Math.max(minRequired, Math.round(activeTotal * 0.025)));
    for (let k = 0; k < take; k++) labels[candidates[k].idx] = c;
  }

  return labels;
}

/**
 * 零依赖 Pure-JS PNG 编码器（RFC 2083 + RFC 1950 Uncompressed DEFLATE）
 */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes, start, length) {
  let c = 0xffffffff;
  const end = start + length;
  for (let i = start; i < end; i++) {
    c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeUint32BE(buf, offset, val) {
  buf[offset] = (val >>> 24) & 0xff;
  buf[offset + 1] = (val >>> 16) & 0xff;
  buf[offset + 2] = (val >>> 8) & 0xff;
  buf[offset + 3] = val & 0xff;
}

function encodeRgbaToPngArrayBuffer(rgba, width, height) {
  const rowStride = width * 4 + 1;
  const rawLen = rowStride * height;
  const maxBlock = 65535;
  const numBlocks = Math.ceil(rawLen / maxBlock) || 1;
  const zlibLen = 2 + rawLen + numBlocks * 5 + 4;
  const totalPngLen = 8 + (12 + 13) + (12 + zlibLen) + 12;

  const out = new Uint8Array(totalPngLen);
  let pos = 0;

  out.set([137, 80, 78, 71, 13, 10, 26, 10], pos);
  pos += 8;

  writeUint32BE(out, pos, 13);
  pos += 4;
  const ihdrStart = pos;
  out.set([73, 72, 68, 82], pos);
  pos += 4;
  writeUint32BE(out, pos, width);
  pos += 4;
  writeUint32BE(out, pos, height);
  pos += 4;
  out[pos++] = 8;
  out[pos++] = 6;
  out[pos++] = 0;
  out[pos++] = 0;
  out[pos++] = 0;
  writeUint32BE(out, pos, crc32(out, ihdrStart, 17));
  pos += 4;

  writeUint32BE(out, pos, zlibLen);
  pos += 4;
  const idatStart = pos;
  out.set([73, 68, 65, 84], pos);
  pos += 4;

  out[pos++] = 0x78;
  out[pos++] = 0x01;

  let s1 = 1, s2 = 0, remaining = rawLen, curY = 0, curRowPos = 0;
  for (let b = 0; b < numBlocks; b++) {
    const blockLen = Math.min(maxBlock, remaining);
    remaining -= blockLen;
    out[pos++] = remaining === 0 ? 1 : 0;
    out[pos++] = blockLen & 0xff;
    out[pos++] = (blockLen >>> 8) & 0xff;
    const nlen = (~blockLen) & 0xffff;
    out[pos++] = nlen & 0xff;
    out[pos++] = (nlen >>> 8) & 0xff;

    let written = 0;
    while (written < blockLen) {
      if (curRowPos === 0) {
        out[pos++] = 0;
        s2 = (s2 + s1) % 65521;
        curRowPos = 1;
        written++;
      } else {
        const rowAvail = rowStride - curRowPos;
        const chunkAvail = blockLen - written;
        const copyLen = Math.min(rowAvail, chunkAvail);
        const srcOffset = curY * width * 4 + (curRowPos - 1);
        for (let k = 0; k < copyLen; k++) {
          const byteVal = rgba[srcOffset + k];
          out[pos++] = byteVal;
          s1 += byteVal;
          if (s1 >= 65521) s1 -= 65521;
          s2 += s1;
          if (s2 >= 65521) s2 -= 65521;
        }
        curRowPos += copyLen;
        written += copyLen;
        if (curRowPos === rowStride) {
          curRowPos = 0;
          curY++;
        }
      }
    }
  }

  writeUint32BE(out, pos, ((s2 << 16) | s1) >>> 0);
  pos += 4;
  writeUint32BE(out, pos, crc32(out, idatStart, 4 + zlibLen));
  pos += 4;

  writeUint32BE(out, pos, 0);
  pos += 4;
  const iendStart = pos;
  out.set([73, 69, 78, 68], pos);
  pos += 4;
  writeUint32BE(out, pos, crc32(out, iendStart, 4));
  pos += 4;

  return out.buffer;
}

/**
 * 输入 RGBA 像素，执行动态 3~6 色木版形态学分色并返回各色版的 PNG ArrayBuffer 与元数据
 */
function separateRgbaToWoodblockPlates(rgba, width, height, options = {}) {
  const removeBackground = options.removeBackground !== false;
  const smoothed = applyEdgePreservingSmooth(rgba, width, height, 2);
  const bgMask = removeBackground
    ? markConnectedBackground(smoothed, width, height)
    : new Uint8Array(width * height);

  const total = width * height;
  for (let i = 0; i < total; i++) {
    if (smoothed[i * 4 + 3] < 28) bgMask[i] = 1;
  }

  const { luma, grad, localDiff } = computeLuminanceAndEdges(smoothed, bgMask, width, height);
  const LStar = new Float32Array(total);
  const aStar = new Float32Array(total);
  const bStar = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    if (bgMask[i]) continue;
    const idx = i * 4;
    const [L, a, b] = rgbToLab(smoothed[idx], smoothed[idx + 1], smoothed[idx + 2]);
    LStar[i] = L;
    aStar[i] = a;
    bStar[i] = b;
  }

  const labels = new Int8Array(total);
  labels.fill(-1);

  for (let i = 0; i < total; i++) {
    if (bgMask[i]) continue;
    const l = luma[i];
    const g = grad[i];
    const ld = localDiff[i];
    const L = LStar[i];
    const chroma = Math.hypot(aStar[i], bStar[i]);

    // 1. 提取松烟墨线骨版 (Class 0)：保留精细铠甲鱼鳞纹与五官墨线，同时收敛暗部木雕阴影占比
    if (
      l < 48 ||
      (l < 76 && chroma < 14) ||
      (g >= 34 && ld >= 6 && l < 185) ||
      (g >= 22 && ld >= 4 && l < 210) ||
      (ld >= 12 && l < 165)
    ) {
      labels[i] = 0;
      continue;
    }

    // 2. 宣纸底色与人物开相留白保护（将极亮高光、暖宣纸底色、以及人像面部/手部暖肉色统一归入宣纸自然开相留白）
    const px = i * 4;
    const r = smoothed[px], gr = smoothed[px + 1], bRgb = smoothed[px + 2];
    const a = aStar[i], bLab = bStar[i];
    const isPaperHighlight =
      (L >= 88 && chroma < 10 && bLab < 9) ||
      (l >= 234 && chroma < 12 && bLab < 10) ||
      (L >= 87.5 && Math.abs(a) <= 7.5 && bLab >= -4 && bLab <= 29 && r >= 232 && gr >= 214 && bRgb >= 170);
    const isPortraitSkinReserve =
      L >= 65 && L <= 91 &&
      a >= 6 && a <= 25.5 &&
      bLab >= 10 && bLab <= 38 &&
      r >= 198 && gr >= 142 && bRgb >= 104 &&
      r > gr && gr >= bRgb &&
      (r - gr) >= 22 && (r - gr) <= 78 &&
      (gr - bRgb) >= 8 && (gr - bRgb) <= 60;
    if (isPaperHighlight || isPortraitSkinReserve) {
      labels[i] = -1;
      continue;
    }

    labels[i] = 99; // 待分配彩色矿物版
  }

  // 3. 动态遴选 3~6 块矿物色版并分配像素
  const activePlates = selectDynamicMineralPlates(smoothed, bgMask, labels, LStar, aStar, bStar, total, options);
  const numPlates = activePlates.length;
  const plateLabs = activePlates.map((p) => rgbToLab(p.rgb[0], p.rgb[1], p.rgb[2]));

  for (let i = 0; i < total; i++) {
    if (labels[i] !== 99) continue;
    const px = i * 4;
    const r = smoothed[px], gr = smoothed[px + 1], bRgb = smoothed[px + 2];
    const L = LStar[i], a = aStar[i], b = bStar[i];
    const chroma = Math.hypot(a, b);
    let bestClass = 1;
    let bestScore = Infinity;
    for (let c = 1; c < numPlates; c++) {
      const key = activePlates[c].key;
      const [pL, pa, pb] = plateLabs[c];
      let dist = Math.hypot((L - pL) * 0.58, a - pa, b - pb);
      if (key === 'red' && a >= 20 && a > b * 0.65 && (r - gr) >= 62 && gr < 148) dist -= 18;
      if ((key === 'red' || key === 'orange') && gr >= 132 && bRgb >= 92 && (r - gr) <= 74) dist += 44;
      if (key === 'yellow' && b >= 10 && L >= 56 && a > -10 && a < 20) dist -= 22;
      if (key === 'green' && a <= -4 && b >= -12) dist -= 18;
      if (key === 'blue' && b <= -4) dist -= 18;
      if (key === 'brown' && chroma < 26 && L < 66) dist -= 14;
      if ((key === 'purple' || key === 'pink') && chroma < 28) dist += 25;
      if (dist < bestScore) {
        bestScore = dist;
        bestClass = c;
      }
    }
    labels[i] = bestClass;
  }

  // 采用保细节 1-pass 众数滤波，避免吃掉门神鱼鳞甲与云纹细线
  const modeFiltered = applyChromaticModeFilter(labels, width, height, numPlates, 1);
  for (let i = 0; i < total; i++) {
    if (labels[i] > 0 && modeFiltered[i] > 0) labels[i] = modeFiltered[i];
  }

  let cleanedLabels = removeSmallIslands(labels, width, height, numPlates);
  cleanedLabels = ensureNoEmptyDynamicPlates(cleanedLabels, activePlates, luma, LStar, aStar, bStar, bgMask, total);

  const quantizedRgba = new Uint8Array(total * 4);
  for (let i = 0; i < total; i++) {
    const outIdx = i * 4;
    const c = cleanedLabels[i];
    if (c < 0) {
      quantizedRgba[outIdx] = 243;
      quantizedRgba[outIdx + 1] = 228;
      quantizedRgba[outIdx + 2] = 196;
      quantizedRgba[outIdx + 3] = 255;
    } else {
      const rgb = activePlates[c].rgb;
      quantizedRgba[outIdx] = rgb[0];
      quantizedRgba[outIdx + 1] = rgb[1];
      quantizedRgba[outIdx + 2] = rgb[2];
      quantizedRgba[outIdx + 3] = 255;
    }
  }

  const layers = [];
  let totalForeground = 0;
  for (let i = 0; i < total; i++) {
    if (cleanedLabels[i] >= 0) totalForeground++;
  }

/**
 * 根据分色标签矩阵生成「打磨梨木 + 无色区凹陷铲底刀痕 + 有色区阳刻凸起受墨」的雕版实物图 (RGBA)
 * 自动按 maxBoardDim (默认 240px) 采样输出，兼顾细腻阳刻刀痕与极小文件体积
 */
function generateCarvedWoodblockPngBuffer(cleanedLabels, plateIndex, plateRgb, srcWidth, srcHeight, maxBoardDim = 240) {
  const scale = Math.min(1, maxBoardDim / Math.max(srcWidth, srcHeight));
  const width = Math.max(64, Math.round(srcWidth * scale));
  const height = Math.max(64, Math.round(srcHeight * scale));
  const total = width * height;

  // 若进行了尺寸缩比，先映射缩放后的标签矩阵
  let labels = cleanedLabels;
  if (width !== srcWidth || height !== srcHeight) {
    labels = new Int8Array(total);
    for (let y = 0; y < height; y++) {
      const sy = Math.min(srcHeight - 1, Math.floor(y / scale));
      const sRow = sy * srcWidth;
      const dRow = y * width;
      for (let x = 0; x < width; x++) {
        const sx = Math.min(srcWidth - 1, Math.floor(x / scale));
        labels[dRow + x] = cleanedLabels[sRow + sx];
      }
    }
  }

  const out = new Uint8Array(total * 4);
  const bevel = Math.max(4, Math.round(Math.min(width, height) * 0.026));
  const cornerR = Math.max(5, Math.round(Math.min(width, height) * 0.035));

  const xWave = new Float32Array(width);
  const xGouge = new Float32Array(width);
  const xSheen = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    xWave[x] = Math.sin(x * 0.032) * 4.2 + Math.cos(x * 0.082) * 1.8;
    xGouge[x] = Math.sin(x * 0.22) * 2.6;
    xSheen[x] = Math.cos((x / width - 0.34) * 2.1) * 13;
  }

  const ySheen = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    ySheen[y] = Math.cos((y / height - 0.30) * 2.1);
  }

  const fiberLen = (height + 32) * 4;
  const fiberLut = new Float32Array(fiberLen);
  for (let k = 0; k < fiberLen; k++) {
    const yf = k * 0.25;
    fiberLut[k] = Math.sin(yf * 0.65) * 6.8 + Math.cos(yf * 1.65) * 3.2 + Math.sin(yf * 0.16) * 8.4;
  }

  const pr = plateRgb[0], pg = plateRgb[1], pb = plateRgb[2];
  const isInkPlate = plateIndex === 0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    const ys = ySheen[y];
    const inTopBevel = y < bevel;
    const inBottomBevel = y >= height - bevel;

    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const outIdx = idx * 4;

      let dx = 0, dy = 0;
      if (x < cornerR && y < cornerR) { dx = cornerR - x; dy = cornerR - y; }
      else if (x >= width - cornerR && y < cornerR) { dx = x - (width - 1 - cornerR); dy = cornerR - y; }
      else if (x < cornerR && y >= height - cornerR) { dx = cornerR - x; dy = y - (height - 1 - cornerR); }
      else if (x >= width - cornerR && y >= height - cornerR) { dx = x - (width - 1 - cornerR); dy = y - (height - 1 - cornerR); }
      if (dx > 0 && dy > 0 && (dx * dx + dy * dy > cornerR * cornerR)) {
        out[outIdx + 3] = 0;
        continue;
      }

      const lutIdx = clamp(Math.round((y + 12 + xWave[x]) * 4), 0, fiberLen - 1);
      const grain = fiberLut[lutIdx];
      const sheen = xSheen[x] * ys;
      const inLeftBevel = x < bevel;
      const inRightBevel = x >= width - bevel;

      if (inTopBevel || inBottomBevel || inLeftBevel || inRightBevel) {
        let bevelLight = 0;
        if (inTopBevel || inLeftBevel) bevelLight += 24;
        if (inBottomBevel || inRightBevel) bevelLight -= 36;
        if ((inTopBevel && inLeftBevel)) bevelLight += 10;
        if ((inBottomBevel && inRightBevel)) bevelLight -= 12;

        const dEdge = Math.min(x, width - 1 - x, y, height - 1 - y);
        const rimLine = dEdge === bevel - 1 ? -18 : 0;
        const delta = grain * 0.72 + sheen * 0.65 + bevelLight + rimLine;

        out[outIdx] = clamp(Math.round(114 + delta), 24, 235);
        out[outIdx + 1] = clamp(Math.round(66 + delta * 0.68), 14, 185);
        out[outIdx + 2] = clamp(Math.round(35 + delta * 0.45), 8, 130);
        out[outIdx + 3] = 255;
        continue;
      }

      const raised = labels[idx] === plateIndex;
      if (raised) {
        const tlRecessed = (labels[idx - width - 1] !== plateIndex)
          || (labels[idx - width] !== plateIndex)
          || (labels[idx - 1] !== plateIndex);
        const brRecessed = (labels[idx + width + 1] !== plateIndex)
          || (labels[idx + width] !== plateIndex)
          || (labels[idx + 1] !== plateIndex);

        const woodMod = grain * 0.55 + sheen * 0.42;
        let r = pr * 0.86 + (118 + woodMod) * 0.14 + woodMod * 0.45;
        let g = pg * 0.86 + (70 + woodMod * 0.7) * 0.14 + woodMod * 0.38;
        let b = pb * 0.86 + (38 + woodMod * 0.45) * 0.14 + woodMod * 0.30;

        if (tlRecessed) {
          if (isInkPlate) {
            r += 62; g += 40; b += 22;
          } else {
            r += 38; g += 32; b += 24;
          }
        } else if (brRecessed) {
          r -= 20; g -= 18; b -= 14;
        }

        out[outIdx] = clamp(Math.round(r), 12, 252);
        out[outIdx + 1] = clamp(Math.round(g), 10, 248);
        out[outIdx + 2] = clamp(Math.round(b), 8, 240);
        out[outIdx + 3] = 255;
        continue;
      }

      const gougeRipple = Math.sin((y + (x >> 2)) * 0.72 + xGouge[x]) * 4.8;
      let recessDelta = grain * 0.88 + sheen * 0.55 + gougeRipple;

      if (x <= bevel + 2 || y <= bevel + 2) {
        recessDelta -= (x === bevel || y === bevel) ? 34 : 18;
      } else if (x >= width - bevel - 2 || y >= height - bevel - 2) {
        recessDelta += 12;
      }

      const ul1 = (labels[idx - width - 1] === plateIndex)
        || (labels[idx - width] === plateIndex)
        || (labels[idx - 1] === plateIndex);
      const ul2 = !ul1 && x > bevel + 1 && y > bevel + 1 && (
        labels[idx - width * 2 - 2] === plateIndex ||
        labels[idx - width * 2 - 1] === plateIndex ||
        labels[idx - width - 2] === plateIndex
      );
      const ul3 = !ul1 && !ul2 && x > bevel + 2 && y > bevel + 2 && (
        labels[idx - width * 3 - 3] === plateIndex ||
        labels[idx - width * 2 - 3] === plateIndex ||
        labels[idx - width * 3 - 2] === plateIndex
      );

      const dr1 = (labels[idx + width + 1] === plateIndex)
        || (labels[idx + width] === plateIndex)
        || (labels[idx + 1] === plateIndex);
      const dr2 = !dr1 && x < width - bevel - 2 && y < height - bevel - 2 && (
        labels[idx + width * 2 + 2] === plateIndex
      );

      if (ul1) recessDelta -= 44;
      else if (ul2) recessDelta -= 28;
      else if (ul3) recessDelta -= 14;
      else if (dr1) recessDelta += 22;
      else if (dr2) recessDelta += 10;

      out[outIdx] = clamp(Math.round(86 + recessDelta), 18, 210);
      out[outIdx + 1] = clamp(Math.round(48 + recessDelta * 0.64), 10, 155);
      out[outIdx + 2] = clamp(Math.round(25 + recessDelta * 0.42), 5, 105);
      out[outIdx + 3] = 255;
    }
  }

  return encodeRgbaToPngArrayBuffer(out, width, height);
}

  for (let c = 0; c < numPlates; c++) {
    const meta = activePlates[c];
    const layerRgba = new Uint8Array(total * 4);
    let pixelCount = 0;
    for (let i = 0; i < total; i++) {
      if (cleanedLabels[i] !== c) continue;
      const outIdx = i * 4;
      layerRgba[outIdx] = meta.rgb[0];
      layerRgba[outIdx + 1] = meta.rgb[1];
      layerRgba[outIdx + 2] = meta.rgb[2];
      layerRgba[outIdx + 3] = 255;
      pixelCount++;
    }

    layers.push({
      index: c,
      key: meta.key,
      color: meta.hex,
      name: meta.name,
      label: meta.label,
      shortName: meta.shortName,
      textColor: meta.textColor,
      material: meta.material,
      purpose: meta.purpose,
      desc: meta.desc,
      order: c + 1,
      rgb: meta.rgb,
      pixelCount,
      coverageRatio: totalForeground > 0 ? Number((pixelCount / totalForeground).toFixed(4)) : 0,
      pngArrayBuffer: encodeRgbaToPngArrayBuffer(layerRgba, width, height),
      boardPngArrayBuffer: generateCarvedWoodblockPngBuffer(cleanedLabels, c, meta.rgb, width, height, 200)
    });
  }

  return {
    width,
    height,
    mode: 'photo',
    plateCount: numPlates,
    engineVersion: '2.1-dynamic-woodblock',
    quantizedPngArrayBuffer: encodeRgbaToPngArrayBuffer(quantizedRgba, width, height),
    layers
  };
}

module.exports = {
  INK_KEY_PLATE,
  MINERAL_CANDIDATE_POOL,
  FOSHAN_PALETTE_V2,
  encodeRgbaToPngArrayBuffer,
  separateRgbaToWoodblockPlates
};
