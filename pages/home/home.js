const { IMAGES, VIDEOS, LAYERS, TOOL_IMAGES, ADVANCED_PRINT_IMAGES } = require('../../constants/cloudAssets');
const { resolveCloudURL } = require('../../utils/resolveCloudURL');

const ERA_DATA = [
  {
    year: '1736',
    title: '木版年画的黄金时代',
    desc: '佛山木版年画兴于明代永乐年间，至清代乾嘉时期达到鼎盛。彼时佛山与天津杨柳青、苏州桃花坞、山东潍坊并称中国四大年画产地。\n\n鼎盛时期，佛山经营年画的店铺多达两百余家，从业者数千人。年画题材涵盖门神、福禄寿全、戏曲故事、神话传说，以红丹、绿、黄、黑四色套印为特色，形成了浓烈喜庆的岭南风格。\n\n佛山年画的独特之处在于"万年红"底色——用红丹（铅丹）作底，经久不褪，寓意吉祥长久。这一工艺在全国年画中独树一帜。',
    image: IMAGES.baxian,
    images: [IMAGES.baxian, IMAGES.coloringCloseup],
    hasVideo: false,
    isLast: false
  },
  {
    year: '1912',
    title: '传统与现代的碰撞',
    desc: '民国时期，石印和胶版印刷技术传入中国，传统木版年画受到巨大冲击。佛山年画作坊从鼎盛时期的两百余家骤减至不足十家。\n\n然而，佛山年画的精髓并未消亡。其粗犷有力的刀法、浓烈饱满的色彩、吉祥美好的寓意，始终扎根于岭南民间文化的土壤中。每逢春节，家家户户仍要贴上一对门神，祈求新年平安。\n\n这一时期，部分年画艺人开始尝试将传统题材与时事结合，创作出反映社会变革的新式年画，展现了传统艺术的生命力与适应性。',
    image: IMAGES.carvingHD,
    images: [IMAGES.carvingHD, IMAGES.lightOnBoard],
    hasVideo: false,
    isLast: false
  },
  {
    year: '2006',
    title: '刀木之间的坚守',
    desc: '2006年，佛山木版年画入选首批国家级非物质文化遗产名录，标志着这项古老技艺获得了国家层面的认可与保护。\n\n一幅传统木版年画的诞生，需要经历雕版、调色、套印、开相（手绘面部）等数十道工序。雕版用的是棠梨木，刀具有十余种之多，每一刀都需要数十年功力的沉淀。\n\n如今，老一辈传承人仍在坚持手工技艺。冯炳棠、冯锦强父子是其中的代表——父亲守护传统，儿子探索创新，让年画在新时代找到新的表达方式。',
    image: IMAGES.boardDisplay,
    images: [IMAGES.boardDisplay, IMAGES.drying],
    hasVideo: true,
    isLast: false
  },
  {
    year: '2026',
    title: '当AI遇见年画',
    desc: '当三百年的刀木技艺遇上人工智能，会碰撞出怎样的火花？\n\n我们用3D建模重构年画的空间维度，用AI图像生成探索年画的无限可能，用交互动画让年画从纸面走进屏幕。\n\n这不是对传统的替代，而是一次跨越时空的对话。每一个AI生成的年画，都携带着三百年木版技艺的基因密码。\n\n传统不是用来封存的，而是用来重新想象的。',
    image: IMAGES.swordDanceFront,
    images: [IMAGES.swordDanceFront],
    hasVideo: false,
    isLast: true
  }
];

const LOGO_PRINT_STEPS = [
  {
    name: '墨线起稿',
    shortName: '黑',
    color: '#1a1a1a',
    textColor: '#ffffff',
    order: 1,
    material: '松烟墨',
    meaning: '定轮廓',
    desc: '先落黑线，像雕版的骨架，把图案的边界和节奏定住。',
    layers: [LAYERS.logoDemoCleanBlack]
  },
  {
    name: '万年红',
    shortName: '红',
    color: '#D42F2F',
    textColor: '#ffffff',
    order: 2,
    material: '红丹色',
    meaning: '铺喜气',
    desc: '红版只保留红色底面和衣甲色块，不再混入底部黄色文字。',
    layers: [LAYERS.logoDemoCleanRed]
  },
  {
    name: '石黄提亮',
    shortName: '黄',
    color: '#F2C94C',
    textColor: '#000000',
    order: 3,
    material: '石黄/藤黄',
    meaning: '提光泽',
    desc: '浅黄色负责面部、装饰和明亮色面，让画面从红底里跳出来。',
    layers: [LAYERS.logoDemoCleanYellow]
  },
  {
    name: '赭黄压色',
    shortName: '深黄',
    color: '#B0742E',
    textColor: '#ffffff',
    order: 4,
    material: '赭黄/木色',
    meaning: '补厚度',
    desc: '这张图没有绿色版，第四版改为深黄色，承接文字、边框和木纹的厚重色。',
    layers: [LAYERS.logoDemoCleanDeepYellow]
  },
  {
    name: '靛青收版',
    shortName: '蓝',
    color: '#2D5DA1',
    textColor: '#ffffff',
    order: 5,
    material: '靛蓝',
    meaning: '压层次',
    desc: '蓝版只保留蓝色与青蓝色块，黑色线稿已经分回墨线版。',
    layers: [LAYERS.logoDemoCleanBlue]
  }
];

const ADVANCED_PRINT_STEPS = [
  {
    name: '墨线木板',
    shortName: '黑',
    color: '#1A1A1A',
    textColor: '#ffffff',
    order: 1,
    material: '松烟墨',
    purpose: '线稿定位',
    boardImage: ADVANCED_PRINT_IMAGES.blackBoard,
    layerImage: ADVANCED_PRINT_IMAGES.backendLayer3,
    desc: '黑版负责人物外轮廓、眉眼和衣甲线条，是后续色版对位的基准。'
  },
  {
    name: '万年红木板',
    shortName: '红',
    color: '#D42F2F',
    textColor: '#ffffff',
    order: 2,
    material: '红丹色',
    purpose: '主色铺底',
    boardImage: ADVANCED_PRINT_IMAGES.redBoard,
    layerImage: ADVANCED_PRINT_IMAGES.backendLayer0,
    desc: '红版承担门神最醒目的气势，先把衣袍、甲片和喜庆色面压稳。'
  },
  {
    name: '石黄木板',
    shortName: '黄',
    color: '#F2C94C',
    textColor: '#1A0F08',
    order: 3,
    material: '石黄/藤黄',
    purpose: '提亮装饰',
    boardImage: ADVANCED_PRINT_IMAGES.yellowBoard,
    layerImage: ADVANCED_PRINT_IMAGES.backendLayer1,
    desc: '黄色版补出脸部、花纹和亮面，让红底上产生更清晰的层次。'
  },
  {
    name: '青绿木板',
    shortName: '绿',
    color: '#5396AC',
    textColor: '#ffffff',
    order: 4,
    material: '石青/石绿',
    purpose: '补色压层',
    boardImage: ADVANCED_PRINT_IMAGES.greenBoard,
    layerImage: ADVANCED_PRINT_IMAGES.backendLayer2,
    desc: '青绿色版来自后端分色结果，负责冷色衣甲和局部装饰，让四版叠加时保持同一画面比例和位置。'
  }
];

