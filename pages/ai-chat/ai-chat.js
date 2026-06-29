const { CloudbaseTransport, createAGUIBehavior } = require('@cloudbase/agent-ui-miniprogram');

const NIANHUA_KNOWLEDGE = `你是"小年"，佛山木版年画数字传承助手。

## 知识库

### 佛山木版年画简介
佛山木版年画是中国广东佛山地区的传统民间美术品，与天津杨柳青、苏州桃花坞、山东杨家埠并称为中国四大木版年画。始于宋元，盛于明清，已有七百年历史。2006年入选首批国家级非物质文化遗产名录。

### 五色套印工艺
五色套印是佛山年画最核心的工艺：
1. 黑色版（线版）：勾画轮廓、五官、衣纹
2. 红色版：填充主体、衣袍、吉祥纹样底色
3. 黄色版：点缀装饰细节、花纹边缘、金线
4. 深黄色版：文字、边框、木纹等厚重色块
5. 蓝色版：天空、水纹、青蓝装饰

### 常见题材与寓意
- 门神（秦琼、尉迟恭）：驱邪避灾、保家护宅
- 福禄寿三星：福星赐福、禄星加官、寿星延寿
- 麒麟送子：早得贵子、家族兴旺
- 年年有余：莲花和鱼，谐音"年余"
- 花开富贵：牡丹，象征繁荣昌盛

### 小程序功能
本小程序"佛山年画传薪"提供：
1. AI年画创作：输入主题，AI生成年画风格作品
2. 五色套印体验：交互式模拟套印过程
3. 2D分色展示：拆解为五个独立图层
4. 3D模型展厅：浏览三维模型
5. 视频学堂：观看年画相关视频

## 回答规则
1. 回答风格：亲切、专业、富有文化韵味
2. 如果用户问非年画相关话题，礼貌引导回年画话题
3. 介绍年画知识时，可适当引用寓意和典故
4. 鼓励用户体验小程序的各项功能`;

