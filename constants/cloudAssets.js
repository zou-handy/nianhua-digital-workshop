const CLOUD_BASE = 'cloud://cloud1-d7g47tfdyf7a14a31.636c-cloud1-d7g47tfdyf7a14a31-1448457900';

const MODELS = {
  house: `${CLOUD_BASE}/model/house.glb`,
  chman: `${CLOUD_BASE}/model/chman.glb`,
  aiGenerated: `${CLOUD_BASE}/model/ai-generated.glb`
};

const VIDEOS = {
  making: `${CLOUD_BASE}/knowledge/nianhua-making.mp4`,
  story: `${CLOUD_BASE}/knowledge/nianhua-story.mp4`
};

const IMAGES = {
  lightOnBoard: `${CLOUD_BASE}/knowledge/光影打在木板上.jpg`,
  baxian: `${CLOUD_BASE}/knowledge/八仙过海图.jpg`,
  swordDanceFront: `${CLOUD_BASE}/knowledge/双舞剑的木板正面图.jpg`,
  drying: `${CLOUD_BASE}/knowledge/年画晾晒图.jpg`,
  boardDisplay: `${CLOUD_BASE}/knowledge/木板与年画的展示.jpg`,
  coloringCloseup: `${CLOUD_BASE}/knowledge/给木板上色的特写.jpg`,
  carvingHD: `${CLOUD_BASE}/knowledge/高清纪录片视角的木板刻画.jpg`
};

const TOOL_IMAGES = {
  fistKnife: `${CLOUD_BASE}/knowledge/tools/fist-knife.png`,
  curvedKnife: `${CLOUD_BASE}/knowledge/tools/curved-gouge.jpg`,
  triangleKnife: `${CLOUD_BASE}/knowledge/tools/triangle-knife.jpg`,
  clearingKnife: `${CLOUD_BASE}/knowledge/tools/clearing-scraper.jpg`,
  palmBrush: `${CLOUD_BASE}/knowledge/tools/palm-brush.jpg`,
  woodBoards: `${CLOUD_BASE}/knowledge/tools/pear-basswood-boards.jpg`
};

const ADVANCED_PRINT_IMAGES = {
  fullColor: `${CLOUD_BASE}/knowledge/advanced-print/general-full-color.jpg`,
  blackLine: `${CLOUD_BASE}/knowledge/advanced-print/general-black-line.jpg`,
  blackBoard: `${CLOUD_BASE}/knowledge/advanced-print/black-board.png`,
  redLayer: `${CLOUD_BASE}/knowledge/advanced-print/red-layer.jpg`,
  redBoard: `${CLOUD_BASE}/knowledge/advanced-print/red-board.png`,
  yellowLayer: `${CLOUD_BASE}/knowledge/advanced-print/yellow-layer.jpg`,
  yellowBoard: `${CLOUD_BASE}/knowledge/advanced-print/yellow-board.png`,
  greenLayer: `${CLOUD_BASE}/knowledge/advanced-print/green-layer.jpg`,
  greenBoard: `${CLOUD_BASE}/knowledge/advanced-print/green-board.png`,
  backendLayer0: `${CLOUD_BASE}/knowledge/advanced-print/backend-split/layer_0.png`,
  backendLayer1: `${CLOUD_BASE}/knowledge/advanced-print/backend-split/layer_1.png`,
  backendLayer2: `${CLOUD_BASE}/knowledge/advanced-print/backend-split/layer_2.png`,
  backendLayer3: `${CLOUD_BASE}/knowledge/advanced-print/backend-split/layer_3.png`
};

const LAYERS = {
  manifest: `${CLOUD_BASE}/layers/manifest.json`,
  logoDemoOriginal: `${CLOUD_BASE}/layers/logo-demo/original.jpg`,
  logoDemoCleanBlack: `${CLOUD_BASE}/layers/logo-demo-clean/black.png`,
  logoDemoCleanRed: `${CLOUD_BASE}/layers/logo-demo-clean/red.png`,
  logoDemoCleanYellow: `${CLOUD_BASE}/layers/logo-demo-clean/yellow.png`,
  logoDemoCleanDeepYellow: `${CLOUD_BASE}/layers/logo-demo-clean/deep_yellow.png`,
  logoDemoCleanBlue: `${CLOUD_BASE}/layers/logo-demo-clean/blue.png`
};

const layerFileID = (galleryId, index) => `${CLOUD_BASE}/layers/${galleryId}/layer_${index}.png`;

module.exports = {
  MODELS,
  VIDEOS,
  IMAGES,
  TOOL_IMAGES,
  ADVANCED_PRINT_IMAGES,
  LAYERS,
  layerFileID
};