const CRAFT_STEPS = [
  {
    num: '壹',
    short: '起稿',
    title: '起稿定样',
    tool: '毛笔、宣纸、墨汁',
    image: IMAGES.lightOnBoard,
    desc: '画工先在宣纸上用墨线勾勒出图案轮廓，称为"粉本"。这是整个年画的基础，决定了最终成品的构图与神韵。',
    tip: '起稿讲究"意在笔先"，画工心中需先有成品的完整画面。'
  },
  {
    num: '贰',
    short: '刻版',
    title: '选板刻版',
    tool: '梨木板、椴木板、拳刀、清底刀',
    image: TOOL_IMAGES.woodBoards,
    desc: '雕版先看木性：梨木质密耐磨，适合细线和长期反复套印；椴木纹理较匀、下刀更顺，适合练习版和大色块。画稿反贴后，再用拳刀、三角刀、弯凿刀与清底刀分层刻出线面。',
    tip: '好版不是只看木头硬不硬，而是看纹理、含水率和刀路能不能稳定留住细线。'
  },
  {
    num: '叁',
    short: '套印',
    title: '五色套印',
    tool: '雕版、棕刷、宣纸',
    image: TOOL_IMAGES.palmBrush,
    desc: '棕刷用棕榈纤维制成，蘸色后在版面上反复扫匀，再把纸覆上压印。按"墨线→红丹→石黄→赭黄→靛青"逐层套印，每一色都要独立上刷，避免串色。',
    tip: '棕刷既要蓄色，也要把颜料铺薄铺匀；刷痕太重会糊线，太轻又会漏印。'
  },
  {
    num: '肆',
    short: '开相',
    title: '手绘开相',
    tool: '细笔、矿物颜料',
    image: IMAGES.boardDisplay,
    desc: '套印完成后，人物面部仍是一片空白。画工需用细笔逐张手绘眉眼、胡须和表情，称为"开相"。这一步赋予年画以灵魂。',
    tip: '开相师傅往往只画面部，一双手的功夫决定了人物的神韵。'
  },
  {
    num: '伍',
    short: '成画',
    title: '晾干成画',
    tool: '竹架、自然通风',
    image: IMAGES.drying,
    desc: '完成的年画需平铺或悬挂在竹架上自然晾干。色彩在空气中慢慢沉淀，纸张逐渐平整，最终呈现出浓郁厚重的传统质感。',
    tip: '佛山气候湿热，年画多在秋冬干燥时节制作，这是天时与手艺的配合。'
  }
];

const CHAPTERS = [
  { id: '启', name: '入门', subtitle: '佛山木版年画', volume: '卷一' },
  { id: '史', name: '溯源', subtitle: '三百年刀木薪传', volume: '卷二' },
  { id: '具', name: '器具', subtitle: '刀木之间的精度', volume: '卷三' },
  { id: '技', name: '工艺', subtitle: '一版年画的诞生', volume: '卷四' },
  { id: '版', name: '版台', subtitle: '分色木板交互', volume: '卷五' },
  { id: '典', name: '图鉴', subtitle: '经典年画卡牌', volume: '卷六' },
  { id: '考', name: '测验', subtitle: '检验你的探索', volume: '卷七' },
  { id: '览', name: '探索', subtitle: '更多体验入口', volume: '卷八' },
  { id: '传', name: '关于', subtitle: '年画薪传突击队', volume: '卷九' }
];

const TOOLS = [
  {
    name: '拳刀',
    short: '拳',
    purpose: '开线与主轮廓',
    desc: '拳刀是木版雕刻里最有力量感的刀具，握持时掌心包住刀柄，适合切出门神衣甲、兵器和外轮廓的主线。',
    detail: '下刀时靠手腕和掌根稳定推进，刀路要直而不僵。主轮廓一旦走偏，后面的细线和清底都会跟着变形。',
    image: TOOL_IMAGES.fistKnife,
    color: '#D42F2F',
    angle: '主刀 30°',
    weight: '约 220g'
  },
  {
    name: '弯凿刀',
    short: '弯',
    purpose: '转弯与弧线',
    desc: '弯凿刀用来处理圆转的线条和凹面，适合衣纹、云纹、飘带和人物胡须这类连续弧线。',
    detail: '弯口能顺着木纹转向，减少硬折角。遇到小半径弧线时，需要短刀路多次接续，线条才不会断气。',
    image: TOOL_IMAGES.curvedKnife,
    color: '#E6A817',
    angle: '弯口 45°',
    weight: '约 180g'
  },
  {
    name: '三角刀',
    short: '三',
    purpose: '细线与脉理',
    desc: '三角刀的刃口呈 V 形，负责细线、发丝、花叶脉络和衣纹暗线，是让画面有精神的细节刀。',
    detail: '同一条线常要先浅刻定位，再沿两侧修整。刀口太深会让线条发硬，太浅又容易在套印时糊掉。',
    image: TOOL_IMAGES.triangleKnife,
    color: '#F2C94C',
    angle: 'V 60°',
    weight: '约 120g'
  },
  {
    name: '清底刀',
    short: '清',
    purpose: '清底与刮平',
    desc: '清底刀也叫刮刀，用来把不需要着色的底面清掉，让图案线条和色块凸出来。它决定版面是否干净。',
    detail: '清底看似粗活，其实最怕伤到已经刻好的细线。底面要低而平，印刷时纸面才不会被多余木屑蹭脏。',
    image: TOOL_IMAGES.clearingKnife,
    color: '#8A5A2B',
    angle: '平口 0°',
    weight: '约 200g'
  },
  {
    name: '梨木板 / 椴木板',
    short: '木',
    purpose: '雕版材料',
    desc: '梨木板质地细密、耐磨，适合承载复杂线稿；椴木板较轻软、纹理均匀，适合大面积色版和教学练习。',
    detail: '真正能不能成版，还要看木材是否干透、纹理是否顺直。木板处理不好，后续套印会出现变形和跑版。',
    image: TOOL_IMAGES.woodBoards,
    color: '#2D5DA1',
    angle: '板材',
    weight: '视尺寸'
  },
  {
    name: '棕刷',
    short: '刷',
    purpose: '上色与扫纸',
    desc: '棕刷不是刀，却是套印阶段最关键的工具。棕榈纤维能吸附颜料，把颜色均匀扫到雕版凸起处。',
    detail: '每一种颜色最好单独用一把棕刷，避免红、黄、蓝相互污染。使用前浸软，刷色时要轻、匀、快。',
    image: TOOL_IMAGES.palmBrush,
    color: '#8B5A2B',
    angle: '刷宽 80mm',
    weight: '约 90g'
  }
];