Page({
  data: {
    messages: [],
    inputText: '',
    isRunning: false,
    scrollToId: ''
  },

  onLoad() {
    this._msgId = 0;
    this._initAgent();
  },

  _initAgent() {
    try {
      const transport = new CloudbaseTransport({
        botId: 'ibot-xiaonian-njppux'
      });

      this._agentBehavior = createAGUIBehavior({
        transport: transport,
        onRawEvent: (event) => {
          this._handleAgentEvent(event);
        }
      });
    } catch (err) {
      console.error('[小年] Agent初始化失败，使用本地知识库模式:', err);
      this._useLocalMode = true;
    }
  },

  _handleAgentEvent(event) {
    if (event.type === 'text_message_chunk' && event.text) {
      this._appendAssistantChunk(event.text);
    } else if (event.type === 'run_finished') {
      this.setData({ isRunning: false });
    }
  },

  _appendAssistantChunk(text) {
    const messages = this.data.messages;
    const lastMsg = messages[messages.length - 1];

    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.streaming) {
      lastMsg.content += text;
      this.setData({ messages: messages });
    } else {
      const newMsg = {
        id: 'msg-' + (++this._msgId),
        role: 'assistant',
        content: text,
        streaming: true
      };
      messages.push(newMsg);
      this.setData({ messages: messages });
    }
    this._scrollToBottom();
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  sendSuggestion(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ inputText: text });
    this.sendMessage();
  },

  async sendMessage() {
    const text = this.data.inputText.trim();
    if (!text || this.data.isRunning) return;

    const userMsg = {
      id: 'msg-' + (++this._msgId),
      role: 'user',
      content: text
    };

    const messages = this.data.messages.concat([userMsg]);
    this.setData({
      messages: messages,
      inputText: '',
      isRunning: true
    });
    this._scrollToBottom();

    if (this._agentBehavior && !this._useLocalMode) {
      try {
        this._agentBehavior.agui.sendMessage(text);
        return;
      } catch (err) {
        console.error('[小年] 远程调用失败，降级到本地:', err);
      }
    }

    this._localReply(text);
  },

  _localReply(userText) {
    const reply = this._generateLocalReply(userText);
    const messages = this.data.messages;
    const assistantMsg = {
      id: 'msg-' + (++this._msgId),
      role: 'assistant',
      content: '',
      streaming: true
    };
    messages.push(assistantMsg);
    this.setData({ messages: messages });

    let index = 0;
    const typeWriter = () => {
      if (index < reply.length) {
        assistantMsg.content = reply.substring(0, index + 1);
        this.setData({ messages: messages });
        this._scrollToBottom();
        index += 2;
        setTimeout(typeWriter, 30);
      } else {
        assistantMsg.content = reply;
        assistantMsg.streaming = false;
        this.setData({ messages: messages, isRunning: false });
      }
    };
    setTimeout(typeWriter, 300);
  },

  _generateLocalReply(userText) {
    const text = userText.toLowerCase();

    if (text.includes('特色') || text.includes('特点') || text.includes('风格')) {
      return '佛山年画的特色可以用八个字概括：色彩浓烈、线条粗犷。\n\n它以大红大绿为主色调，常伴有金银勾边，构图饱满，寓意吉祥。与其他三大年画相比，佛山年画最具特色的是"五色套印"工艺——一幅画由黑、红、黄、深黄、蓝五个独立刻版逐层套印完成，对位要求极高。\n\n想体验套印过程吗？可以在小程序的"版台"章节试试哦！';
    }

    if (text.includes('套印') || text.includes('五色') || text.includes('工艺')) {
      return '五色套印是佛山年画最核心的工艺：\n\n1️⃣ 黑色版（线版）：勾画轮廓，是骨架\n2️⃣ 红色版：填充主体和衣袍\n3️⃣ 黄色版：点缀装饰细节\n4️⃣ 深黄色版：文字和边框\n5️⃣ 蓝色版：天空和水纹\n\n套印的难点在于：五块版必须精准对位，错开一毫米画面就花了。老工匠靠几十年的手感才能做到。\n\n在本小程序的"版台"章节，你可以亲手体验这个套印过程！';
    }

    if (text.includes('门神') || text.includes('秦琼') || text.includes('尉迟')) {
      return '门神是佛山年画最经典的题材！\n\n最常见的是秦琼和尉迟恭这对门神。传说唐太宗夜里常做噩梦，两位将军主动守宫门，果然太平。太宗心疼他们辛苦，便命人画下二人画像贴于门上，从此流传为门神习俗。\n\n佛山年画中的门神，手持双锏（秦琼）和金鞭（尉迟恭），怒目圆睁，气势威猛，寓意驱邪避灾、保家护宅。';
    }

    if (text.includes('历史') || text.includes('起源') || text.includes('由来')) {
      return '佛山木版年画始于宋元，盛于明清，已有七百年历史。\n\n佛山作为中国四大名镇之一，手工业发达，造纸、刻版、印刷产业链完整。清代佛山有年画作坊200余家，从业人员过万，产品远销东南亚。\n\n2006年，佛山木版年画入选首批国家级非物质文化遗产名录。如今通过AI、3D等数字技术，这项古老技艺正在焕发新生。';
    }

    if (text.includes('寓意') || text.includes('吉祥') || text.includes('福禄寿')) {
      return '佛山年画的每个图案都有吉祥寓意：\n\n🏮 门神：驱邪避灾、保家护宅\n🏮 福禄寿三星：福星赐福、禄星加官、寿星延寿\n🏮 麒麟送子：早得贵子、家族兴旺\n🏮 年年有余：莲花和鱼，谐音"年余"\n🏮 花开富贵：牡丹，象征繁荣昌盛\n🏮 万象更新：大象背万年青，新年新气象\n\n年画不只是装饰，更承载着人们对美好生活的祈愿。';
    }

    if (text.includes('功能') || text.includes('能做什么') || text.includes('使用') || text.includes('怎么用')) {
      return '本小程序"佛山年画传薪"提供这些功能：\n\n🎨 AI年画创作 — 输入主题，AI生成年画风格作品\n🖨️ 五色套印体验 — 交互式模拟套印过程\n🌈 2D分色展示 — 拆解为五个独立图层\n📐 3D模型展厅 — 浏览三维模型\n📺 视频学堂 — 观看年画相关视频\n\n从首页向下滑动即可探索各章节！';
    }

    if (text.includes('你好') || text.includes('hi') || text.includes('hello')) {
      return '你好呀！我是小年，佛山木版年画数字传承助手🏮\n\n我可以为你介绍年画的历史、工艺、题材和寓意，也可以引导你体验小程序的各项功能。\n\n想了解什么呢？';
    }

    return '这是个有趣的问题！\n\n我是佛山木版年画传承助手，主要擅长年画的历史、五色套印工艺、门神故事、吉祥寓意等话题。\n\n你可以问我：\n• 佛山年画有什么特色？\n• 五色套印是什么工艺？\n• 门神有哪些故事？\n• 年画图案有什么寓意？\n\n也可以体验小程序的AI生图和套印功能哦！';
  },

  _scrollToBottom() {
    const messages = this.data.messages;
    if (messages.length === 0) return;
    const lastId = 'msg-' + messages[messages.length - 1].id;
    this.setData({ scrollToId: lastId });
  },

  goBack() {
    wx.navigateBack();
  },

  onUnload() {
    if (this._agentBehavior && this._agentBehavior.agui) {
      try {
        this._agentBehavior.agui.reset();
      } catch (e) {}
    }
  }
});
