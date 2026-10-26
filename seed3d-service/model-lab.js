const crypto = require('crypto');
const tcb = require('@cloudbase/node-sdk');

const MAX_MODEL_BYTES = 96 * 1024 * 1024;
const MAX_OPERATIONS = 24;
const STORAGE_ROOT = 'model-lab';

let runtimePromise;
let cloudApp;

function getCloudApp() {
  if (!cloudApp) {
    cloudApp = tcb.init({ env: process.env.CLOUDBASE_ENV_ID || tcb.SYMBOL_CURRENT_ENV });
  }
  return cloudApp;
}

async function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = Promise.all([
      import('@gltf-transform/core'),
      import('@gltf-transform/extensions'),
      import('@gltf-transform/functions'),
      import('draco3dgltf'),
      import('meshoptimizer'),
      import('sharp')
    ]).then(async ([core, extensions, functions, dracoModule, meshoptimizer, sharpModule]) => {
      const draco = dracoModule.default || dracoModule;
      const sharp = sharpModule.default || sharpModule;
      const [dracoDecoder, dracoEncoder] = await Promise.all([
        draco.createDecoderModule(),
        draco.createEncoderModule()
      ]);
      await Promise.all([
        meshoptimizer.MeshoptDecoder.ready,
        meshoptimizer.MeshoptEncoder.ready,
        meshoptimizer.MeshoptSimplifier.ready
      ]);
      const io = new core.NodeIO()
        .registerExtensions(extensions.ALL_EXTENSIONS)
        .registerDependencies({
          'draco3d.decoder': dracoDecoder,
          'draco3d.encoder': dracoEncoder,
          'meshopt.decoder': meshoptimizer.MeshoptDecoder,
          'meshopt.encoder': meshoptimizer.MeshoptEncoder
        });
      return { core, extensions, functions, meshoptimizer, sharp, io };
    });
  }
  return runtimePromise;
}

function safeId(value, fallback) {
  const cleaned = String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 80);
  return cleaned || fallback;
}

function makeVersionId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + crypto.randomBytes(4).toString('hex');
}

function assertHttpUrl(value) {
  const url = new URL(String(value));
  if (url.protocol !== 'https:') throw new Error('仅允许 HTTPS 模型地址');
  return url.toString();
}

async function readLimitedResponse(response) {
  if (!response.ok) throw new Error('模型下载失败 HTTP ' + response.status);
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_MODEL_BYTES) throw new Error('模型超过 96MB 处理限制');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_MODEL_BYTES) throw new Error('模型超过 96MB 处理限制');
  return buffer;
}

async function downloadSource(source) {
  const sourceText = String(source || '').trim();
  if (!sourceText) throw new Error('缺少 source');
  if (sourceText.startsWith('cloud://')) {
    const result = await getCloudApp().downloadFile({ fileID: sourceText });
    const buffer = Buffer.from(result.fileContent);
    if (buffer.length > MAX_MODEL_BYTES) throw new Error('模型超过 96MB 处理限制');
    return buffer;
  }
  return readLimitedResponse(await fetch(assertHttpUrl(sourceText)));
}

function assertGlb(buffer) {
  if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error('输入文件不是有效 GLB');
  }
}

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (typeof item === 'bigint') return Number(item);
    if (ArrayBuffer.isView(item)) return Array.from(item);
    return item;
  }));
}

function summarize(document, functions, byteLength) {
  const root = document.getRoot();
  const report = functions.inspect(document);
  return {
    byteLength,
    scenes: root.listScenes().length,
    nodes: root.listNodes().length,
    meshes: root.listMeshes().length,
    materials: root.listMaterials().length,
    textures: root.listTextures().length,
    animations: root.listAnimations().length,
    cameras: root.listCameras().length,
    extensionsUsed: root.listExtensionsUsed().map((extension) => extension.extensionName),
    details: jsonSafe(report)
  };
}

function findNamed(list, name, kind) {
  const target = list.find((item) => item.getName() === name);
  if (!target) throw new Error('找不到' + kind + ': ' + name);
  return target;
}

function toVector(value, length, fallback) {
  if (!Array.isArray(value) || value.length !== length) return fallback.slice();
  return value.map((item) => {
    const number = Number(item);
    if (!Number.isFinite(number)) throw new Error('向量参数必须是有限数字');
    return number;
  });
}

function eulerDegreesToQuaternion(value) {
  const angles = toVector(value, 3, [0, 0, 0]).map((item) => item * Math.PI / 180 / 2);
  const [x, y, z] = angles;
  const sx = Math.sin(x), cx = Math.cos(x);
  const sy = Math.sin(y), cy = Math.cos(y);
  const sz = Math.sin(z), cz = Math.cos(z);
  return [
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz
  ];
}