function buildColorSteps(printedLayerCount, activeIndex) {
  return LOGO_PRINT_STEPS.map(function(step, index) {
    return {
      name: step.name,
      shortName: step.shortName,
      color: step.color,
      textColor: step.textColor,
      order: step.order,
      material: step.material,
      meaning: step.meaning,
      desc: step.desc,
      printed: index < printedLayerCount,
      active: index === activeIndex
    };
  });
}

function buildColorStepsFromSteps(printedSteps, activeIndex) {
  var printedSet = {};
  printedSteps.forEach(function(i) { printedSet[i] = true; });
  return LOGO_PRINT_STEPS.map(function(step, index) {
    return {
      name: step.name,
      shortName: step.shortName,
      color: step.color,
      textColor: step.textColor,
      order: step.order,
      material: step.material,
      meaning: step.meaning,
      desc: step.desc,
      printed: !!printedSet[index],
      active: index === activeIndex
    };
  });
}

function buildLogoPrintLayers(printedLayerCount) {
  const result = [];
  let zIndex = 1;

  LOGO_PRINT_STEPS.forEach(function(step, stepIndex) {
    step.layers.forEach(function(fileID, layerIndex) {
      result.push({
        id: stepIndex + '-' + layerIndex,
        fileID: fileID,
        color: step.color,
        stepIndex: stepIndex,
        visible: stepIndex < printedLayerCount,
        fresh: stepIndex === printedLayerCount - 1,
        zIndex: zIndex,
        delay: layerIndex * 80 + 'ms'
      });
      zIndex += 1;
    });
  });

  return result;
}

function buildLogoPrintLayersFromSteps(printedSteps) {
  var printedSet = {};
  printedSteps.forEach(function(i) { printedSet[i] = true; });
  var result = [];
  var zIndex = 1;

  LOGO_PRINT_STEPS.forEach(function(step, stepIndex) {
    step.layers.forEach(function(fileID, layerIndex) {
      result.push({
        id: stepIndex + '-' + layerIndex,
        fileID: fileID,
        color: step.color,
        stepIndex: stepIndex,
        visible: !!printedSet[stepIndex],
        fresh: false,
        zIndex: zIndex,
        delay: layerIndex * 80 + 'ms'
      });
      zIndex += 1;
    });
  });

  return result;
}

function buildPrintBlocks() {
  return LOGO_PRINT_STEPS.map(function(step) {
    return {
      name: step.name,
      shortName: step.shortName,
      color: step.color,
      textColor: step.textColor,
      order: step.order,
      material: step.material,
      meaning: step.meaning,
      desc: step.desc,
      printed: false,
      active: false
    };
  });
}

function buildAdvancedBlock(step, index, printedSet, activeIndex, placedIndex) {
  return {
    name: step.name,
    shortName: step.shortName,
    color: step.color,
    textColor: step.textColor,
    order: step.order,
    material: step.material,
    purpose: step.purpose,
    boardImage: step.boardImage,
    layerImage: step.layerImage,
    desc: step.desc,
    printed: !!printedSet[index],
    active: index === activeIndex,
    placed: index === placedIndex
  };
}

function buildAdvancedBlocks(printedSteps, activeIndex, placedIndex) {
  var printedSet = {};
  printedSteps.forEach(function(i) { printedSet[i] = true; });

  return ADVANCED_PRINT_STEPS.map(function(step, index) {
    return buildAdvancedBlock(step, index, printedSet, activeIndex, placedIndex);
  });
}

function buildAdvancedPlacedBlock(index, printedSteps) {
  if (index < 0 || index >= ADVANCED_PRINT_STEPS.length) return null;

  var printedSet = {};
  printedSteps.forEach(function(i) { printedSet[i] = true; });
  return buildAdvancedBlock(ADVANCED_PRINT_STEPS[index], index, printedSet, index, index);
}

function buildAdvancedPreviewLayers(printedSteps) {
  var printedSet = {};
  printedSteps.forEach(function(i) { printedSet[i] = true; });

  return ADVANCED_PRINT_STEPS.map(function(step, index) {
    return {
      id: 'advanced-' + index,
      layerImage: step.layerImage,
      color: step.color,
      visible: !!printedSet[index],
      zIndex: index + 1
    };
  });
}

const OPENING_PRINT_LAYERS = [
  {
    id: 'opening-ink',
    name: '墨线',
    shortName: '墨',
    color: '#1A1A1A',
    src: ADVANCED_PRINT_IMAGES.backendLayer3,
    delay: 260,
    zIndex: 4
  },
  {
    id: 'opening-red',
    name: '万年红',
    shortName: '红',
    color: '#D42F2F',
    src: ADVANCED_PRINT_IMAGES.backendLayer0,
    delay: 700,
    zIndex: 1
  },
  {
    id: 'opening-yellow',
    name: '石黄',
    shortName: '黄',
    color: '#F2C94C',
    src: ADVANCED_PRINT_IMAGES.backendLayer1,
    delay: 1140,
    zIndex: 2
  },
  {
    id: 'opening-green',
    name: '青绿',
    shortName: '青',
    color: '#5396AC',
    src: ADVANCED_PRINT_IMAGES.backendLayer2,
    delay: 1580,
    zIndex: 3
  }
];

