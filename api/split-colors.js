const sharp = require('sharp');
const { processImageBuffer } = require('../cloudfunctions/splitColors/index.js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const imageUrl = body.imageUrl || body.imageBase64 || body.image;
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl' });

    let rawBuffer;
    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      rawBuffer = Buffer.from(base64Data, 'base64');
    } else {
      const fetchFn = globalThis.fetch || (await import('node-fetch')).default;
      const response = await fetchFn(imageUrl);
      rawBuffer = Buffer.from(await response.arrayBuffer());
    }

    // 统一转为 PNG Buffer 后送入 v2 形态学木版分色引擎
    const pngBuffer = await sharp(rawBuffer).png().toBuffer();
    const coreResult = processImageBuffer(pngBuffer, {
      imageHint: 'image/png',
      removeBackground: body.removeBackground !== false,
      flattenPalette: body.flattenPalette !== false,
      maxColors: body.maxColors || body.colorCount || 4,
      photoMode: body.photoMode || 'auto',
      maxDimension: body.maxDimension || 960
    });

    const results = coreResult.layers.map((layer, index) => ({
      key: layer.key,
      name: 'color_' + (index + 1),
      label: layer.label,
      shortName: layer.shortName,
      material: layer.material,
      purpose: layer.purpose,
      color: layer.color,
      pixelCount: layer.pixelCount,
      coverageRatio: layer.coverageRatio,
      data: 'data:image/png;base64,' + layer.pngBuffer.toString('base64')
    }));

    res.status(200).json({
      success: true,
      engineVersion: '2.0-woodblock-morphology',
      mode: coreResult.mode,
      width: coreResult.width,
      height: coreResult.height,
      quantizedBase64: 'data:image/png;base64,' + coreResult.quantizedPngBuffer.toString('base64'),
      layers: results
    });
  } catch (err) {
    console.error('分色处理失败:', err);
    res.status(500).json({ error: '分色处理失败: ' + err.message });
  }
};
