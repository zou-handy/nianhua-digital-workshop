const { IMAGES, VIDEOS, LAYERS, TOOL_IMAGES, CRAFT_PROCESS_IMAGES, NIANHUA_GALLERY_IMAGES, ADVANCED_PRINT_IMAGES, ADVANCED_PRINT_SETS, MODELS, layerFileID } = require('../../constants/cloudAssets');
const { resolveCloudURL } = require('../../utils/resolveCloudURL');
const { Engine3D: NianhuaGalleryEngine } = require('../../utils/nianhuaGalleryEngine');
const { buildNianhuaImagePrompt } = require('../../utils/nianhuaImagePrompt');
const modelLab = require('../../utils/modelLabAPI');
const { buildShareAppMessage, buildShareTimeline } = require('../../utils/shareConfig');

function normalizeFeedToken(feedToken) {
  const normalizedToken = String(feedToken || '').trim().replace(/^token\//, '');
  return normalizedToken ? 'token/' + normalizedToken : '';
}

const TEST_FEED_TOKEN = normalizeFeedToken('AkhIJGqmi');
const TEAM_FEED_TOKEN = normalizeFeedToken('token/AJoJvSMTf');
const TEAM_SECOND_FEED_TOKEN = normalizeFeedToken('token/AZYq6GET6');
const USER_ADVANCED_WORKS_KEY = 'advancedPrintUserWorks';
const XIAONIAN_WORKING_IMAGE = 'cloud://cloud1-d7g47tfdyf7a14a31.636c-cloud1-d7g47tfdyf7a14a31-1448457900/ui/xiaonian/xiaonian-girl.jpg';
let runtimeAdvancedPrintSets = ADVANCED_PRINT_SETS.slice();

const NIANHUA_GALLERY_PAGE = 5;
const NIANHUA_GALLERY_LOGO_LAYERS = [8, 7, 6, 5, 4, 3, 2, 1, 0].map(function(index) {
  return layerFileID('logo-demo', index);
});
const NIANHUA_GALLERY_ARTWORKS = [
  {
    id: 'lady-official',
    name: '仕女文官像',
    en: 'Lady Official',
    pattern: 'zhuangyuan',
    image: NIANHUA_GALLERY_IMAGES.figure01,
    meaning: '华服纳祥 · 文运昌盛',
    desc: '人物头戴冠饰、身着朱红官服，衣襟与补子保留佛山年画鲜明的红绿套色。'
  },
  {
    id: 'lady-ribbon',
    name: '彩衣仕女像',
    en: 'Lady with Ribbon',
    pattern: 'tuanhe',
    image: NIANHUA_GALLERY_IMAGES.figure02,
    meaning: '花开富贵 · 喜庆绵长',
    desc: '仕女手执彩穗，衣饰繁复而线条流畅，呈现民间年画对美满生活的想象。'
  },
  {
    id: 'door-god-left',
    name: '持刀门神 · 左',
    en: 'Door God · Left',
    pattern: 'menshen-qin',
    image: NIANHUA_GALLERY_IMAGES.figure03,
    meaning: '镇宅守门 · 护佑平安',
    desc: '门神披甲持刀，造型饱满威武。朱红、石绿与纸黄构成典型的佛山木版年画色谱。'
  },
  {
    id: 'door-god-right',
    name: '持刀门神 · 右',
    en: 'Door God · Right',
    pattern: 'menshen-yuchi',
    image: NIANHUA_GALLERY_IMAGES.figure04,
    meaning: '驱邪纳福 · 家宅安宁',
    desc: '与左门神成对张贴，人物朝向相应、兵器相合，共同构成传统门神组合。'
  },
  {
    id: 'drying-hall-one',
    name: '晒画长廊',
    en: 'Drying Hall',
    pattern: 'fu',
    image: NIANHUA_GALLERY_IMAGES.dryingHall01,
    landscape: true,
    meaning: '纸墨晾晒 · 手艺成形',
    desc: '印好的年画悬挂在木架间自然晾干，层层纸页记录着套印之后等待颜色稳定的过程。'
  },
  {
    id: 'drying-hall-two',
    name: '画坊天棚',
    en: 'Workshop Canopy',
    pattern: 'caishen',
    image: NIANHUA_GALLERY_IMAGES.dryingHall02,
    landscape: true,
    meaning: '满堂年画 · 岁岁更新',
    desc: '从画坊内部仰望晾晒中的作品，门神、童子和吉祥题材共同构成鲜活的非遗现场。'
  }
];

const ERA_DATA = [
  {
    year: '1736',
    title: '木版年画的黄金时代',
    desc: '佛山木版年画兴于明代永乐年间，至清代乾嘉时期达到鼎盛。彼时佛山与天津杨柳青、苏州桃花坞、山东潍坊并称中国四大年画产地。\n\n鼎盛时期，佛山经营年画的店铺多达两百余家，从业者数千人。年画题材涵盖门神、福禄寿全、戏曲故事、神话传说，以红丹、绿、黄、黑四色套印为特色，形成了浓烈喜庆的岭南风格。\n\n俗称“万年红”的红丹底色，是佛山木版年画极具辨识度的标志性技艺，色彩浓烈，久晒不易褪色，寄托着吉祥长久的愿望。',
    image: IMAGES.baxian,
    images: [IMAGES.baxian, IMAGES.coloringCloseup],
    hasVideo: false,
    isLast: false
  },
  {
    year: '民国后期至20世纪后期',
    title: '转折与式微',
    desc: '民国早期，佛山木版年画仍延续着较为活跃的生产与销售。到民国后期，随着社会环境和印刷方式变化，传统作坊逐渐面临转折；至20世纪后期，其生产规模和市场进一步收缩。\n\n然而，佛山年画的精髓并未消亡。粗犷有力的刀法、浓烈饱满的色彩和吉祥美好的寓意，仍扎根于岭南民间文化。部分艺人也曾把传统题材与现实生活结合，留下时代变迁中的新表达。',
    image: IMAGES.carvingHD,
    images: [IMAGES.carvingHD, IMAGES.lightOnBoard],
    hasVideo: false,
    isLast: false
  },
  {
    year: '2006',
    title: '刀木之间的坚守',
    desc: '2006年，佛山木版年画入选首批国家级非物质文化遗产名录，标志着这项古老技艺获得了国家层面的认可与保护。\n\n一幅传统木版年画的完整制作包含20多道细分步骤，涉及起稿、刻版、调色、套印、开相等环节。传统雕版常见荷木，也会因题材、版面和匠人经验选用桃木、梨木等木材。\n\n冯炳棠先生生前长期守护传统技艺，于2019年逝世；冯锦强等传承人继续开展创作、研究与传播，让佛山木版年画在新时代获得新的表达。',
    image: IMAGES.boardDisplay,
    images: [IMAGES.boardDisplay, IMAGES.drying],
    hasVideo: false,
    isLast: false
  },
  {
    year: '2026',
    title: '当AI遇见年画',
    desc: '当七百年的刀木技艺遇上人工智能，会碰撞出怎样的火花？\n\n我们用3D建模重构年画的空间维度，用AI图像生成探索年画的无限可能，用交互动画让年画从纸面走进屏幕。\n\n这不是对传统的替代，而是一次跨越时空的对话。每一个AI生成的年画，都携带着七百年木版技艺的基因密码。\n\n传统不是用来封存的，而是用来重新想象的。',
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

const ADVANCED_STEP_META = [
  {
    key: 'black',
    name: '墨线木板',
    shortName: '黑',
    color: '#1A1A1A',
    textColor: '#ffffff',
    order: 1,
    material: '松烟墨',
    purpose: '线稿定位',
    desc: '黑版负责人物外轮廓、眉眼和衣甲线条，是后续色版对位的基准。'
  },
  {
    key: 'red',
    name: '万年红木板',
    shortName: '红',
    color: '#D42F2F',
    textColor: '#ffffff',
    order: 2,
    material: '红丹色',
    purpose: '主色铺底',
    desc: '红版承担门神最醒目的气势，先把衣袍、甲片和喜庆色面压稳。'
  },
  {
    key: 'yellow',
    name: '石黄木板',
    shortName: '黄',
    color: '#F2C94C',
    textColor: '#1A0F08',
    order: 3,
    material: '石黄/藤黄',
    purpose: '提亮装饰',
    desc: '黄色版补出脸部、花纹和亮面，让红底上产生更清晰的层次。'
  },
  {
    key: 'green',
    name: '青绿木板',
    shortName: '绿',
    color: '#5396AC',
    textColor: '#ffffff',
    order: 4,
    material: '石青/石绿',
    purpose: '补色压层',
    desc: '青绿色版来自后端分色结果，负责冷色衣甲和局部装饰，让四版叠加时保持同一画面比例和位置。'
  }
];

function getAdvancedPrintSteps(workIndex) {
  const work = runtimeAdvancedPrintSets[workIndex] || runtimeAdvancedPrintSets[0];
  return ADVANCED_STEP_META.map(function(meta) {
    return Object.assign({}, meta, {
      boardImage: work.boards[meta.key],
      modelFileID: work.models[meta.key],
      layerImage: work.layers[meta.key]
    });
  });
}

const ADVANCED_PRINT_STEPS = getAdvancedPrintSteps(0);

function buildUserAdvancedWork(record, original, ordinal) {
  var remaining = (record.layers || []).slice();
  var patterns = {
    black: /墨|黑|ink|black/i,
    red: /红|赤|red|pink/i,
    yellow: /黄|金|yellow|gold/i,
    green: /绿|青|蓝|green|cyan|blue/i
  };
  var picked = {};
  Object.keys(patterns).forEach(function(key) {
    var index = remaining.findIndex(function(layer) {
      return patterns[key].test(String(layer.label || '') + ' ' + String(layer.color || ''));
    });
    if (index > -1) picked[key] = remaining.splice(index, 1)[0];
  });
  ['black', 'red', 'yellow', 'green'].forEach(function(key) {
    if (!picked[key]) picked[key] = remaining.shift() || record.layers[0];
  });
  var sourceOf = function(layer) { return layer && (layer.fileID || layer.tempPath) || ''; };
  return {
    id: record.id,
    name: '作品' + ordinal + ' · ' + (record.title || '数字二创'),
    original: original || sourceOf(record.layers[0]),
    isUserCreated: true,
    createdAt: record.timestamp || Date.now(),
    boards: {
      black: sourceOf(picked.black), red: sourceOf(picked.red),
      yellow: sourceOf(picked.yellow), green: sourceOf(picked.green)
    },
    layers: {
      black: sourceOf(picked.black), red: sourceOf(picked.red),
      yellow: sourceOf(picked.yellow), green: sourceOf(picked.green)
    },
    models: { black: '', red: '', yellow: '', green: '' }
  };
}

const CRAFT_STEPS = [
  {
    num: '壹',
    short: '雕木版',
    title: '雕木版',
    tool: '荷木等版材、拳刀、三角刀、清底刀',
    image: CRAFT_PROCESS_IMAGES.carving,
    desc: '将墨线稿反贴在木板上，沿线刻出轮廓，再逐层清去空白处。线版负责定形，色版则为后续套印分别保留对应色块。',
    tip: '运刀要稳，细线处宁可少进一分，也不能伤到人物神态和衣纹转折。'
  },
  {
    num: '贰',
    short: '套印',
    title: '逐色套印',
    tool: '雕版、棕刷、宣纸、颜料',
    image: CRAFT_PROCESS_IMAGES.overprinting,
    desc: '在不同色版上刷匀颜料，将宣纸依定位逐版覆印。墨线与红、黄、绿等色层依次叠合，逐渐构成年画的基本色彩。',
    tip: '每次落纸都要对准版规；位置稍有偏差，人物轮廓和色块就会错位。'
  },
  {
    num: '叁',
    short: '开相',
    title: '手绘开相',
    tool: '细笔、墨色、矿物颜料',
    image: CRAFT_PROCESS_IMAGES.facePainting,
    desc: '套印后由画工手绘人物眉眼、胡须和面部神情，这一步称为“开相”。同一版画也会因笔势不同呈现细微差别。',
    tip: '开相落笔不多，却决定人物是否有神，是整幅年画最见手上功夫的一步。'
  },
  {
    num: '肆',
    short: '描金',
    title: '勾线描金',
    tool: '描金笔、金色颜料',
    image: CRAFT_PROCESS_IMAGES.goldPainting,
    desc: '在盔甲、服饰和纹样的关键位置手工描金，以明亮线条强调层次，让套印后的画面更显华贵与立体。',
    tip: '金线要连贯而克制，只在关键纹饰上提亮，才能衬出主体而不显杂乱。'
  },
  {
    num: '伍',
    short: '填丹',
    title: '大笔填丹',
    tool: '排笔、红丹颜料',
    image: CRAFT_PROCESS_IMAGES.fillingRed,
    desc: '最后以饱满的红丹填涂背景和大面积色块，补足套印之外的手绘色彩，使画面形成佛山木版年画鲜明热烈的视觉气质。',
    tip: '填丹既要盖色均匀，也要守住人物轮廓，大片红色才能厚实而不压住细节。'
  }
];

const CHAPTERS = [
  { id: '启', name: '入门', subtitle: '佛山木版年画', volume: '卷一' },
  { id: '史', name: '溯源', subtitle: '七百年刀木薪传', volume: '卷二' },
  { id: '具', name: '器具', subtitle: '刀木之间的精度', volume: '卷三' },
  { id: '技', name: '工艺', subtitle: '一版年画的诞生', volume: '卷四' },
  { id: '版', name: '版台', subtitle: '分色木板交互', volume: '卷五' },
  { id: '典', name: '图鉴', subtitle: '经典年画卡牌', volume: '卷六' },
  { id: '考', name: '测验', subtitle: '检验你的探索', volume: '卷七' },
  { id: '传', name: '关于', subtitle: '年画薪传突击队', volume: '卷八' }
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
    angle: '刃形：主刀',
    weight: '规格因实物而异'
  },
  {
    name: '弯凿刀',
    short: '弯',
    purpose: '转弯与弧线',
    desc: '弯凿刀用来处理圆转的线条和凹面，适合衣纹、云纹、飘带和人物胡须这类连续弧线。',
    detail: '弯口能顺着木纹转向，减少硬折角。遇到小半径弧线时，需要短刀路多次接续，线条才不会断气。',
    image: TOOL_IMAGES.curvedKnife,
    color: '#E6A817',
    angle: '刃形：弯口',
    weight: '规格因实物而异'
  },
  {
    name: '三角刀',
    short: '三',
    purpose: '细线与脉理',
    desc: '三角刀的刃口呈 V 形，负责细线、发丝、花叶脉络和衣纹暗线，是让画面有精神的细节刀。',
    detail: '同一条线常要先浅刻定位，再沿两侧修整。刀口太深会让线条发硬，太浅又容易在套印时糊掉。',
    image: TOOL_IMAGES.triangleKnife,
    color: '#F2C94C',
    angle: '刃形：V 形',
    weight: '规格因实物而异'
  },
  {
    name: '清底刀',
    short: '清',
    purpose: '清底与刮平',
    desc: '清底刀也叫刮刀，用来把不需要着色的底面清掉，让图案线条和色块凸出来。它决定版面是否干净。',
    detail: '清底看似粗活，其实最怕伤到已经刻好的细线。底面要低而平，印刷时纸面才不会被多余木屑蹭脏。',
    image: TOOL_IMAGES.clearingKnife,
    color: '#8A5A2B',
    angle: '刃形：平口',
    weight: '规格因实物而异'
  },
  {
    name: '椴木板',
    short: '椴',
    purpose: '练习与大色版',
    desc: '椴木板质地轻软、纹理均匀，下刀阻力较小，适合大面积色版、教学练习和需要快速清底的版面。',
    detail: '选椴木要看板面是否平整、木纹是否顺直，并充分阴干。含水率不稳会让套印时出现伸缩和跑版。',
    image: TOOL_IMAGES.basswoodBoard,
    color: '#C39A3A',
    angle: '平整板材',
    weight: '视尺寸'
  },
  {
    name: '梨木板',
    short: '梨',
    purpose: '细线与耐久版',
    desc: '梨木质地细密坚韧、耐反复印刷，能稳定承载人物眉眼、衣纹和兵器等复杂线稿。',
    detail: '梨木较硬，下刀前要顺着木性规划刀路。细线版尤其要避开结疤和逆纹，否则凸线容易崩裂。',
    image: TOOL_IMAGES.pearBoard,
    color: '#8A542F',
    angle: '细密板材',
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
    angle: '材质：棕榈纤维',
    weight: '规格因实物而异'
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
    modelFileID: step.modelFileID,
    layerImage: step.layerImage,
    desc: step.desc,
    printed: !!printedSet[index],
    active: index === activeIndex,
    placed: index === placedIndex
  };
}

function buildAdvancedBlocks(printedSteps, activeIndex, placedIndex, workIndex) {
  var printedSet = {};
  var steps = getAdvancedPrintSteps(workIndex || 0);
  printedSteps.forEach(function(i) { printedSet[i] = true; });

  return steps.map(function(step, index) {
    return buildAdvancedBlock(step, index, printedSet, activeIndex, placedIndex);
  });
}

function buildAdvancedPlacedBlock(index, printedSteps, workIndex) {
  var steps = getAdvancedPrintSteps(workIndex || 0);
  if (index < 0 || index >= steps.length) return null;

  var printedSet = {};
  printedSteps.forEach(function(i) { printedSet[i] = true; });
  return buildAdvancedBlock(steps[index], index, printedSet, index, index);
}

function buildAdvancedPreviewLayers(printedSteps, workIndex) {
  var printedSet = {};
  var steps = getAdvancedPrintSteps(workIndex || 0);
  printedSteps.forEach(function(i) { printedSet[i] = true; });

  return steps.map(function(step, index) {
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
  onShareAppMessage: buildShareAppMessage,
  onShareTimeline: buildShareTimeline,

  data: {
    IMAGES,
    VIDEOS,
    openingLayers: OPENING_PRINT_LAYERS,
    openingPrintVisible: true,
    openingEffectUrl: '',
    openingEffectVisible: false,
    openingEffectPlaying: false,
    currentPage: 0,
    volumeTransitionActive: false,
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
    advancedWorks: ADVANCED_PRINT_SETS.map(function(work) {
      return { id: work.id, name: work.name, original: work.original };
    }),
    advancedWorkIndex: 0,
    advancedCurrentWork: ADVANCED_PRINT_SETS[0],
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
    advancedBoardPreviewOpen: false,
    advancedBoardPreview: null,
    advancedBoardPreviewRotateX: -6,
    advancedBoardPreviewRotateY: -18,
    advancedBoardPreviewScale: 1,

    // 卷五内嵌数字二创
    advancedCreatorOpen: false,
    advancedCreatorInput: '',
    advancedCreatorImage: '',
    advancedCreatorFileID: '',
    advancedCreatorGenerating: false,
    advancedCreatorSplitting: false,
    advancedCreatorStage: '',
    advancedCreatorWorkingText: '',
    xiaonianWorkingImage: XIAONIAN_WORKING_IMAGE,

    // 卷六 3D 年画展厅
    gallerySelectedArt: null,
    galleryAutoRotate: true,
    galleryShowGuide: true,
    galleryLoading: true,
    galleryError: '',

    // 旧图鉴数据保留给历史缓存兼容，界面已由 3D 展厅替换
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
        title: '传统雕版木材',
        category: '材料类',
        image: TOOL_IMAGES.woodBoards,
        desc: '佛山传统雕版常见荷木，也会使用桃木、梨木等；椴木质地较软、纹理均匀，更适合教学和练习。选材会结合版面、刀法与使用需要。',
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

    // 视频号视频列表。非同主体内嵌只传完整的 token/xxx 格式 feedToken。
    channelVideos: [
      {
        title: '非同主体测试',
        desc: '使用刚获取的 feed-token 内嵌',
        feedId: '',
        feedToken: TEST_FEED_TOKEN,
        finderUserName: 'sphAlrwGhzSZbx0'
      }
    ],
    currentVideoIndex: 0,
    currentVideo: {
      title: '非同主体测试',
      desc: '使用刚获取的 feed-token 内嵌',
      feedId: '',
      feedToken: TEST_FEED_TOKEN,
      finderUserName: 'sphAlrwGhzSZbx0'
    },
    videoPlaying: false,
    videoEmbedStatus: 'ready',
    videoStatusText: '准备内嵌视频号视频',
    videoErrorText: '',
    useFallbackMode: false,

    teamVideos: [
      { title: '薪传影像 · 01', feedToken: TEAM_FEED_TOKEN },
      { title: '薪传影像 · 02', feedToken: TEAM_SECOND_FEED_TOKEN },
      { title: '薪传影像 · 03', feedToken: normalizeFeedToken('token/AE7nusfn1') },
      { title: '薪传影像 · 04', feedToken: normalizeFeedToken('token/AUR30syaz') },
      { title: '薪传影像 · 05', feedToken: normalizeFeedToken('token/Ad6lRin0U') },
      { title: '薪传影像 · 06', feedToken: normalizeFeedToken('token/A2CqofOn7') },
      { title: '薪传影像 · 07', feedToken: normalizeFeedToken('token/A7bu5Zp0R') },
      { title: '薪传影像 · 08', feedToken: normalizeFeedToken('token/ARLYANvNA') }
    ],

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
        options: ['荷木等适宜木材', '仅限棠梨木', '竹子', '未经处理的软木'],
        answer: 0,
        explanation: '佛山传统雕版常见荷木，也会使用桃木、梨木等，具体选择取决于木性、版面和匠人经验。'
      }
    ],
    currentQuestion: 0,
    quizScore: 0,
    quizFinished: false,
    selectedOption: -1,
    showExplanation: false
  },

  onLoad() {
    this._loadAdvancedUserWorks();
    this.bgMusic = wx.createInnerAudioContext();
    this.preloadToolImages();
    resolveCloudURL(VIDEOS.story).then((url) => {
      if (this.bgMusic) {
        this.bgMusic.src = url;
      }
    }).catch((err) => {
      console.error('[首页] 背景音频临时链接获取失败:', err);
    });
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.25;
    resolveCloudURL(VIDEOS.openingWelcome).then((url) => {
      this.setData({ openingEffectUrl: url });
    }).catch((err) => {
      console.error('[首页开场] 欢迎视频临时链接获取失败:', err);
    });
  },

  onReady() {
    this._prepareNianhuaGallery();
    this._scheduleOpeningEffect();
  },

  onShow() {
    if (this.data.currentPage === NIANHUA_GALLERY_PAGE) this._startNianhuaGalleryLoop();
    if (this.data.currentPage === 4) {
      wx.nextTick(() => {
        const aiFloat = this.selectComponent('#aiFloat');
        if (aiFloat) aiFloat.setPageContext({ chapter: '版台' });
      });
    }
  },

  onHide() {
    this._stopNianhuaGalleryLoop();
    this._hideOpeningEffect();
  },

  _prepareNianhuaGallery() {
    const artworkRequest = Promise.all(NIANHUA_GALLERY_ARTWORKS.map(function(artwork) {
      return resolveCloudURL(artwork.image).then(function(url) {
        return Object.assign({}, artwork, { image: url });
      });
    }));
    const logoLayerRequest = Promise.all(NIANHUA_GALLERY_LOGO_LAYERS.map(function(fileID) {
      return resolveCloudURL(fileID);
    }));
    const backgroundRequest = resolveCloudURL(IMAGES.drying).catch((err) => {
      console.warn('[卷六展厅] 背景图加载失败，使用暖色展厅底色:', err);
      return '';
    });

    Promise.all([artworkRequest, logoLayerRequest, backgroundRequest]).then((results) => {
      const artworks = results[0];
      const logoLayers = results[1];
      this._galleryArtworks = artworks;
      this._galleryLogoLayers = logoLayers;
      this._galleryBackgroundUrl = results[2];
      this._initNianhuaGalleryCanvas();
    }).catch((err) => {
      console.error('[卷六展厅] 云端图片加载失败:', err);
      this.setData({ galleryLoading: false, galleryError: '展品加载失败，请稍后重试' });
    });
  },

  _initNianhuaGalleryCanvas() {
    wx.createSelectorQuery().in(this)
      .select('#nianhua-gallery-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node || !res[0].width || !res[0].height) {
          this.setData({ galleryLoading: false, galleryError: '展厅画布初始化失败' });
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        let dpr = 2;
        try {
          const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
          dpr = Math.min(info.pixelRatio || 2, 2);
        } catch (e) {
          dpr = 2;
        }

        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        this._galleryCanvas = canvas;
        this._galleryEngine = new NianhuaGalleryEngine({
          canvas: canvas,
          ctx: ctx,
          width: res[0].width,
          height: res[0].height,
          artworks: this._galleryArtworks,
          centerLayers: this._galleryLogoLayers,
          backgroundImage: this._galleryBackgroundUrl
        });
        this._galleryEngine.setAutoRotate(this.data.galleryAutoRotate);
        this._galleryTouch = {
          mode: 'none', lastX: 0, lastY: 0, downX: 0, downY: 0,
          downTime: 0, lastPinchDist: 0, vyaw: 0, moved: false
        };
        this.setData({ galleryLoading: false, galleryError: '' });
        if (this.data.currentPage === NIANHUA_GALLERY_PAGE) this._startNianhuaGalleryLoop();
        this._galleryGuideTimer = setTimeout(() => {
          this.setData({ galleryShowGuide: false });
        }, 6000);
      });
  },

  _startNianhuaGalleryLoop() {
    if (!this._galleryCanvas || this._galleryRunning) return;
    this._galleryRunning = true;
    const loop = (time) => {
      if (!this._galleryRunning || !this._galleryEngine) return;
      this._galleryEngine.render(time || Date.now());
      this._galleryRafId = this._galleryCanvas.requestAnimationFrame(loop);
    };
    this._galleryRafId = this._galleryCanvas.requestAnimationFrame(loop);
  },

  _stopNianhuaGalleryLoop() {
    this._galleryRunning = false;
    if (this._galleryCanvas && this._galleryRafId && this._galleryCanvas.cancelAnimationFrame) {
      this._galleryCanvas.cancelAnimationFrame(this._galleryRafId);
    }
    this._galleryRafId = null;
  },

  _loadAdvancedUserWorks() {
    var stored = wx.getStorageSync(USER_ADVANCED_WORKS_KEY);
    var userWorks = Array.isArray(stored) ? stored.filter(function(work) {
      return work && work.id && work.boards && work.layers && work.models;
    }) : [];
    runtimeAdvancedPrintSets = ADVANCED_PRINT_SETS.concat(userWorks);
    this.setData({
      advancedWorks: runtimeAdvancedPrintSets.map(function(work, index) {
        return { id: work.id, name: work.name || ('作品' + (index + 1)), original: work.original, isUserCreated: !!work.isUserCreated };
      }),
      advancedCurrentWork: runtimeAdvancedPrintSets[this.data.advancedWorkIndex] || runtimeAdvancedPrintSets[0]
    });
  },

  _addAdvancedUserWork(record) {
    var stored = wx.getStorageSync(USER_ADVANCED_WORKS_KEY);
    var existing = Array.isArray(stored) ? stored : [];
    var work = buildUserAdvancedWork(record, record.original || this.data.advancedCreatorFileID || this.data.advancedCreatorImage, 3);
    var next = [work].concat(existing.filter(function(item) { return item && item.id !== work.id; })).slice(0, 8);
    next.forEach(function(item, index) {
      item.name = '作品' + (index + 3) + ' · ' + String(item.name || '数字二创').replace(/^作品\d+\s*·\s*/, '');
    });
    wx.setStorageSync(USER_ADVANCED_WORKS_KEY, next);
    runtimeAdvancedPrintSets = ADVANCED_PRINT_SETS.concat(next);
    this._loadAdvancedUserWorks();
    return runtimeAdvancedPrintSets.findIndex(function(item) { return item.id === work.id; });
  },

  onUnload() {
    clearInterval(this._creatorWorkingTimer);
    this._clearOpeningSequenceTimers();
    this._stopNianhuaGalleryLoop();
    if (this._galleryGuideTimer) clearTimeout(this._galleryGuideTimer);
    if (this._galleryResumeTimer) clearTimeout(this._galleryResumeTimer);
    this.clearColorSequenceTimer();
    if (this._openingReplayTimer) {
      clearTimeout(this._openingReplayTimer);
      this._openingReplayTimer = null;
    }

    if (this._advancedBoardMoveTimer) {
      clearTimeout(this._advancedBoardMoveTimer);
      this._advancedBoardMoveTimer = null;
    }
    if (this._volumeTransitionTimer) {
      clearTimeout(this._volumeTransitionTimer);
      this._volumeTransitionTimer = null;
    }

    if (this.bgMusic) {
      this.bgMusic.destroy();
      this.bgMusic = null;
    }
  },

  onSwiperChange(e) {
    const page = e.detail.current;
    const previousPage = this.data.currentPage;
    this.setData({ currentPage: page });

    if (previousPage === 0 && page !== 0 && this.data.openingEffectVisible) {
      this._hideOpeningEffect();
    }

    if (page === NIANHUA_GALLERY_PAGE) this._startNianhuaGalleryLoop();
    if (previousPage === NIANHUA_GALLERY_PAGE && page !== NIANHUA_GALLERY_PAGE) {
      this._stopNianhuaGalleryLoop();
    }

    if (previousPage === 0 && page === 1) {
      if (this._volumeTransitionTimer) clearTimeout(this._volumeTransitionTimer);
      this.setData({ volumeTransitionActive: true });
      this._volumeTransitionTimer = setTimeout(() => {
        this.setData({ volumeTransitionActive: false });
        this._volumeTransitionTimer = null;
      }, 1250);
    }

    if (!this.data.musicTriggered) {
      this.bgMusic.play();
      this.setData({ musicPlaying: true, musicTriggered: true });
    }

    // 更新AI助手上下文
    const aiFloat = this.selectComponent('#aiFloat');
    if (aiFloat) {
      aiFloat.setPageContext({ chapter: this.data.chapters[page].name });
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

  _scheduleOpeningEffect() {
    this._clearOpeningSequenceTimers();
    this._openingEffectAttempts = 0;
    this.setData({
      openingEffectVisible: false,
      openingEffectPlaying: false
    }, () => {
      this._openingEffectTimer = setTimeout(() => {
        this._playOpeningEffect();
      }, 2860);
    });
  },

  _playOpeningEffect() {
    this._openingEffectTimer = null;
    if (this.data.currentPage !== 0) return;
    if (!this.data.openingEffectUrl) {
      this._openingEffectAttempts += 1;
      if (this._openingEffectAttempts <= 3) {
        this._openingEffectTimer = setTimeout(() => this._playOpeningEffect(), 700);
      }
      return;
    }
    this.setData({
      openingEffectVisible: true,
      openingEffectPlaying: false
    }, () => {
      this._openingVideoStartTimer = setTimeout(() => {
        if (!this.data.openingEffectPlaying) {
          console.warn('[首页开场] 欢迎视频未能及时播放，已自动跳过');
          this._hideOpeningEffect();
        }
      }, 3200);
    });
  },

  onOpeningEffectPlay() {
    if (this._openingVideoStartTimer) {
      clearTimeout(this._openingVideoStartTimer);
      this._openingVideoStartTimer = null;
    }
    // Native video may dispatch play before its first frame is composited on device.
    // Keep it transparent briefly so the completed print remains continuous.
    this._openingVideoRevealTimer = setTimeout(() => {
      if (this.data.openingEffectVisible) {
        this.setData({ openingEffectPlaying: true });
      }
      this._openingVideoRevealTimer = null;
    }, 90);
    this._openingVideoFinishTimer = setTimeout(() => {
      this._hideOpeningEffect();
    }, 5000);
  },

  onOpeningEffectEnded() {
    this._hideOpeningEffect();
  },

  onOpeningEffectError(e) {
    console.error('[首页开场] 欢迎视频播放失败:', e && e.detail);
    this._hideOpeningEffect();
  },

  _hideOpeningEffect() {
    this._clearOpeningSequenceTimers();
    this.setData({
      openingEffectVisible: false,
      openingEffectPlaying: false
    });
  },

  _clearOpeningSequenceTimers() {
    const timerNames = [
      '_openingEffectTimer',
      '_openingVideoStartTimer',
      '_openingVideoRevealTimer',
      '_openingVideoFinishTimer'
    ];
    timerNames.forEach((name) => {
      if (this[name]) clearTimeout(this[name]);
      this[name] = null;
    });
  },

  replayOpeningPrint() {
    this._scheduleOpeningEffect();
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
    this.setData({
      toolDetailOpen: false,
      selectedTool: null
    });
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

  switchAdvancedWork(e) {
    var index = parseInt(e.currentTarget.dataset.index, 10);
    if (!Number.isFinite(index) || index < 0 || index >= runtimeAdvancedPrintSets.length) return;
    if (index === this.data.advancedWorkIndex) return;

    var steps = getAdvancedPrintSteps(index);
    this.setData({
      advancedWorkIndex: index,
      advancedCurrentWork: runtimeAdvancedPrintSets[index],
      advancedBlockIndex: 0,
      advancedActiveBlock: steps[0],
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
      advancedBlocks: buildAdvancedBlocks([], 0, -1, index),
      advancedPreviewLayers: buildAdvancedPreviewLayers([], index)
    });
  },

  updateAdvancedBlock(index) {
    var printedSteps = this.data.advancedPrintedSteps;
    var workIndex = this.data.advancedWorkIndex;
    var step = getAdvancedPrintSteps(workIndex)[index];
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
        modelFileID: step.modelFileID,
        layerImage: step.layerImage,
        desc: step.desc,
        printed: printedSteps.indexOf(index) > -1,
        placed: index === placedIndex
      },
      advancedBlocks: buildAdvancedBlocks(printedSteps, index, placedIndex, workIndex)
    });
  },

  selectAdvancedBlock(e) {
    var index = parseInt(e.currentTarget.dataset.index, 10);
    var workIndex = this.data.advancedWorkIndex;
    var steps = getAdvancedPrintSteps(workIndex);
    if (!Number.isFinite(index) || index < 0 || index >= steps.length) return;

    var printedSteps = this.data.advancedPrintedSteps;
    var placedBlock = buildAdvancedPlacedBlock(index, printedSteps, workIndex);
    var that = this;

    if (this._advancedBoardMoveTimer) {
      clearTimeout(this._advancedBoardMoveTimer);
    }

    var nextState = {
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
      advancedBlocks: buildAdvancedBlocks(printedSteps, index, index, workIndex)
    };

    if (this.data.advancedBoardMoving) {
      this.setData({ advancedBoardMoving: false }, function() {
        wx.nextTick(function() { that.setData(nextState); });
      });
    } else {
      this.setData(nextState);
    }

    this._advancedBoardMoveTimer = setTimeout(function() {
      that.setData({ advancedBoardMoving: false });
    }, 280);
  },

  prevAdvancedBlock() {
    var index = this.data.advancedBlockIndex;
    if (index <= 0) return;
    this.updateAdvancedBlock(index - 1);
  },

  nextAdvancedBlock() {
    var index = this.data.advancedBlockIndex;
    if (index >= getAdvancedPrintSteps(this.data.advancedWorkIndex).length - 1) return;
    this.updateAdvancedBlock(index + 1);
  },

  printAdvancedBlock() {
    var blockIndex = this.data.advancedPlacedBlockIndex;
    if (blockIndex < 0) return;

    var printedSteps = this.data.advancedPrintedSteps.slice();

    if (printedSteps.indexOf(blockIndex) === -1) {
      printedSteps.push(blockIndex);
    } else if (printedSteps.length >= ADVANCED_PRINT_STEPS.length) {
      return;
    }

    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' });
    }

    var workIndex = this.data.advancedWorkIndex;
    var step = getAdvancedPrintSteps(workIndex)[blockIndex];
    var placedBlock = buildAdvancedPlacedBlock(blockIndex, printedSteps, workIndex);
    var justCompleted = printedSteps.length === ADVANCED_PRINT_STEPS.length &&
      this.data.advancedPrintedSteps.length < ADVANCED_PRINT_STEPS.length;
    this.setData({
      advancedPrintedSteps: printedSteps,
      advancedPreviewLayers: buildAdvancedPreviewLayers(printedSteps, workIndex),
      advancedBlocks: buildAdvancedBlocks(printedSteps, blockIndex, blockIndex, workIndex),
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
        modelFileID: step.modelFileID,
        layerImage: step.layerImage,
        desc: step.desc,
        printed: printedSteps.indexOf(blockIndex) > -1,
        placed: true
      },
      advancedPlacedBlock: placedBlock
    }, () => {
      if (!justCompleted) return;
      setTimeout(() => {
        const aiFloat = this.selectComponent('#aiFloat');
        if (aiFloat) aiFloat.startVolumeFiveCompletionGuide();
      }, 360);
    });
  },

  onAdvancedPaperTap() {
    if (this.data.advancedPrintedSteps.length === ADVANCED_PRINT_STEPS.length) {
      this.openAdvancedPaperExplodedView();
    }
  },

  onAdvancedPaperTouchStart(e) {
    if (this.data.advancedPrintedSteps.length === ADVANCED_PRINT_STEPS.length) return;
    if (!e.touches || !e.touches.length) return;
    this._advancedPaperStartX = e.touches[0].clientX;
    this._advancedPaperStartY = e.touches[0].clientY;
    this._advancedPaperMoved = false;
    this.setData({
      advancedPaperArmed: false,
      advancedPaperDragging: false,
      advancedPaperSnap: false,
      advancedPaperBackVisible: false,
      advancedPaperDragX: 0,
      advancedPaperRotate: 0
    });
  },

  onAdvancedPaperTouchMove(e) {
    if (this.data.advancedPlacedBlockIndex < 0 || !e.touches || !e.touches.length) return;

    var deltaX = e.touches[0].clientX - this._advancedPaperStartX;
    var deltaY = e.touches[0].clientY - this._advancedPaperStartY;

    if (!this.data.advancedPaperArmed) {
      if (deltaX > -10 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      this._advancedPaperMoved = true;
      if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
      this.setData({
        advancedPaperArmed: true,
        advancedPaperDragging: true
      });
    }

    var dragX = Math.max(-92, Math.min(20, Math.round(deltaX * 0.78)));
    var fold = Math.max(0, Math.min(180, Math.round(-dragX * 2.4)));

    this.setData({
      advancedPaperDragX: dragX,
      advancedPaperRotate: -fold,
      advancedPaperBackVisible: fold >= 96
    });
  },

  onAdvancedPaperTouchEnd() {
    if (this.data.advancedPrintedSteps.length === ADVANCED_PRINT_STEPS.length) {
      this.openAdvancedPaperExplodedView();
      return;
    }
    if (!this.data.advancedPaperArmed) return;

    var shouldPrint = this.data.advancedPlacedBlockIndex > -1 && this.data.advancedPaperDragX <= -48;
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

  onAdvancedPaperTouchCancel() {
    this._advancedPaperMoved = false;
    this.setData({
      advancedPaperArmed: false,
      advancedPaperDragging: false,
      advancedPaperSnap: false,
      advancedPaperBackVisible: false,
      advancedPaperDragX: 0,
      advancedPaperRotate: 0
    });
  },

  openAdvancedPaperExplodedView() {
    if (this.data.advancedPrintedSteps.length !== ADVANCED_PRINT_STEPS.length) return;
    if (this.data.advancedWorkIndex >= ADVANCED_PRINT_SETS.length) {
      wx.navigateTo({ url: '/pages/exploded-view/exploded-view?showLatestUser=true' });
      return;
    }
    var preset = this.data.advancedWorkIndex === 1
      ? 'advanced-print-set-2'
      : 'advanced-print';
    wx.navigateTo({
      url: '/pages/exploded-view/exploded-view?preset=' + preset
    });
  },

  openAdvancedCreator() {
    this.setData({ advancedCreatorOpen: true });
  },

  _startCreatorWorking(stage) {
    clearInterval(this._creatorWorkingTimer);
    var messages = stage === 'generating'
      ? ['小年正在起稿构图', '正在铺设朱红与石黄', '正在补上青绿与墨线', '正在检查色块边界']
      : stage === 'assembling'
        ? ['小年正在装配 2.5D 木板', '正在把作品放入卷五']
        : ['小年正在辨认四种套色', '正在清理渐变和综合色', '正在生成四块分色木板', '正在校准套印位置'];
    var index = 0;
    this.setData({
      advancedCreatorStage: stage,
      advancedCreatorWorkingText: messages[0]
    });
    this._creatorWorkingTimer = setInterval(() => {
      index = (index + 1) % messages.length;
      this.setData({ advancedCreatorWorkingText: messages[index] });
    }, 2600);
  },

  _stopCreatorWorking() {
    clearInterval(this._creatorWorkingTimer);
    this._creatorWorkingTimer = null;
    this.setData({ advancedCreatorStage: '', advancedCreatorWorkingText: '' });
  },

  closeAdvancedCreator() {
    if (this.data.advancedCreatorGenerating || this.data.advancedCreatorSplitting) return;
    this.setData({ advancedCreatorOpen: false });
  },

  onAdvancedCreatorInput(e) {
    this.setData({ advancedCreatorInput: e.detail.value });
  },

  chooseAdvancedCreatorImage() {
    if (this.data.advancedCreatorGenerating || this.data.advancedCreatorSplitting) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        var file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) return;
        this.setData({
          advancedCreatorImage: file.tempFilePath,
          advancedCreatorFileID: ''
        });
      }
    });
  },

  generateAdvancedCreatorImage() {
    var input = String(this.data.advancedCreatorInput || '').trim();
    if (!input) {
      wx.showToast({ title: '请先输入创作主题', icon: 'none' });
      return;
    }
    if (this.data.advancedCreatorGenerating || this.data.advancedCreatorSplitting) return;

    var promptConfig = buildNianhuaImagePrompt(input);

    this.setData({
      advancedCreatorGenerating: true,
      advancedCreatorImage: '',
      advancedCreatorFileID: ''
    });
    this._startCreatorWorking('generating');

    wx.cloud.callFunction({
      name: 'generateImage-PBKj5J',
      data: {
        prompt: promptConfig.prompt,
        negative_prompt: promptConfig.negativePrompt,
        model: 'hunyuan-image',
        version: 'v1.9',
        size: '1024x1024',
        n: 1,
        revise: false
      },
      success: (res) => {
        var result = res.result || {};
        if (result.success && (result.fileID || result.imageUrl)) {
          this.setData({
            advancedCreatorImage: result.imageUrl || result.fileID,
            advancedCreatorFileID: result.fileID || '',
            advancedCreatorGenerating: false
          });
          this._stopCreatorWorking();
          return;
        }
        console.error('[卷五二创] 生图返回异常:', result);
        wx.showToast({ title: '生成失败，请重试', icon: 'none' });
        this.setData({ advancedCreatorGenerating: false });
        this._stopCreatorWorking();
      },
      fail: (err) => {
        console.error('[卷五二创] 生图调用失败:', err);
        wx.showToast({ title: '生成失败，请重试', icon: 'none' });
        this.setData({ advancedCreatorGenerating: false });
        this._stopCreatorWorking();
      }
    });
  },

  async splitAdvancedCreatorImage() {
    if (!this.data.advancedCreatorImage || this.data.advancedCreatorSplitting) return;
    this.setData({ advancedCreatorSplitting: true });
    this._startCreatorWorking('splitting');

    try {
      var imageSource = await this._prepareAdvancedCreatorImage();
      var result = await this._requestAdvancedCreatorSplit(imageSource);
      var record = await this._saveAdvancedCreatorLayers(result.layers || []);
      if (!record) throw new Error('分色结果为空');
      record.original = result.quantizedFileID || this.data.advancedCreatorFileID || this.data.advancedCreatorImage;

      var currentList = wx.getStorageSync('userColorLayers');
      var list = Array.isArray(currentList) ? currentList : [];
      wx.setStorageSync('userColorLayers', [record].concat(list.filter(function(item) {
        return item && item.id !== record.id;
      })).slice(0, 10));

      this._startCreatorWorking('assembling');
      await new Promise(function(resolve) { setTimeout(resolve, 700); });
      var workIndex = this._addAdvancedUserWork(record);
      this.setData({ advancedCreatorOpen: false });
      if (workIndex > -1) {
        this.switchAdvancedWork({ currentTarget: { dataset: { index: workIndex } } });
        wx.showToast({ title: '已加入作品切换', icon: 'success' });
      }
    } catch (err) {
      console.error('[卷五二创] 分色失败:', err);
      wx.showToast({ title: '分色失败，请重试', icon: 'none' });
    } finally {
      this._stopCreatorWorking();
      this.setData({ advancedCreatorSplitting: false });
    }
  },

  _prepareAdvancedCreatorImage() {
    if (this.data.advancedCreatorFileID) {
      return Promise.resolve(this.data.advancedCreatorFileID);
    }

    var filePath = this.data.advancedCreatorImage;
    if (!filePath || filePath.startsWith('cloud://')) {
      return Promise.resolve(filePath);
    }

    if (/^https?:\/\//i.test(filePath)) {
      return this._downloadAdvancedCreatorImage(filePath).then((tempFilePath) => {
        return this._uploadAdvancedCreatorSource(tempFilePath);
      });
    }

    return this._uploadAdvancedCreatorSource(filePath);
  },

  _downloadAdvancedCreatorImage(url) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url: url,
        timeout: 60000,
        success: function(res) {
          if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
            resolve(res.tempFilePath);
            return;
          }
          reject(new Error('生成年画下载失败 HTTP ' + res.statusCode));
        },
        fail: function(err) {
          reject(new Error((err && err.errMsg) || '生成年画下载失败'));
        }
      });
    });
  },

  _uploadAdvancedCreatorSource(filePath) {
    var cloudPath = 'user-creation/source/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
    return new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath,
        success: (res) => {
          this.setData({ advancedCreatorFileID: res.fileID || '' });
          resolve(res.fileID);
        },
        fail: function(err) {
          reject(new Error((err && err.errMsg) || '原图上传云端失败'));
        }
      });
    });
  },

  _requestAdvancedCreatorSplit(imageSource) {
    return new Promise(function(resolve, reject) {
      wx.cloud.callFunction({
        name: 'splitColors',
        data: {
          image: imageSource,
          imageBase64: imageSource,
          imageUrl: imageSource,
          removeBackground: true,
          maxColors: 4,
          palette: ['#191512', '#c93434', '#e7b82f', '#2f7a61'],
          paletteLabels: ['墨黑色版', '朱红色版', '石黄色版', '青绿色版'],
          flattenPalette: true
        },
        success: function(res) {
          var result = res.result || {};
          if (result.success && Array.isArray(result.layers)) {
            resolve(result);
            return;
          }
          reject(new Error(result.error || result.message || '云函数分色失败'));
        },
        fail: reject
      });
    });
  },

  async _saveAdvancedCreatorLayers(layers) {
    var fs = wx.getFileSystemManager();
    var timestamp = Date.now();
    var id = 'user_' + timestamp;
    var savedLayers = [];

    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      if (layer.fileID) {
        savedLayers.push({
          tempPath: layer.fileID,
          fileID: layer.fileID,
          color: layer.color || '',
          label: layer.label || ('图层' + (i + 1))
        });
        continue;
      }

      var base64Data = String(layer.data || layer.base64 || '').replace(/^data:image\/\w+;base64,/, '');
      if (!base64Data) continue;
      var tempPath = wx.env.USER_DATA_PATH + '/user_layer_' + id + '_' + i + '.png';
      fs.writeFileSync(tempPath, wx.base64ToArrayBuffer(base64Data), 'binary');
      savedLayers.push({
        tempPath: tempPath,
        color: layer.color || '',
        label: layer.label || ('图层' + (i + 1))
      });
    }

    if (!savedLayers.length) return null;
    return {
      id: id,
      title: String(this.data.advancedCreatorInput || '').trim() || '数字二创作品',
      isPreset: false,
      layers: savedLayers,
      timestamp: timestamp
    };
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

  onGalleryTouchStart(e) {
    if (!this._galleryEngine || !this._galleryTouch) return;
    const touches = e.touches || [];
    if (!this._galleryTouchesInGestureZone(touches)) {
      this._galleryTouch.mode = 'ignored';
      return;
    }
    if (this._galleryResumeTimer) {
      clearTimeout(this._galleryResumeTimer);
      this._galleryResumeTimer = null;
    }
    if (this.data.galleryAutoRotate) this._galleryEngine.setAutoRotate(false);
    this._galleryTouch.vyaw = 0;

    if (touches.length === 1) {
      const point = touches[0];
      const pointX = typeof point.clientX === 'number' ? point.clientX : point.x;
      const pointY = typeof point.clientY === 'number' ? point.clientY : point.y;
      this._galleryTouch.mode = 'rotate';
      this._galleryTouch.lastX = pointX;
      this._galleryTouch.lastY = pointY;
      this._galleryTouch.downX = pointX;
      this._galleryTouch.downY = pointY;
      this._galleryTouch.downTime = Date.now();
      this._galleryTouch.moved = false;
      this._galleryEngine.cancelIntro();
    } else if (touches.length === 2) {
      this._galleryTouch.mode = 'pinch';
      this._galleryTouch.lastPinchDist = this._galleryPinchDistance(touches);
      this._galleryTouch.moved = true;
    }
  },

  onGalleryTouchMove(e) {
    if (!this._galleryEngine || !this._galleryTouch) return;
    if (this._galleryTouch.mode === 'ignored') return;
    const touches = e.touches || [];
    if (this._galleryTouch.mode === 'rotate' && touches.length === 1) {
      const point = touches[0];
      const pointX = typeof point.clientX === 'number' ? point.clientX : point.x;
      const pointY = typeof point.clientY === 'number' ? point.clientY : point.y;
      const dx = pointX - this._galleryTouch.lastX;
      const dy = pointY - this._galleryTouch.lastY;
      this._galleryTouch.vyaw = this._galleryTouch.vyaw * 0.7 + dx * 0.0052 * 0.3;
      this._galleryTouch.lastX = pointX;
      this._galleryTouch.lastY = pointY;
      if (Math.abs(pointX - this._galleryTouch.downX) + Math.abs(pointY - this._galleryTouch.downY) > 8) {
        this._galleryTouch.moved = true;
      }
      this._galleryEngine.rotate(dx * 0.0052, dy * 0.0042);
    } else if (touches.length === 2) {
      const distance = this._galleryPinchDistance(touches);
      if (this._galleryTouch.lastPinchDist > 0 && distance > 0) {
        this._galleryEngine.zoomBy(this._galleryTouch.lastPinchDist / distance);
      }
      this._galleryTouch.lastPinchDist = distance;
      this._galleryTouch.moved = true;
    }
  },

  onGalleryTouchEnd(e) {
    if (!this._galleryEngine || !this._galleryTouch) return;
    const wasRotate = this._galleryTouch.mode === 'rotate';
    const remaining = e.touches ? e.touches.length : 0;
    if (wasRotate && !this._galleryTouch.moved && Date.now() - this._galleryTouch.downTime < 400) {
      const point = e.changedTouches && e.changedTouches[0];
      if (point) {
        const pointY = typeof point.clientY === 'number' ? point.clientY : point.y;
        const canvasPointX = typeof point.clientX === 'number' ? point.clientX : point.x;
        const hitId = this._galleryEngine.pick(canvasPointX, pointY);
        const artwork = hitId && this._galleryArtworks
          ? this._galleryArtworks.find(function(item) { return item.id === hitId; })
          : null;
        if (hitId === '__center_logo__') {
          this._galleryEngine.toggleCenterLayers();
          this.setData({ gallerySelectedArt: null, galleryShowGuide: false });
          if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
        } else {
          this._galleryEngine.select(artwork ? artwork.id : null);
          this.setData({ gallerySelectedArt: artwork, galleryShowGuide: false });
        }
      }
    }
    if (wasRotate && this._galleryTouch.moved && Math.abs(this._galleryTouch.vyaw) > 0.003) {
      this._galleryEngine.setVelocity(this._galleryTouch.vyaw);
    }
    if (remaining === 0) this._galleryTouch.mode = 'none';
    if (this.data.galleryAutoRotate) {
      this._galleryResumeTimer = setTimeout(() => {
        if (this._galleryEngine) this._galleryEngine.setAutoRotate(true);
      }, 2500);
    }
  },

  _galleryPinchDistance(touches) {
    const firstX = typeof touches[0].clientX === 'number' ? touches[0].clientX : touches[0].x;
    const firstY = typeof touches[0].clientY === 'number' ? touches[0].clientY : touches[0].y;
    const secondX = typeof touches[1].clientX === 'number' ? touches[1].clientX : touches[1].x;
    const secondY = typeof touches[1].clientY === 'number' ? touches[1].clientY : touches[1].y;
    const dx = firstX - secondX;
    const dy = firstY - secondY;
    return Math.sqrt(dx * dx + dy * dy);
  },

  _galleryTouchesInGestureZone(touches) {
    if (!touches.length) return false;
    let windowInfo;
    try {
      windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    } catch (e) {
      return true;
    }
    const scale = (windowInfo.windowWidth || 375) / 750;
    const left = 72 * scale;
    const right = (windowInfo.windowWidth || 375) - 96 * scale;
    const top = 300 * scale;
    const bottom = (windowInfo.windowHeight || 667) - 210 * scale;
    return touches.every(function(point) {
      const x = typeof point.clientX === 'number' ? point.clientX : point.x;
      const y = typeof point.clientY === 'number' ? point.clientY : point.y;
      return x >= left && x <= right && y >= top && y <= bottom;
    });
  },

  toggleGalleryAutoRotate() {
    const enabled = !this.data.galleryAutoRotate;
    this.setData({ galleryAutoRotate: enabled });
    if (this._galleryEngine) this._galleryEngine.setAutoRotate(enabled);
  },

  resetGalleryView() {
    if (!this._galleryEngine) return;
    this._galleryEngine.cancelIntro();
    this._galleryEngine.yaw = 0.55;
    this._galleryEngine.pitch = 0.24;
    this._galleryEngine.radius = 13.5;
    this._galleryEngine.setVelocity(0);
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  closeGalleryArtwork() {
    if (this._galleryEngine) this._galleryEngine.select(null);
    this.setData({ gallerySelectedArt: null });
  },

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
    const video = Object.assign({}, this.data.channelVideos[index], {
      feedToken: normalizeFeedToken(this.data.channelVideos[index].feedToken)
    });
    this._videoErrorCount = 0;  // 切换视频时重置错误计数
    this.setData({
      currentVideoIndex: index,
      currentVideo: video,
      videoPlaying: false,
      videoEmbedStatus: 'ready',
      videoStatusText: '准备内嵌视频号视频',
      videoErrorText: '',
      useFallbackMode: false
    });
  },

  onVideoPlay() {
    this.setData({
      videoPlaying: true,
      videoEmbedStatus: 'playing',
      videoStatusText: '内嵌播放已开始',
      videoErrorText: ''
    });
    // 播放视频时暂停背景音乐
    if (this.bgMusic && this.data.musicPlaying) {
      this.bgMusic.pause();
      this.setData({ musicPlaying: false });
    }
  },

  onVideoPause() {
    this.setData({
      videoPlaying: false,
      videoEmbedStatus: 'paused',
      videoStatusText: '视频已暂停'
    });
    // 视频暂停后恢复背景音乐（如果之前是播放状态）
    if (this.bgMusic && this.data.musicTriggered && !this.data.musicPlaying) {
      this.bgMusic.play();
      this.setData({ musicPlaying: true });
    }
  },

  onVideoEnded() {
    this.setData({
      videoPlaying: false,
      videoEmbedStatus: 'ended',
      videoStatusText: '视频已播放结束'
    });
    // 视频结束后恢复背景音乐
    if (this.bgMusic && this.data.musicTriggered && !this.data.musicPlaying) {
      this.bgMusic.play();
      this.setData({ musicPlaying: true });
    }
  },

  onVideoError(e) {
    const errMsg = (e.detail && e.detail.errMsg) || JSON.stringify(e.detail || {});
    console.error('[视频号] 播放出错:', errMsg, '当前视频:', this.data.currentVideo.title, 'finderUserName:', this.data.currentVideo.finderUserName, 'feedToken:', this.data.currentVideo.feedToken);
    const isPermissionError = errMsg.indexOf('141610') > -1;
    this.setData({
      videoPlaying: false,
      videoEmbedStatus: 'error',
      videoStatusText: isPermissionError
        ? '内嵌失败：请检查视频号ID权限与24小时生效'
        : '内嵌失败，已切换到跳转兜底',
      videoErrorText: errMsg,
      useFallbackMode: true
    });

    // 141610/1416106 常见于后台权限未开启/未生效、非个人主体要求、主体关联或 token 权限不满足。
    if (isPermissionError) {
      this._videoErrorCount = (this._videoErrorCount || 0) + 1;
      console.log('[视频号] 141610 权限类错误次数:', this._videoErrorCount);
    }
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

  goToVolumeFive() {
    this.setData({
      showEraDetail: false,
      currentEra: -1,
      currentPage: 4
    });
  },

  viewAdvancedBlock3D() {
    var block = this.data.advancedPlacedBlock || this.data.advancedActiveBlock;
    if (!block || !block.boardImage) {
      wx.showToast({ title: '请先选择一块木板', icon: 'none' });
      return;
    }
    var app = getApp();
    var currentWork = this.data.advancedCurrentWork || {};
    var useProcedural = currentWork.isUserCreated || !block.modelFileID;
    app.globalData._pendingModelUrl = block.modelFileID;
    app.globalData._pendingModelName = block.name + (useProcedural ? ' · 2.5D 木板' : ' · 3D 特写');
    app.globalData._pendingModelPreview = block.boardImage;
    app.globalData._pendingModelMode = useProcedural ? 'procedural' : 'glb';
    if (useProcedural) {
      app.globalData._pendingModelUrl = '';
      app.globalData._xiaonianModelContext = {
        unavailable: true,
        name: block.name + ' · 2.5D 木板'
      };
      wx.navigateTo({ url: '/pages/model3d-viewer/model3d-viewer' });
      return;
    }
    modelLab.setCurrentModel({
      assetId: (this.data.advancedCurrentWork && this.data.advancedCurrentWork.id || 'preset') + '-' + (block.shortName || block.name),
      name: block.name + ' · 3D 特写',
      source: block.modelFileID,
      originalSource: block.modelFileID,
      ownerId: 'preset-readonly'
    });
    wx.navigateTo({ url: '/pages/model3d-viewer/model3d-viewer' });
  },

  viewAdvancedProceduralBoard(e) {
    var index = parseInt(e.currentTarget.dataset.index, 10);
    var steps = getAdvancedPrintSteps(this.data.advancedWorkIndex);
    if (!Number.isFinite(index) || index < 0 || index >= steps.length) return;

    var block = steps[index];
    this.setData({
      advancedBoardPreviewOpen: true,
      advancedBoardPreview: block,
      advancedBoardPreviewRotateX: -6,
      advancedBoardPreviewRotateY: -18,
      advancedBoardPreviewScale: 1
    });
  },

  closeAdvancedBoardPreview() {
    this._advancedBoardPreviewTouch = null;
    this.setData({
      advancedBoardPreviewOpen: false,
      advancedBoardPreview: null
    });
  },

  onAdvancedBoardPreviewTouchStart(e) {
    var touches = e.touches || [];
    if (touches.length === 1) {
      this._advancedBoardPreviewTouch = {
        mode: 'rotate',
        x: touches[0].clientX,
        y: touches[0].clientY,
        rotateX: this.data.advancedBoardPreviewRotateX,
        rotateY: this.data.advancedBoardPreviewRotateY
      };
      return;
    }
    if (touches.length === 2) {
      var dx = touches[0].clientX - touches[1].clientX;
      var dy = touches[0].clientY - touches[1].clientY;
      this._advancedBoardPreviewTouch = {
        mode: 'scale',
        distance: Math.sqrt(dx * dx + dy * dy),
        scale: this.data.advancedBoardPreviewScale
      };
    }
  },

  onAdvancedBoardPreviewTouchMove(e) {
    var touchState = this._advancedBoardPreviewTouch;
    var touches = e.touches || [];
    if (!touchState) return;

    if (touchState.mode === 'scale' && touches.length === 2) {
      var dx = touches[0].clientX - touches[1].clientX;
      var dy = touches[0].clientY - touches[1].clientY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var nextScale = touchState.scale * distance / Math.max(1, touchState.distance);
      this.setData({
        advancedBoardPreviewScale: Math.max(0.72, Math.min(2.4, nextScale))
      });
      return;
    }

    if (touchState.mode === 'rotate' && touches.length === 1) {
      var deltaX = touches[0].clientX - touchState.x;
      var deltaY = touches[0].clientY - touchState.y;
      this.setData({
        advancedBoardPreviewRotateX: Math.max(-72, Math.min(72, touchState.rotateX - deltaY * 0.45)),
        advancedBoardPreviewRotateY: touchState.rotateY + deltaX * 0.55
      });
    }
  },

  onAdvancedBoardPreviewTouchEnd(e) {
    if (e.touches && e.touches.length) {
      this.onAdvancedBoardPreviewTouchStart(e);
      return;
    }
    this._advancedBoardPreviewTouch = null;
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
