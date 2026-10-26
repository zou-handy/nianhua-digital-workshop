const CLOUD_BASE = 'cloud://cloud1-d7g47tfdyf7a14a31.636c-cloud1-d7g47tfdyf7a14a31-1448457900';

const MODELS = {
  house: `${CLOUD_BASE}/model/house.glb`,
  chman: `${CLOUD_BASE}/model/chman.glb`,
  aiGenerated: `${CLOUD_BASE}/model/ai-generated.glb`,
  advancedBlackBoard: `${CLOUD_BASE}/model/advanced-print/black-board.glb`,
  advancedRedBoard: `${CLOUD_BASE}/model/advanced-print/red-board.glb`,
  advancedYellowBoard: `${CLOUD_BASE}/model/advanced-print/yellow-board.glb`,
  advancedGreenBoard: `${CLOUD_BASE}/model/advanced-print/green-board.glb`,
  advancedSet1BlackBoard: `${CLOUD_BASE}/model/advanced-print/set-1/black-board-v2.glb`,
  advancedSet1RedBoard: `${CLOUD_BASE}/model/advanced-print/set-1/red-board.glb`,
  advancedSet1YellowBoard: `${CLOUD_BASE}/model/advanced-print/set-1/yellow-board.glb`,
  advancedSet1GreenBoard: `${CLOUD_BASE}/model/advanced-print/set-1/green-board.glb`,
  advancedSet2BlackBoard: `${CLOUD_BASE}/model/advanced-print/set-2/black-board-v2.glb`,
  advancedSet2RedBoard: `${CLOUD_BASE}/model/advanced-print/set-2/red-board.glb`,
  advancedSet2YellowBoard: `${CLOUD_BASE}/model/advanced-print/set-2/yellow-board.glb`,
  advancedSet2GreenBoard: `${CLOUD_BASE}/model/advanced-print/set-2/green-board.glb`
};

const VIDEOS = {
  making: `${CLOUD_BASE}/knowledge/nianhua-making.mp4`,
  story: `${CLOUD_BASE}/knowledge/nianhua-story.mp4`,
  openingWelcome: `${CLOUD_BASE}/knowledge/opening/opening-welcome-top-h264.mp4`
};

const IMAGES = {
  lightOnBoard: `${CLOUD_BASE}/knowledge/光影打在木板上.jpg`,
  baxian: `${CLOUD_BASE}/knowledge/八仙过海图.jpg`,
  swordDanceFront: `${CLOUD_BASE}/knowledge/双舞剑的木板正面图.jpg`,
  drying: `${CLOUD_BASE}/knowledge/craft-process/20260718/nianhua-drying.jpg`,
  boardDisplay: `${CLOUD_BASE}/knowledge/木板与年画的展示.jpg`,
  coloringCloseup: `${CLOUD_BASE}/knowledge/给木板上色的特写.jpg`,
  carvingHD: `${CLOUD_BASE}/knowledge/高清纪录片视角的木板刻画.jpg`
};

const TOOL_IMAGES = {
  fistKnife: `${CLOUD_BASE}/knowledge/tools/20260717/fist-knife.png`,
  curvedKnife: `${CLOUD_BASE}/knowledge/tools/20260717/curved-gouge.jpg`,
  triangleKnife: `${CLOUD_BASE}/knowledge/tools/20260717/triangle-knife.png`,
  clearingKnife: `${CLOUD_BASE}/knowledge/tools/20260717/clearing-scraper.jpg`,
  palmBrush: `${CLOUD_BASE}/knowledge/tools/20260717/palm-brush.png`,
  basswoodBoard: `${CLOUD_BASE}/knowledge/tools/20260717/basswood-board.jpg`,
  pearBoard: `${CLOUD_BASE}/knowledge/tools/20260717/pear-board.png`,
  woodBoards: `${CLOUD_BASE}/knowledge/tools/20260717/pear-board.png`
};

const CRAFT_PROCESS_IMAGES = {
  carving: `${CLOUD_BASE}/knowledge/craft-process/20260718/step-1-carving.jpg`,
  overprinting: `${CLOUD_BASE}/knowledge/craft-process/20260718/step-2-overprinting.jpg`,
  facePainting: `${CLOUD_BASE}/knowledge/craft-process/20260718/step-3-face-painting.jpg`,
  goldPainting: `${CLOUD_BASE}/knowledge/craft-process/20260718/step-4-gold-painting.jpg`,
  fillingRed: `${CLOUD_BASE}/knowledge/craft-process/20260718/step-5-filling-red.jpg`
};