function selectNodes(document, operation) {
  const nodes = document.getRoot().listNodes();
  if (!operation.nodeName) return nodes;
  return [findNamed(nodes, String(operation.nodeName), '节点')];
}

async function replaceTexture(document, operation) {
  const material = findNamed(document.getRoot().listMaterials(), String(operation.materialName || ''), '材质');
  const image = await readLimitedResponse(await fetch(assertHttpUrl(operation.imageUrl)));
  const mimeType = String(operation.mimeType || 'image/png');
  if (!/^image\/(png|jpeg|webp|ktx2)$/.test(mimeType)) throw new Error('不支持的纹理 MIME 类型');
  const texture = document.createTexture(safeId(operation.textureName, 'xiaonian-texture'))
    .setImage(image)
    .setMimeType(mimeType);
  const slot = String(operation.slot || 'baseColor');
  if (slot === 'baseColor') material.setBaseColorTexture(texture);
  else if (slot === 'normal') material.setNormalTexture(texture);
  else if (slot === 'emissive') material.setEmissiveTexture(texture);
  else if (slot === 'occlusion') material.setOcclusionTexture(texture);
  else if (slot === 'metallicRoughness') material.setMetallicRoughnessTexture(texture);
  else throw new Error('不支持的纹理槽位: ' + slot);
}

async function applyOperation(document, operation, runtime) {
  const { functions, meshoptimizer, sharp } = runtime;
  const type = String(operation.type || '');
  const transformOptions = operation.options && typeof operation.options === 'object' ? operation.options : {};

  if (type === 'center') return document.transform(functions.center(transformOptions));
  if (type === 'dedup') return document.transform(functions.dedup(transformOptions));
  if (type === 'dequantize') return document.transform(functions.dequantize(transformOptions));
  if (type === 'flatten') return document.transform(functions.flatten(transformOptions));
  if (type === 'instance') return document.transform(functions.instance(transformOptions));
  if (type === 'join') return document.transform(functions.join(transformOptions));
  if (type === 'metalRough') return document.transform(functions.metalRough(transformOptions));
  if (type === 'normals') return document.transform(functions.normals(transformOptions));
  if (type === 'palette') return document.transform(functions.palette(transformOptions));
  if (type === 'partition') return document.transform(functions.partition(transformOptions));
  if (type === 'prune') return document.transform(functions.prune(transformOptions));
  if (type === 'quantize') return document.transform(functions.quantize(transformOptions));
  if (type === 'resample') return document.transform(functions.resample(transformOptions));
  if (type === 'sequence') return document.transform(functions.sequence(transformOptions));
  if (type === 'sparse') return document.transform(functions.sparse(transformOptions));
  if (type === 'tangents') return document.transform(functions.tangents(transformOptions));
  if (type === 'uninstance') return document.transform(functions.uninstance(transformOptions));
  if (type === 'unlit') return document.transform(functions.unlit(transformOptions));
  if (type === 'unpartition') return document.transform(functions.unpartition(transformOptions));
  if (type === 'unweld') return document.transform(functions.unweld(transformOptions));
  if (type === 'weld') return document.transform(functions.weld(transformOptions));
  if (type === 'reorder') return document.transform(functions.reorder({ encoder: meshoptimizer.MeshoptEncoder, ...transformOptions }));
  if (type === 'simplify') return document.transform(functions.simplify({ simplifier: meshoptimizer.MeshoptSimplifier, ratio: 0.8, error: 0.001, ...transformOptions }));
  if (type === 'meshopt') return document.transform(functions.meshopt({ encoder: meshoptimizer.MeshoptEncoder, ...transformOptions }));
  if (type === 'draco') return document.transform(functions.draco(transformOptions));
  if (type === 'textureCompress') {
    const targetFormat = String(transformOptions.targetFormat || 'webp');
    if (!['jpeg', 'png', 'webp', 'avif'].includes(targetFormat)) throw new Error('不支持的纹理输出格式');
    return document.transform(functions.textureCompress({ encoder: sharp, ...transformOptions, targetFormat }));
  }
  if (type === 'translate') {
    const translation = toVector(operation.value, 3, [0, 0, 0]);
    selectNodes(document, operation).forEach((node) => node.setTranslation(translation));
    return;
  }
  if (type === 'scale') {
    const scale = toVector(operation.value, 3, [1, 1, 1]);
    selectNodes(document, operation).forEach((node) => node.setScale(scale));
    return;
  }
  if (type === 'rotate') {
    const rotation = eulerDegreesToQuaternion(operation.value);
    selectNodes(document, operation).forEach((node) => node.setRotation(rotation));
    return;
  }
  if (type === 'renameNode') {
    findNamed(document.getRoot().listNodes(), String(operation.nodeName || ''), '节点').setName(String(operation.name || '').slice(0, 120));
    return;
  }
  if (type === 'removeNode') {
    findNamed(document.getRoot().listNodes(), String(operation.nodeName || ''), '节点').dispose();
    return;
  }
  if (type === 'removeAnimations') {
    document.getRoot().listAnimations().forEach((animation) => animation.dispose());
    return;
  }
  if (type === 'setMaterial') {
    const material = findNamed(document.getRoot().listMaterials(), String(operation.materialName || ''), '材质');
    if (operation.baseColorFactor) material.setBaseColorFactor(toVector(operation.baseColorFactor, 4, [1, 1, 1, 1]));
    if (operation.emissiveFactor) material.setEmissiveFactor(toVector(operation.emissiveFactor, 3, [0, 0, 0]));
    if (operation.metallicFactor !== undefined) material.setMetallicFactor(Number(operation.metallicFactor));
    if (operation.roughnessFactor !== undefined) material.setRoughnessFactor(Number(operation.roughnessFactor));
    if (operation.doubleSided !== undefined) material.setDoubleSided(Boolean(operation.doubleSided));
    if (operation.alphaMode) material.setAlphaMode(String(operation.alphaMode));
    return;
  }
  if (type === 'replaceTexture') return replaceTexture(document, operation);
  throw new Error('不支持的操作: ' + type);
}

