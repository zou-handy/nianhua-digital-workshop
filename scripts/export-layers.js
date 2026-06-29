const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const API_URL = process.env.SPLIT_API_URL || 'http://localhost:8000/api/split-colors';

const IMAGES = [
  { id: 'nianhua-demo', file: 'images/nianhua-demo.jpg', title: '佛山木版年画示例' },
  { id: 'longtou', file: 'images/longtou.jpg', title: '龙头年画' }
];

async function processImage(image) {
  console.log(`\n处理: ${image.title} (${image.file})`);

  const imgBuffer = fs.readFileSync(path.join(__dirname, '..', image.file));
  const base64 = 'data:image/jpeg;base64,' + imgBuffer.toString('base64');

  console.log('调用分色API...');
  const result = await callAPI(base64);

  if (!result || !result.layers) {
    console.error('API返回异常:', result);
    return null;
  }

  const outputDir = path.join(__dirname, '..', 'images', 'layers', image.id);
  fs.mkdirSync(outputDir, { recursive: true });

  const manifest = [];
  for (let i = 0; i < result.layers.length; i++) {
    const layer = result.layers[i];
    const dataUrl = layer.data || layer.base64 || '';
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const filePath = path.join(outputDir, `layer_${i}.png`);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    console.log(`  保存图层 ${i}: ${filePath}`);
    manifest.push({
      index: i,
      file: `images/layers/${image.id}/layer_${i}.png`,
      color: layer.color || '',
      label: layer.label || ('图层' + (i + 1))
    });
  }

  return { id: image.id, title: image.title, layers: manifest };
}

function callAPI(imageBase64) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ imageBase64, imageUrl: imageBase64 });
    const url = new URL(API_URL);
    const client = url.protocol === 'http:' ? http : https;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'http:' ? 80 : 443),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 120000
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('=== 分色图层预处理导出工具 ===\n');

  const allManifests = [];

  for (const image of IMAGES) {
    try {
      const manifest = await processImage(image);
      if (manifest) allManifests.push(manifest);
    } catch (err) {
      console.error(`处理 ${image.id} 失败:`, err.message);
    }
  }

  const manifestPath = path.join(__dirname, '..', 'images', 'layers', 'manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(allManifests, null, 2));
  console.log(`\n清单已保存: ${manifestPath}`);
  console.log('全部完成！');
}

main(); 