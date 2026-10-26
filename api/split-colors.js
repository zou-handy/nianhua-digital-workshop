const sharp = require('sharp');

const DEFAULT_MAX_COLORS = 5;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageUrl } = req.body;
    const removeBackground = req.body.removeBackground !== false;
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl' });

    let imageBuffer;
    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      const fetch = globalThis.fetch || (await import('node-fetch')).default;
      const response = await fetch(imageUrl);
      imageBuffer = Buffer.from(await response.arrayBuffer());
    }

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const { width, height } = metadata;
    const rawPixels = await image.ensureAlpha().raw().toBuffer();

    if (removeBackground) {
      removeConnectedBackground(rawPixels, width, height);
    }

    const detectedColors = detectMainColors(rawPixels, width, height);
    const mainColors = detectedColors.slice(0, DEFAULT_MAX_COLORS);

    if (mainColors.length < 2) {
      return res.status(400).json({
        success: false,
        error: '图片颜色太少，无法进行有效分色。请选择色彩更丰富的图片。'
      });
    }

    const pixelAssignment = new Int8Array(width * height).fill(-1);

    for (let i = 0; i < width * height; i++) {
      const offset = i * 4;
      const r = rawPixels[offset], g = rawPixels[offset + 1], b = rawPixels[offset + 2], a = rawPixels[offset + 3];
      if (a <= 10 || isNearWhite(r, g, b)) continue;

      let minDist = Infinity;
      let bestLayer = -1;

      for (let j = 0; j < mainColors.length; j++) {
        const dist = Math.pow(r - mainColors[j].r, 2) +
                     Math.pow(g - mainColors[j].g, 2) +
                     Math.pow(b - mainColors[j].b, 2);
        if (dist < minDist) {
          minDist = dist;
          bestLayer = j;
        }
      }

      if (bestLayer >= 0) {
        pixelAssignment[i] = bestLayer;
      }
    }

    const results = [];
    for (let layerIndex = 0; layerIndex < mainColors.length; layerIndex++) {
      const mainColor = mainColors[layerIndex];
      const layerPixels = Buffer.alloc(width * height * 4);
      let pixelCount = 0;

      for (let i = 0; i < width * height; i++) {
        if (pixelAssignment[i] === layerIndex) {
          const offset = i * 4;
          layerPixels[offset] = rawPixels[offset];
          layerPixels[offset + 1] = rawPixels[offset + 1];
          layerPixels[offset + 2] = rawPixels[offset + 2];
          layerPixels[offset + 3] = 255;
          pixelCount++;
        }
      }
      const pngBuffer = await sharp(layerPixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
      results.push({
        name: 'color_' + (layerIndex + 1),
        label: getColorLabel(mainColor.r, mainColor.g, mainColor.b, layerIndex),
        color: rgbToHex(mainColor.r, mainColor.g, mainColor.b),
        pixelCount,
        data: 'data:image/png;base64,' + pngBuffer.toString('base64')
      });
    }

    res.status(200).json({ success: true, width, height, layers: results });
  } catch (err) {
    console.error('分色处理失败:', err);
    res.status(500).json({ error: '分色处理失败: ' + err.message });
  }
};

function detectMainColors(rawPixels, width, height) {
  const totalPixels = width * height;
  const minPixelCount = Math.max(1, Math.floor(totalPixels * 0.008));
  const colorMap = new Map();

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const r = rawPixels[offset], g = rawPixels[offset + 1], b = rawPixels[offset + 2], a = rawPixels[offset + 3];
    if (a <= 10 || isNearWhite(r, g, b)) continue;

    const quantized = quantizeColor(r, g, b);
    const key = quantized.join(',');
    const existing = colorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorMap.set(key, {
        key,
        r: quantized[0],
        g: quantized[1],
        b: quantized[2],
        count: 1
      });
    }
  }

  const sortedColors = Array.from(colorMap.values()).sort((a, b) => b.count - a.count);
  const filteredColors = sortedColors.filter((color) => color.count >= minPixelCount);
  const mergedColors = mergeCloseColors(filteredColors);

  mergedColors.sort((a, b) => b.count - a.count);

  return mergedColors;
}