const NIANHUA_GALLERY_IMAGES = {
  figure01: `${CLOUD_BASE}/knowledge/nianhua-gallery/figure-01.jpg`,
  figure02: `${CLOUD_BASE}/knowledge/nianhua-gallery/figure-02.jpg`,
  figure03: `${CLOUD_BASE}/knowledge/nianhua-gallery/figure-03.jpg`,
  figure04: `${CLOUD_BASE}/knowledge/nianhua-gallery/figure-04.jpg`,
  dryingHall01: `${CLOUD_BASE}/knowledge/nianhua-gallery/drying-hall-01.jpg`,
  dryingHall02: `${CLOUD_BASE}/knowledge/nianhua-gallery/drying-hall-02.jpg`
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
  backendLayer0: `${CLOUD_BASE}/knowledge/advanced-print/backend-split-20260717/layer_0.png`,
  backendLayer1: `${CLOUD_BASE}/knowledge/advanced-print/backend-split-20260717/layer_1.png`,
  backendLayer2: `${CLOUD_BASE}/knowledge/advanced-print/backend-split-20260717/layer_2.png`,
  backendLayer3: `${CLOUD_BASE}/knowledge/advanced-print/backend-split-clean-20260718/layer_3.png`
};

const ADVANCED_PRINT_SETS = [
  {
    id: 'set-1',
    name: '作品一',
    original: ADVANCED_PRINT_IMAGES.fullColor,
    boards: {
      black: ADVANCED_PRINT_IMAGES.blackBoard,
      red: ADVANCED_PRINT_IMAGES.redBoard,
      yellow: ADVANCED_PRINT_IMAGES.yellowBoard,
      green: ADVANCED_PRINT_IMAGES.greenBoard
    },
    layers: {
      black: `${CLOUD_BASE}/knowledge/advanced-print/backend-split-clean-20260718/layer_3.png`,
      red: `${CLOUD_BASE}/knowledge/advanced-print/backend-split/layer_0.png`,
      yellow: `${CLOUD_BASE}/knowledge/advanced-print/backend-split/layer_1.png`,
      green: `${CLOUD_BASE}/knowledge/advanced-print/backend-split/layer_2.png`
    },
    models: {
      black: MODELS.advancedSet1BlackBoard,
      red: MODELS.advancedSet1RedBoard,
      yellow: MODELS.advancedSet1YellowBoard,
      green: MODELS.advancedSet1GreenBoard
    }
  },
  {
    id: 'set-2',
    name: '作品二',
    original: `${CLOUD_BASE}/knowledge/advanced-print/set-2/original.jpg`,
    boards: {
      black: `${CLOUD_BASE}/knowledge/advanced-print/set-2/boards-v4/black-board.png`,
      red: `${CLOUD_BASE}/knowledge/advanced-print/set-2/boards-v3-transparent/red-board.png`,
      yellow: `${CLOUD_BASE}/knowledge/advanced-print/set-2/boards-v3-transparent/yellow-board.png`,
      green: `${CLOUD_BASE}/knowledge/advanced-print/set-2/boards-v3-transparent/green-board.png`
    },
    layers: {
      black: `${CLOUD_BASE}/knowledge/advanced-print/set-2/backend-split/layer_0.png`,
      red: `${CLOUD_BASE}/knowledge/advanced-print/set-2/backend-split/layer_1.png`,
      yellow: `${CLOUD_BASE}/knowledge/advanced-print/set-2/backend-split/layer_2.png`,
      green: `${CLOUD_BASE}/knowledge/advanced-print/set-2/backend-split/layer_3.png`
    },
    models: {
      black: MODELS.advancedSet2BlackBoard,
      red: MODELS.advancedSet2RedBoard,
      yellow: MODELS.advancedSet2YellowBoard,
      green: MODELS.advancedSet2GreenBoard
    }
  }
];

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
  CRAFT_PROCESS_IMAGES,
  NIANHUA_GALLERY_IMAGES,
  ADVANCED_PRINT_IMAGES,
  ADVANCED_PRINT_SETS,
  LAYERS,
  layerFileID
};