Page({
  data: {
    IMAGES,
    VIDEOS,
    storyVideoUrl: '',
    openingLayers: OPENING_PRINT_LAYERS,
    openingPrintVisible: true,
    currentPage: 0,
    musicPlaying: false,
    musicTriggered: false,
    currentEra: -1,
    showEraDetail: false,
    eraDetail: {},

    // 章节卷宗
    chapters: CHAPTERS,
    chapterCount: CHAPTERS.length,

    // 刀具图鉴
    tools: TOOLS,
    toolActiveIndex: 0,
    toolDetailOpen: false,
    selectedTool: null,

    // 制作工艺
    craftSteps: CRAFT_STEPS,
    craftStepIndex: 0,

    // 五色套印 — 纸拖印刷游戏
    printBlocks: buildPrintBlocks(),
    printBlockCount: LOGO_PRINT_STEPS.length,
    currentBlockIndex: 0,
    activePrintBlock: {
      name: LOGO_PRINT_STEPS[0].name,
      shortName: LOGO_PRINT_STEPS[0].shortName,
      color: LOGO_PRINT_STEPS[0].color,
      textColor: LOGO_PRINT_STEPS[0].textColor,
      order: LOGO_PRINT_STEPS[0].order,
      material: LOGO_PRINT_STEPS[0].material,
      meaning: LOGO_PRINT_STEPS[0].meaning,
      desc: LOGO_PRINT_STEPS[0].desc,
      printed: false
    },
    printedSteps: [],
    colors: buildColorStepsFromSteps([], -1),
    logoPrintLayers: buildLogoPrintLayersFromSteps([]),
    printedLayerCount: 0,
    activeColor: -1,
    activePrintStep: null,
    paperDragOffset: 0,
    paperRotation: -4,
    isPaperDragging: false,
    isPaperPressing: false,
    isAnimating: false,
    animatingIndex: -1,

    // 高级版台 — 实际分色木板展示
    advancedBlocks: buildAdvancedBlocks([], 0, -1),
    advancedBlockCount: ADVANCED_PRINT_STEPS.length,
    advancedLastBlockIndex: ADVANCED_PRINT_STEPS.length - 1,
    advancedBlockIndex: 0,
    advancedActiveBlock: ADVANCED_PRINT_STEPS[0],
    advancedPlacedBlockIndex: -1,
    advancedPlacedBlock: null,
    advancedBoardMoving: false,
    advancedPaperArmed: false,
    advancedPaperDragging: false,
    advancedPaperSnap: false,
    advancedPaperBackVisible: false,
    advancedPaperDragX: 0,
    advancedPaperRotate: 0,
    advancedPrintedSteps: [],
    advancedPreviewLayers: buildAdvancedPreviewLayers([]),

    // 图鉴卡片
    cards: [
      {
        title: '门神·秦叔宝',
        category: '门神类',
        image: IMAGES.swordDanceFront,
        desc: '手持双锏的秦琼，与尉迟恭成对张贴于大门两侧，是佛山年画最经典的题材。',
        flipped: false
      },
      {
        title: '八仙贺寿',
        category: '吉庆类',
        image: IMAGES.baxian,
        desc: '八位仙人各持法器前来祝寿，寓意福寿绵长、吉祥如意。',
        flipped: false
      },
      {
        title: '梨木与椴木板',
        category: '材料类',
        image: TOOL_IMAGES.woodBoards,
        desc: '梨木细密耐磨，适合精细线版；椴木轻软均匀，适合练习和大色块。选板决定了刀路能走多稳。',
        flipped: false
      },
      {
        title: '棕刷上色',
        category: '工具类',
        image: TOOL_IMAGES.palmBrush,
        desc: '棕刷负责把颜料薄而均匀地铺到版面上。刷色不匀，套印就会出现漏色、糊线或串色。',
        flipped: false
      }
    ],

    // 视频号视频列表（非同主体：需填 feedToken + finderUserName）
    channelVideos: [
      {
        title: '佛山年画起源',
        desc: '三百年刀木薪传',
        feedId: '',
        feedToken: 'A1F9taYrIj',
        finderUserName: 'sphAlrwGhzSZbx0'
      },
      {
        title: '年画制作工艺',
        desc: '一版一色的坚守',
        feedId: '',
        feedToken: 'A6ZMc6QeYG',
        finderUserName: 'sphAlrwGhzSZbx0'
      }
    ],
    currentVideoIndex: 0,
    currentVideo: {
      title: '佛山年画起源',
      desc: '三百年刀木薪传',
      feedId: '',
      feedToken: 'A1F9taYrIj',
      finderUserName: 'sphAlrwGhzSZbx0'
    },
    videoPlaying: false,
    // 视频号与小程序不同主体，使用跳转模式
    // 同主体后改为 false 可启用 channel-video 内嵌
    useFallbackMode: true,

    // 知识测验
    quiz: [
      {
        question: '五色套印最先印哪种颜色？',
        options: ['红色', '黑色', '黄色', '深黄色'],
        answer: 1,
        explanation: '黑色墨线版最先印，勾勒轮廓，是画的骨架。'
      },
      {
        question: '入选国家级非遗是哪年？',
        options: ['2003', '2006', '2008', '2010'],
        answer: 1,
        explanation: '2006年入选首批国家级非物质文化遗产名录。'
      },
      {
        question: '雕版最常用什么木材？',
        options: ['松木', '梨木或枣木', '竹子', '樟木'],
        answer: 1,
        explanation: '梨木枣木质硬细腻纹理均匀，最适合精细雕刻。'
      }
    ],
    currentQuestion: 0,
    quizScore: 0,
    quizFinished: false,
    selectedOption: -1,
    showExplanation: false
  },

  onLoad() {
    this.bgMusic = wx.createInnerAudioContext();
    this.preloadToolImages();
    resolveCloudURL(VIDEOS.story).then((url) => {
      this.setData({ storyVideoUrl: url });
      if (this.bgMusic) {
        this.bgMusic.src = url;
      }
    }).catch((err) => {
      console.error('[首页] 背景音频临时链接获取失败:', err);
    });
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.25;
  },

  onUnload() {
    this.clearColorSequenceTimer();
    if (this._openingReplayTimer) {
      clearTimeout(this._openingReplayTimer);
      this._openingReplayTimer = null;
    }

    if (this._advancedBoardMoveTimer) {
      clearTimeout(this._advancedBoardMoveTimer);
      this._advancedBoardMoveTimer = null;
    }

    if (this.bgMusic) {
      this.bgMusic.destroy();
      this.bgMusic = null;
    }
  },

  onSwiperChange(e) {
    const page = e.detail.current;
    this.setData({ currentPage: page });

    if (!this.data.musicTriggered) {
      this.bgMusic.play();
      this.setData({ musicPlaying: true, musicTriggered: true });
    }
  },

  goToPage(e) {
    const page = parseInt(e.currentTarget.dataset.page, 10);
    this.setData({ currentPage: page });
  },

  enterExplore() {
    // 封面 CTA：直接进入下一屏（史）
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' });
    }
    if (!this.data.musicTriggered && this.bgMusic) {
      this.bgMusic.play();
      this.setData({ musicPlaying: true, musicTriggered: true });
    }
    this.setData({ currentPage: 1 });
  },

  replayOpeningPrint() {
    if (this._openingReplayTimer) {
      clearTimeout(this._openingReplayTimer);
      this._openingReplayTimer = null;
    }

    this.setData({ openingPrintVisible: false });
    this._openingReplayTimer = setTimeout(() => {
      this.setData({ openingPrintVisible: true });
      this._openingReplayTimer = null;
    }, 40);

    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' });
    }
  },

  toggleMusic() {
    if (this.data.musicPlaying) {
      this.bgMusic.pause();
      this.setData({ musicPlaying: false });
      return;
    }

    this.bgMusic.play();
    this.setData({ musicPlaying: true, musicTriggered: true });
  },

  // ── 溯源时间轴 ──

  onEraTap(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({
      currentEra: index,
      showEraDetail: true,
      eraDetail: ERA_DATA[index]
    });
  },

  closeEraDetail() {
    this.setData({ showEraDetail: false, currentEra: -1 });
  },

  // ── 刀具图鉴 ──

  preloadToolImages() {
    this.data.tools.forEach((tool, index) => {
      if (!tool || !tool.image) return;

      const source = tool.image.indexOf('cloud://') === 0
        ? resolveCloudURL(tool.image)
        : Promise.resolve(tool.image);

      source.then((url) => {
        const data = {};
        data['tools[' + index + '].displayImage'] = url;
        if (this.data.selectedTool && this.data.selectedTool.name === tool.name) {
          data.selectedTool = Object.assign({}, this.data.selectedTool, {
            displayImage: url
          });
        }
        this.setData(data);

        wx.getImageInfo({
          src: url,
          fail: (err) => {
            console.warn('[首页] 刀具图片预加载失败:', tool.name, err);
          }
        });
      }).catch((err) => {
        console.warn('[首页] 刀具图片临时链接获取失败:', tool.name, err);
      });
    });
  },

  selectTool(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({
      toolActiveIndex: index,
      selectedTool: this.data.tools[index] || TOOLS[index],
      toolDetailOpen: true
    });
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' });
    }
  },

  closeToolDetail() {
    this.setData({ toolDetailOpen: false });
  },

  switchActiveTool(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({
      toolActiveIndex: index,
      selectedTool: this.data.tools[index] || TOOLS[index]
    });
  },

  // ── 制作工艺 ──

  onCraftStepChange(e) {
    this.setData({ craftStepIndex: e.detail.current });
  },

  goToCraftStep(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({ craftStepIndex: index });
  },

  // ── 五色套印 · 纸拖印刷游戏 ──

  // 更新当前选中的木板信息
  updateActiveBlock(index) {
    var step = LOGO_PRINT_STEPS[index];
    var printedSteps = this.data.printedSteps;
    var printed = printedSteps.indexOf(index) > -1;
    this.setData({
      currentBlockIndex: index,
      activePrintBlock: {
        name: step.name,
        shortName: step.shortName,
        color: step.color,
        textColor: step.textColor,
        order: step.order,
        material: step.material,
        meaning: step.meaning,
        desc: step.desc,
        printed: printed
      },
      colors: buildColorStepsFromSteps(printedSteps, index),
      activeColor: index,
      activePrintStep: step
    });
  },

  // 选择木板
  selectPrintBlock(e) {
    if (this.data.isPaperPressing || this.data.isPaperDragging) return;
    var index = parseInt(e.currentTarget.dataset.index, 10);
    this.updateActiveBlock(index);
  },

  // 上一块木板
  prevPrintBlock() {
    if (this.data.isPaperPressing) return;
    var index = this.data.currentBlockIndex;
    if (index <= 0) return;
    this.updateActiveBlock(index - 1);
  },

  // 下一块木板
  nextPrintBlock() {
    if (this.data.isPaperPressing) return;
    var index = this.data.currentBlockIndex;
    if (index >= LOGO_PRINT_STEPS.length - 1) return;
    this.updateActiveBlock(index + 1);
  },

  // 循环切换木板
  cyclePrintBlock() {
    if (this.data.isPaperPressing) return;
    var index = this.data.currentBlockIndex;
    var next = index >= LOGO_PRINT_STEPS.length - 1 ? 0 : index + 1;
    this.updateActiveBlock(next);
  },

  // 纸张触摸开始
  onPaperTouchStart(e) {
    if (this.data.isPaperPressing || this.data.isAnimating) return;
    this.setData({
      isPaperDragging: true,
      paperDragOffset: 0
    });
    this._paperDragStartY = e.touches[0].clientY;
  },

  // 纸张拖动中
  onPaperTouchMove(e) {
    if (!this.data.isPaperDragging || this.data.isPaperPressing) return;
    var deltaY = e.touches[0].clientY - this._paperDragStartY;
    var clampedOffset = Math.max(0, Math.min(deltaY, 200));
    var rotation = -4 + (clampedOffset / 200) * 4;
    this.setData({
      paperDragOffset: clampedOffset,
      paperRotation: rotation
    });
  },

  // 纸张触摸结束
  onPaperTouchEnd(e) {
    if (!this.data.isPaperDragging || this.data.isPaperPressing) {
      this.setData({ isPaperDragging: false, paperDragOffset: 0, paperRotation: -4 });
      return;
    }

    var threshold = 100;
    if (this.data.paperDragOffset > threshold) {
      this.doPaperPrint();
    } else {
      this.setData({ paperDragOffset: 0, paperRotation: -4, isPaperDragging: false });
    }
  },

  // 执行印刷动画
  doPaperPrint() {
    var blockIndex = this.data.currentBlockIndex;
    var that = this;

    if (this.data.isAnimating || this.data.isPaperPressing) return;

    // 落版动画
    this.setData({
      isPaperPressing: true,
      isPaperDragging: false,
      paperDragOffset: 180,
      paperRotation: 0
    });

    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'medium' });
    }

    // 印刷音效模拟延迟
    setTimeout(function() {
      var printedSteps = that.data.printedSteps.length >= LOGO_PRINT_STEPS.length
        ? []
        : that.data.printedSteps.slice();
      if (printedSteps.indexOf(blockIndex) === -1) {
        printedSteps.push(blockIndex);
      }
      var printedLayerCount = printedSteps.length;

      // 重建图层
      var newLayers = buildLogoPrintLayersFromSteps(printedSteps);
      newLayers.forEach(function(layer) {
        if (layer.stepIndex === blockIndex) {
          layer.fresh = true;
        }
      });

      var step = LOGO_PRINT_STEPS[blockIndex];

      // 更新木板列表
      var blocks = that.data.printBlocks.map(function(b, i) {
        return {
          name: b.name,
          shortName: b.shortName,
          color: b.color,
          textColor: b.textColor,
          order: b.order,
          material: b.material,
          meaning: b.meaning,
          desc: b.desc,
          printed: printedSteps.indexOf(i) > -1,
          active: i === blockIndex
        };
      });

      that.setData({
        logoPrintLayers: newLayers,
        printedLayerCount: printedLayerCount,
        printedSteps: printedSteps,
        colors: buildColorStepsFromSteps(printedSteps, blockIndex),
        activeColor: blockIndex,
        activePrintStep: step,
        printBlocks: blocks,
        animatingIndex: blockIndex,
        activePrintBlock: {
          name: step.name,
          shortName: step.shortName,
          color: step.color,
          textColor: step.textColor,
          order: step.order,
          material: step.material,
          meaning: step.meaning,
          desc: step.desc,
          printed: true
        }
      });

      // 纸张回弹
      setTimeout(function() {
        that.setData({
          paperDragOffset: 0,
          paperRotation: -4,
          isPaperPressing: false
        });

        // 清除 fresh 标记
        var settledLayers = that.data.logoPrintLayers.map(function(l) {
          return {
            id: l.id,
            fileID: l.fileID,
            color: l.color,
            stepIndex: l.stepIndex,
            visible: l.visible,
            fresh: false,
            zIndex: l.zIndex,
            delay: l.delay
          };
        });
        that.setData({ logoPrintLayers: settledLayers });

        // 自动切换到下一个未印刷的木板
        var nextIndex = -1;
        for (var i = 0; i < blocks.length; i++) {
          if (!blocks[i].printed) {
            nextIndex = i;
            break;
          }
        }
        if (nextIndex > -1 && nextIndex !== blockIndex) {
          that.updateActiveBlock(nextIndex);
        }
      }, 600);
    }, 260);
  },

  // ── 高级版台 · 分色木板交互 ──

  updateAdvancedBlock(index) {
    var printedSteps = this.data.advancedPrintedSteps;
    var step = ADVANCED_PRINT_STEPS[index];
    var placedIndex = this.data.advancedPlacedBlockIndex;
    this.setData({
      advancedBlockIndex: index,
      advancedActiveBlock: {
        name: step.name,
        shortName: step.shortName,
        color: step.color,
        textColor: step.textColor,
        order: step.order,
        material: step.material,
        purpose: step.purpose,
        boardImage: step.boardImage,
        layerImage: step.layerImage,
        desc: step.desc,
        printed: printedSteps.indexOf(index) > -1,
        placed: index === placedIndex
      },
      advancedBlocks: buildAdvancedBlocks(printedSteps, index, placedIndex)
    });
  },

  selectAdvancedBlock(e) {
    var index = parseInt(e.currentTarget.dataset.index, 10);
    if (!Number.isFinite(index) || index < 0 || index >= ADVANCED_PRINT_STEPS.length) return;

    var printedSteps = this.data.advancedPrintedSteps;
    var placedBlock = buildAdvancedPlacedBlock(index, printedSteps);
    var that = this;

    if (this._advancedBoardMoveTimer) {
      clearTimeout(this._advancedBoardMoveTimer);
    }

    this.setData({
      advancedBlockIndex: index,
      advancedActiveBlock: placedBlock,
      advancedPlacedBlockIndex: index,
      advancedPlacedBlock: placedBlock,
      advancedBoardMoving: true,
      advancedPaperArmed: false,
      advancedPaperDragging: false,
      advancedPaperSnap: false,
      advancedPaperBackVisible: false,
      advancedPaperDragX: 0,
      advancedPaperRotate: 0,
      advancedBlocks: buildAdvancedBlocks(printedSteps, index, index)
    });

    this._advancedBoardMoveTimer = setTimeout(function() {
      that.setData({ advancedBoardMoving: false });
    }, 360);
  },

  prevAdvancedBlock() {
    var index = this.data.advancedBlockIndex;
    if (index <= 0) return;
    this.updateAdvancedBlock(index - 1);
  },

  nextAdvancedBlock() {
    var index = this.data.advancedBlockIndex;
    if (index >= ADVANCED_PRINT_STEPS.length - 1) return;
    this.updateAdvancedBlock(index + 1);
  },

  printAdvancedBlock() {
    var blockIndex = this.data.advancedPlacedBlockIndex;
    if (blockIndex < 0) return;

    var printedSteps = this.data.advancedPrintedSteps.slice();

    if (printedSteps.length >= ADVANCED_PRINT_STEPS.length && printedSteps.indexOf(blockIndex) > -1) {
      printedSteps = [];
    }

    if (printedSteps.indexOf(blockIndex) === -1) {
      printedSteps.push(blockIndex);
    }

    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' });
    }

    var step = ADVANCED_PRINT_STEPS[blockIndex];
    var placedBlock = buildAdvancedPlacedBlock(blockIndex, printedSteps);
    this.setData({
      advancedPrintedSteps: printedSteps,
      advancedPreviewLayers: buildAdvancedPreviewLayers(printedSteps),
      advancedBlocks: buildAdvancedBlocks(printedSteps, blockIndex, blockIndex),
      advancedBlockIndex: blockIndex,
      advancedActiveBlock: {
        name: step.name,
        shortName: step.shortName,
        color: step.color,
        textColor: step.textColor,
        order: step.order,
        material: step.material,
        purpose: step.purpose,
        boardImage: step.boardImage,
        layerImage: step.layerImage,
        desc: step.desc,
        printed: printedSteps.indexOf(blockIndex) > -1,
        placed: true
      },
      advancedPlacedBlock: placedBlock
    });
  },

  onAdvancedPaperTap() {
    var now = Date.now();
    if (this._advancedPaperLastTap && now - this._advancedPaperLastTap < 320) {
      if (this.data.advancedPlacedBlockIndex < 0) return;
      this.setData({
        advancedPaperArmed: true,
        advancedPaperSnap: false,
        advancedPaperBackVisible: false,
        advancedPaperDragX: 0,
        advancedPaperRotate: 0
      });
    }
    this._advancedPaperLastTap = now;
  },

  onAdvancedPaperTouchStart(e) {
    if (!e.touches || !e.touches.length) return;

    var now = Date.now();
    var isDoubleTouch = this._advancedPaperLastTouchStart && now - this._advancedPaperLastTouchStart < 320;
    this._advancedPaperLastTouchStart = now;

    if (isDoubleTouch && this.data.advancedPlacedBlockIndex > -1) {
      this.setData({
        advancedPaperArmed: true,
        advancedPaperSnap: false,
        advancedPaperBackVisible: false,
        advancedPaperDragX: 0,
        advancedPaperRotate: 0
      });
    }

    if (!this.data.advancedPaperArmed && !(isDoubleTouch && this.data.advancedPlacedBlockIndex > -1)) return;
    this._advancedPaperStartX = e.touches[0].clientX;
    this.setData({
      advancedPaperDragging: true,
      advancedPaperSnap: false
    });
  },

  onAdvancedPaperTouchMove(e) {
    if (!this.data.advancedPaperArmed || !this.data.advancedPaperDragging || !e.touches || !e.touches.length) return;

    var deltaX = e.touches[0].clientX - this._advancedPaperStartX;
    var dragX = Math.max(-76, Math.min(28, Math.round(deltaX * 0.72)));
    var fold = Math.max(0, Math.min(180, Math.round(-dragX * 2.4)));

    this.setData({
      advancedPaperDragX: dragX,
      advancedPaperRotate: -fold,
      advancedPaperBackVisible: fold >= 96
    });
  },

  onAdvancedPaperTouchEnd() {
    if (!this.data.advancedPaperArmed) return;

    var shouldPrint = this.data.advancedPlacedBlockIndex > -1 && this.data.advancedPaperDragX <= -64;
    var that = this;

    if (shouldPrint) {
      this.setData({
        advancedPaperDragging: false,
        advancedPaperSnap: true,
        advancedPaperBackVisible: true,
        advancedPaperDragX: -44,
        advancedPaperRotate: -180
      });
      this.printAdvancedBlock();

      setTimeout(function() {
        that.setData({
          advancedPaperArmed: false,
          advancedPaperSnap: false,
          advancedPaperBackVisible: false,
          advancedPaperDragX: 0,
          advancedPaperRotate: 0
        });
      }, 220);
      return;
    }

    this.setData({
      advancedPaperArmed: false,
      advancedPaperDragging: false,
      advancedPaperSnap: false,
      advancedPaperBackVisible: false,
      advancedPaperDragX: 0,
      advancedPaperRotate: 0
    });
  },

  // 兼容旧版自动演示
  playColorSequence() {
    if (this.data.isAnimating || this.data.isPaperDragging || this.data.isPaperPressing) return;

    this.clearColorSequenceTimer();
    this.setData({ isAnimating: true, animatingIndex: 0 });

    var that = this;
    var index = 0;

    function doStep() {
      if (index >= LOGO_PRINT_STEPS.length) {
        that.colorSequenceEndTimer = setTimeout(function() {
          that.setData({ isAnimating: false, animatingIndex: -1 });
          that.colorSequenceEndTimer = null;
        }, 500);
        return;
      }

      that.updateActiveBlock(index);

      // 模拟拖动印刷
      that.setData({ paperDragOffset: 180, paperRotation: 0, isPaperPressing: true });
      if (wx.vibrateShort) {
        wx.vibrateShort({ type: 'light' });
      }

      setTimeout(function() {
        var printedSteps = that.data.printedSteps.slice();
        if (printedSteps.indexOf(index) === -1) {
          printedSteps.push(printedSteps.length);
        }

        // 简化：顺序印刷
        var actualSteps = [];
        for (var j = 0; j <= index; j++) {
          actualSteps.push(j);
        }

        var newLayers = buildLogoPrintLayersFromSteps(actualSteps);
        newLayers.forEach(function(layer) {
          if (layer.stepIndex === index) {
            layer.fresh = true;
          }
        });

        var printedCount = actualSteps.length;
        that.setData({
          logoPrintLayers: newLayers,
          printedLayerCount: printedCount,
          printedSteps: actualSteps,
          colors: buildColorStepsFromSteps(actualSteps, index),
          activeColor: index,
          activePrintStep: LOGO_PRINT_STEPS[index],
          animatingIndex: index
        });

        setTimeout(function() {
          that.setData({ paperDragOffset: 0, paperRotation: -4, isPaperPressing: false });

          var settledLayers = that.data.logoPrintLayers.map(function(l) {
            return {
              id: l.id,
              fileID: l.fileID,
              color: l.color,
              stepIndex: l.stepIndex,
              visible: l.visible,
              fresh: false,
              zIndex: l.zIndex,
              delay: l.delay
            };
          });
          that.setData({ logoPrintLayers: settledLayers });

          index += 1;
          if (index < LOGO_PRINT_STEPS.length) {
            that.updateActiveBlock(index);
          }
          that.colorSequenceTimer = setTimeout(doStep, 600);
        }, 600);
      }, 260);
    }

    this.colorSequenceTimer = setTimeout(doStep, 200);
  },

  clearColorSequenceTimer() {
    if (this.colorSequenceTimer) {
      clearTimeout(this.colorSequenceTimer);
      this.colorSequenceTimer = null;
    }

    if (this.colorSequenceEndTimer) {
      clearTimeout(this.colorSequenceEndTimer);
      this.colorSequenceEndTimer = null;
    }

    if (this.printStampTimer) {
      clearTimeout(this.printStampTimer);
      this.printStampTimer = null;
    }

    if (this._paperPressTimer) {
      clearTimeout(this._paperPressTimer);
      this._paperPressTimer = null;
    }

    if (this._paperReturnTimer) {
      clearTimeout(this._paperReturnTimer);
      this._paperReturnTimer = null;
    }
  },

  // ── 图鉴卡片 ──

  flipCard(e) {
    const index = e.currentTarget.dataset.index;
    const path = 'cards[' + index + '].flipped';
    const data = {};
    data[path] = !this.data.cards[index].flipped;
    this.setData(data);
  },

  // ── 知识测验 ──

  selectQuizOption(e) {
    if (this.data.showExplanation) return;

    const optionIndex = e.currentTarget.dataset.index;
    const currentQuestion = this.data.currentQuestion;
    const isCorrect = optionIndex === this.data.quiz[currentQuestion].answer;

    this.setData({
      selectedOption: optionIndex,
      showExplanation: true,
      quizScore: isCorrect ? this.data.quizScore + 1 : this.data.quizScore
    });

    setTimeout(() => {
      if (this.data.currentQuestion < this.data.quiz.length - 1) {
        this.setData({
          currentQuestion: this.data.currentQuestion + 1,
          selectedOption: -1,
          showExplanation: false
        });
      } else {
        this.setData({ quizFinished: true });
      }
    }, 2000);
  },

  resetQuiz() {
    this.setData({
      currentQuestion: 0,
      quizScore: 0,
      quizFinished: false,
      selectedOption: -1,
      showExplanation: false
    });
  },

  // ── 视频号视频 ──

  switchVideo(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.updateCurrentVideo(index);
  },

  prevNextVideo(e) {
    const dir = parseInt(e.currentTarget.dataset.dir, 10);
    const newIndex = this.data.currentVideoIndex + dir;
    if (newIndex < 0 || newIndex >= this.data.channelVideos.length) return;
    this.updateCurrentVideo(newIndex);
  },

  updateCurrentVideo(index) {
    const video = this.data.channelVideos[index];
    this.setData({
      currentVideoIndex: index,
      currentVideo: video
    });
  },

  onVideoPlay() {
    this.setData({ videoPlaying: true });
    // 播放视频时暂停背景音乐
    if (this.bgMusic && this.data.musicPlaying) {
      this.bgMusic.pause();
      this.setData({ musicPlaying: false });
    }
  },

  onVideoPause() {
    this.setData({ videoPlaying: false });
    // 视频暂停后恢复背景音乐（如果之前是播放状态）
    if (this.bgMusic && this.data.musicTriggered && !this.data.musicPlaying) {
      this.bgMusic.play();
      this.setData({ musicPlaying: true });
    }
  },

  onVideoEnded() {
    this.setData({ videoPlaying: false });
    // 视频结束后恢复背景音乐
    if (this.bgMusic && this.data.musicTriggered && !this.data.musicPlaying) {
      this.bgMusic.play();
      this.setData({ musicPlaying: true });
    }
  },

  onVideoError(e) {
    console.error('[视频号] 播放出错:', e.detail);
    this.setData({ videoPlaying: false });

    // 错误码 1416106：个人主体小程序无法内嵌非同主体视频号
    const errMsg = (e.detail && e.detail.errMsg) || '';
    if (errMsg.indexOf('1416106') > -1 && !this.data.useFallbackMode) {
      this.setData({ useFallbackMode: true });
      wx.showToast({ title: '已切换跳转模式', icon: 'none' });
      return;
    }

    wx.showToast({ title: '视频加载失败', icon: 'none' });
  },

  openChannelsActivity() {
    const video = this.data.currentVideo;
    if (!video.finderUserName || video.finderUserName === 'sph_xxxxxxxx') {
      wx.showToast({ title: '请先配置视频号参数', icon: 'none' });
      return;
    }

    // 有 feedId 时打开特定视频；只有 feedToken 时打开视频号主页
    if (video.feedId) {
      wx.openChannelsActivity({
        finderUserName: video.finderUserName,
        feedId: video.feedId,
        success: () => {
          console.log('[视频号] 跳转视频成功');
        },
        fail: (err) => {
          console.error('[视频号] 跳转视频失败:', err);
          this.openChannelsUserProfile(video.finderUserName);
        }
      });
    } else {
      this.openChannelsUserProfile(video.finderUserName);
    }
  },

  openChannelsUserProfile(finderUserName) {
    wx.openChannelsUserProfile({
      finderUserName: finderUserName,
      success: () => {
        console.log('[视频号] 跳转主页成功');
      },
      fail: (err) => {
        console.error('[视频号] 跳转主页失败:', err);
        const errMsg = (err && err.errMsg) || '';
        if (errMsg.indexOf('开发者工具') > -1) {
          wx.showModal({
            title: '请在真机预览',
            content: '视频号跳转功能需要在真机微信中预览体验，开发者工具暂不支持。\n\n请点击右上角"预览"，用手机微信扫码体验。',
            showCancel: false
          });
          return;
        }
        wx.showToast({ title: '跳转视频号失败', icon: 'none' });
      }
    });
  },

  // ── 通用 ──

  noop() {},

  async previewImage(e) {
    const src = e.currentTarget.dataset.src;
    const urls = e.currentTarget.dataset.urls || this.data.previewImages;

    try {
      const previewUrls = await Promise.all(urls.map((url) => (
        url && url.startsWith('cloud://') ? resolveCloudURL(url) : url
      )));
      const currentIndex = urls.indexOf(src);
      wx.previewImage({
        current: previewUrls[currentIndex >= 0 ? currentIndex : 0],
        urls: previewUrls
      });
    } catch (err) {
      console.error('[首页] 图片预览临时链接获取失败:', err);
      wx.showToast({ title: '图片预览失败', icon: 'none' });
    }
  },

  // ── 导航 ──

  goTo3D() {
    wx.navigateTo({ url: '/pages/gallery/gallery' });
  },

  goTo2D() {
    wx.navigateTo({ url: '/pages/exploded-view/exploded-view' });
  },

  goToAiGenerate() {
    wx.navigateTo({ url: '/pages/ai-create/ai-create' });
  },

  goToAiHome() {
    wx.navigateTo({ url: '/pages/index/index' });
  },

  goToAiChat() {
    wx.navigateTo({ url: '/pages/ai-chat/ai-chat' });
  }
});