function quantizeColor(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);

  if (s < 0.15) {
    return [Math.round(l * 255), Math.round(l * 255), Math.round(l * 255)];
  }

  const hBucket = Math.floor(h / 30) * 30 + 15;
  const sBucket = s < 0.5 ? 0.35 : 0.75;
  const lBucket = l < 0.33 ? 0.2 : (l < 0.66 ? 0.5 : 0.8);

  return hslToRgb(hBucket, sBucket, lBucket);
}

function mergeCloseColors(colors) {
  const merged = [];
  const used = new Set();

  for (let i = 0; i < colors.length; i++) {
    if (used.has(i)) continue;
    let current = { ...colors[i] };

    for (let j = i + 1; j < colors.length; j++) {
      if (used.has(j)) continue;

      if (shouldMerge(current, colors[j])) {
        current = mergeColorPair(current, colors[j]);
        used.add(j);
      }
    }

    merged.push(current);
  }

  return merged;
}

function shouldMerge(colorA, colorB) {
  const [hA, sA, lA] = rgbToHsl(colorA.r, colorA.g, colorA.b);
  const [hB, sB, lB] = rgbToHsl(colorB.r, colorB.g, colorB.b);

  const perceptualDistance = deltaE76(rgbToLab(colorA.r, colorA.g, colorA.b), rgbToLab(colorB.r, colorB.g, colorB.b));
  if (perceptualDistance <= 22) return true;

  if (lA < 0.3 && lB < 0.3 && perceptualDistance <= 30) return true;

  if (sA < 0.15 && sB < 0.15) return Math.abs(lA - lB) < 0.24;
  if ((sA < 0.15) !== (sB < 0.15)) return false;

  let hDiff = Math.abs(hA - hB);
  if (hDiff > 180) hDiff = 360 - hDiff;

  const bothCool = hA >= 80 && hA <= 240 && hB >= 80 && hB <= 240;
  if (hDiff > (bothCool ? 42 : 28)) return false;

  if (Math.abs(lA - lB) > 0.25) return false;

  if (Math.abs(sA - sB) > 0.35) return false;

  return true;
}

function mergeColorPair(colorA, colorB) {
  const total = colorA.count + colorB.count;
  return {
    r: Math.round((colorA.r * colorA.count + colorB.r * colorB.count) / total),
    g: Math.round((colorA.g * colorA.count + colorB.g * colorB.count) / total),
    b: Math.round((colorA.b * colorA.count + colorB.b * colorB.count) / total),
    count: total
  };
}

function rgbToLab(r, g, b) {
  const linear = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  const x = (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047;
  const y = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const z = (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883;
  const pivot = (value) => value > 0.008856 ? Math.cbrt(value) : (7.787 * value) + (16 / 116);
  const fx = pivot(x), fy = pivot(y), fz = pivot(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE76(labA, labB) {
  const dl = labA[0] - labB[0];
  const da = labA[1] - labB[1];
  const db = labA[2] - labB[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

function hslToRgb(h, s, l) {
  h = h / 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function isNearWhite(r, g, b) {
  return r > 220 && g > 220 && b > 220;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function getColorLabel(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
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

function removeConnectedBackground(rawPixels, width, height) {
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const enqueue = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * width + x;
    if (visited[index] || !isBackgroundPixel(rawPixels, index)) return;
    visited[index] = 1;
    queue[tail++] = index;
  };

  enqueue(0, 0);
  enqueue(width - 1, 0);
  enqueue(0, height - 1);
  enqueue(width - 1, height - 1);

  while (head < tail) {
    const index = queue[head++];
    rawPixels[index * 4 + 3] = 0;

    const x = index % width;
    const y = Math.floor(index / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }
}

function isBackgroundPixel(rawPixels, index) {
  const offset = index * 4;
  const r = rawPixels[offset], g = rawPixels[offset + 1], b = rawPixels[offset + 2], a = rawPixels[offset + 3];
  if (a <= 10) return true;

  const brightness = (r + g + b) / 3;
  const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  return brightness > 200 && saturation < 0.2;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return [h, s, l];
}