function validateOperations(operations) {
  if (!Array.isArray(operations)) throw new Error('operations 必须是数组');
  if (operations.length > MAX_OPERATIONS) throw new Error('单次最多执行 24 个操作');
  operations.forEach((operation) => {
    if (!operation || typeof operation !== 'object' || !operation.type) throw new Error('操作格式无效');
  });
  return operations;
}

async function inspectModel(body) {
  const buffer = await downloadSource(body.source);
  assertGlb(buffer);
  const runtime = await getRuntime();
  const document = await runtime.io.readBinary(new Uint8Array(buffer));
  return { success: true, report: summarize(document, runtime.functions, buffer.length) };
}

async function processModelBuffer(sourceBuffer, operations) {
  assertGlb(sourceBuffer);
  const runtime = await getRuntime();
  const document = await runtime.io.readBinary(new Uint8Array(sourceBuffer));
  const before = summarize(document, runtime.functions, sourceBuffer.length);
  for (const operation of validateOperations(operations)) await applyOperation(document, operation, runtime);
  const output = Buffer.from(await runtime.io.writeBinary(document));
  assertGlb(output);
  return { output, before, after: summarize(document, runtime.functions, output.length) };
}

async function transformModel(body, identity) {
  const operations = validateOperations(body.operations);
  const sourceBuffer = await downloadSource(body.source);
  const processed = await processModelBuffer(sourceBuffer, operations);
  const { output, before, after } = processed;

  const ownerId = 'wx-' + crypto.createHash('sha256').update(String(identity)).digest('hex').slice(0, 20);
  const assetId = safeId(body.assetId, 'model');
  const versionId = body.requestId
    ? safeId(body.requestId, makeVersionId())
    : makeVersionId();
  const cloudPath = `${STORAGE_ROOT}/${ownerId}/${assetId}/versions/${versionId}.glb`;
  const upload = await getCloudApp().uploadFile({ cloudPath, fileContent: output });
  const manifest = {
    schemaVersion: 1,
    assetId,
    ownerId,
    versionId,
    parentVersionId: body.parentVersionId ? safeId(body.parentVersionId, '') : null,
    sourceHash: crypto.createHash('sha256').update(String(body.source)).digest('hex'),
    fileID: upload.fileID,
    createdAt: new Date().toISOString(),
    operations: jsonSafe(operations),
    before,
    after
  };
  const manifestUpload = await getCloudApp().uploadFile({
    cloudPath: `${STORAGE_ROOT}/${ownerId}/${assetId}/manifests/${versionId}.json`,
    fileContent: Buffer.from(JSON.stringify(manifest, null, 2))
  });
  return { success: true, version: { ...manifest, manifestFileID: manifestUpload.fileID } };
}

function getCapabilities() {
  return {
    schemaVersion: 1,
    limits: { maxModelBytes: MAX_MODEL_BYTES, maxOperations: MAX_OPERATIONS },
    immutableVersions: true,
    operations: {
      geometry: ['center', 'dedup', 'dequantize', 'flatten', 'instance', 'join', 'normals', 'partition', 'prune', 'quantize', 'reorder', 'resample', 'sequence', 'simplify', 'sparse', 'tangents', 'uninstance', 'unpartition', 'unweld', 'weld'],
      compression: ['draco', 'meshopt', 'textureCompress'],
      scene: ['translate', 'scale', 'rotate', 'renameNode', 'removeNode', 'removeAnimations'],
      material: ['metalRough', 'palette', 'setMaterial', 'replaceTexture', 'unlit']
    }
  };
}

module.exports = { getCapabilities, inspectModel, transformModel, processModelBuffer };
