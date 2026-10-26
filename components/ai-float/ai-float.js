const { askXiaonian, getCapabilityText, getAvatarState, toggleAvatar } = require('../../utils/xiaonianAI');

const TUTORIAL_AUTO_LIMIT = 2;
const TUTORIAL_COUNT_KEY_PREFIX = 'nianhuaTutorialAutoCount:';
const PRESET_TEACHING_MESSAGES = {
  'volume-five': '卷五版台操作提示：先点击下方木板把它放上版台，再按住右侧纸张向左翻印；按墨、红、黄、绿的顺序完成后，点击成画纸张可进入 2D 分色展厅，点击版台木板可进入 3D 展厅。',
  'volume-five-complete': '四色套印已经完成。接下来可以点击成画纸张进入 2D 分色展厅，或点击版台上的木板进入 3D 展厅观察雕刻细节。',
  'two-d': '2D 分色展厅手势提示：单击画面可在展开与重合之间切换；快速双击可切换 Z 轴与扇形展法；持续长按会按套印顺序循环显现各色图层，松手停止。拖动可旋转，双指开合可缩放。',
  'three-d': '3D 展厅操作提示：单指拖动旋转木板，双指开合缩放；需要检查模型或了解雕刻细节时，随时点我。',
  'two-point-five-d': '2.5D 展厅操作提示：单指拖动旋转，双指开合缩放。正面来自你的分色木板图，侧面厚度由程序生成。'
};

Component({
  data: {
    btnX: 0,
    btnY: 0,
    isDragging: false,
    chatOpen: false,
    messages: [],
    inputText: '',
    isRunning: false,
    scrollToId: '',
    pageContext: '佛山年画传承助手',
    suggestion1: '佛山年画有什么特色？',
    suggestion2: '五色套印是什么？',
    capabilityText: getCapabilityText(),
    avatarUrl: '',
    avatarGender: 'girl',
    bubbleVisible: false,
    bubbleText: '',
    bubbleLeft: 0,
    bubbleTop: 0,
    bubbleWidth: 220,
    bubbleSide: 'left',
    tutorialOpen: false,
    tutorialStep: 0,
    tutorialTitle: '',
    tutorialText: '',
    tutorialMaskTop: '',
    tutorialMaskLeft: '',
    tutorialMaskRight: '',
    tutorialMaskBottom: '',
    tutorialCardStyle: ''
  },

  lifetimes: {
    attached() {
      const sysInfo = wx.getWindowInfo();
      this._screenW = sysInfo.windowWidth;
      this._screenH = sysInfo.windowHeight;
      this._btnSize = 56;
      this._bubbleWidth = Math.min(220, this._screenW - 96);
      this._shownProactiveChapters = new Set();
      this._offeredTutorialModes = new Set();

      this.setData({
        btnX: 28,
        btnY: Math.max(128, Math.round(this._screenH * 0.18)),
        bubbleWidth: this._bubbleWidth,
        ...getAvatarState()
      });
      this._msgId = 0;
      this._history = [];
      this._scheduleProactive('入门', 7000);
      if (!wx.getStorageSync('nianhuaOnboardingSeen')) {
        setTimeout(() => this.startSpotlightTutorial(), 7000);
      }
    },

    detached() {
      clearTimeout(this._proactiveTimer);
      clearTimeout(this._bubbleHideTimer);
      clearTimeout(this._contextTutorialTimer);
      if (this._tutorialAudio) this._tutorialAudio.destroy();
    }
  },

  pageLifetimes: {
    show() {
      this.setData(getAvatarState());
    }
  },

  methods: {
    // 设置页面上下文
    setPageContext(info) {
      const chapter = info.chapter || '首页';
      const ctx = `当前在「${chapter}」`;
      const suggestions = this._getSuggestions(chapter);
      this.setData({
        pageContext: ctx,
        suggestion1: suggestions[0],
        suggestion2: suggestions[1]
      });
      this._scheduleProactive(chapter);
      clearTimeout(this._contextTutorialTimer);
      if (chapter === '版台') {
        this._offerContextTutorial('volume-five', 450);
      }
      if (String(chapter).indexOf('2D分色展厅') === 0) {
        this._tutorialMode = 'two-d';
      }
      if (String(chapter).indexOf('3D展厅') === 0) {
        this._offerContextTutorial('three-d', 700);
      }
      if (String(chapter).indexOf('2.5D展厅') === 0) {
        this._offerContextTutorial('two-point-five-d', 700);
      }
    },

    _getProactiveText(chapter) {
      const messages = {
        '入门': '第一次来吗？点我开始新手导览：向下滑动逐卷探索，卷五可以套印、看分色炸开和生成 3D。',
        '溯源': '这一卷藏着七百年的传承故事，要我讲一段吗？',
        '器具': '拳刀、弯刀各有用处，我可以帮你认工具。',
        '工艺': '从起稿到晾晒，每一步都有讲究。',
        '版台': '先选一块木板，再双击纸张并向左翻印；下方还能看 2D 炸开、3D 展厅或生成当前木板的 3D 预置。',
        '图鉴': '门神、麒麟、牡丹，你想先听哪幅的寓意？',
        '测验': '遇到不会的题可以问我，但我先不给你直接剧透。',
        '探索': '想去 3D 展厅，或把图片生成 3D 模型吗？',
        '关于': '这里记录着传承团队，我也能介绍项目功能。'
      };
      return messages[chapter] || '需要帮助时点我，我会结合当前页面回答。';
    },

    _scheduleProactive(chapter, delay) {
      if (this._shownProactiveChapters.has(chapter)) return;
      this._shownProactiveChapters.add(chapter);
      clearTimeout(this._proactiveTimer);
      this._proactiveTimer = setTimeout(() => {
        const position = this._getBubblePosition(this.data.btnX, this.data.btnY);
        this.setData({
          bubbleVisible: true,
          bubbleText: this._getProactiveText(chapter),
          ...position
        });
        clearTimeout(this._bubbleHideTimer);
        this._bubbleHideTimer = setTimeout(() => {
          this.setData({ bubbleVisible: false });
        }, 5200);
      }, typeof delay === 'number' ? delay : 900);
    },

    _getBubblePosition(btnX, btnY) {
      const bubbleSide = btnX > this._screenW / 2 ? 'left' : 'right';
      const preferredLeft = bubbleSide === 'left'
        ? btnX - this._bubbleWidth - 12
        : btnX + this._btnSize + 12;
      return {
        bubbleSide,
        bubbleLeft: Math.max(10, Math.min(this._screenW - this._bubbleWidth - 10, preferredLeft)),
        bubbleTop: Math.max(76, Math.min(this._screenH - 110, btnY - 2))
      };
    },

    _getSuggestions(chapter) {
      const map = {
        '入门': ['开始首页新手导览', '佛山年画是什么？'],
        '溯源': ['年画起源于哪个朝代？', '为什么佛山年画能成为非遗？'],
        '器具': ['雕版用什么木材？', '有哪些雕刻工具？'],
        '工艺': ['五色套印是什么？', '年画制作有哪些步骤？'],
        '版台': ['卷五怎么操作？', '五块版的顺序是什么？'],
        '图鉴': ['门神有哪些故事？', '年画常见题材有哪些？'],
        '测验': ['门神是谁？', '年画入选非遗是哪年？'],
        '探索': ['打开3D模型展厅', '打开AI图生3D'],
        '3D展厅': ['检查当前模型', '模型实验室能做什么？'],
        '2D分色展厅': ['2D展厅手势怎么用？', '四色图层如何套印？'],
        '2.5D展厅': ['这块木板是怎么生成的？', '为什么二创使用2.5D？'],
        '关于': ['打开AI年画创作', '打开年画分色套印体验'],
        '视频学堂': ['年画有什么特色？', '五色套印是什么？']
      };
      if (String(chapter || '').indexOf('3D展厅') === 0) return map['3D展厅'];
      if (String(chapter || '').indexOf('2D分色展厅') === 0) return map['2D分色展厅'];
      if (String(chapter || '').indexOf('2.5D展厅') === 0) return map['2.5D展厅'];
      return map[chapter] || ['佛山年画有什么特色？', '五色套印是什么？'];
    },

    // 拖拽逻辑
    onTouchStart(e) {
      this._startX = e.touches[0].clientX;
      this._startY = e.touches[0].clientY;
      this._startBtnX = this.data.btnX;
      this._startBtnY = this.data.btnY;
      this._moved = false;
      this._touchStartTime = Date.now();
    },

    onTouchMove(e) {
      const dx = e.touches[0].clientX - this._startX;
      const dy = e.touches[0].clientY - this._startY;
      // 阈值放宽到 12px，避免轻点时手指微滑被判成拖拽导致打不开聊天
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
        this._moved = true;
        this.setData({ isDragging: true });
      }
      if (!this._moved) return;
      let newX = this._startBtnX + dx;
      let newY = this._startBtnY + dy;
      newX = Math.max(10, Math.min(this._screenW - this._btnSize - 10, newX));
      newY = Math.max(80, Math.min(this._screenH - this._btnSize - 10, newY));
      this.setData({
        btnX: newX,
        btnY: newY,
        ...this._getBubblePosition(newX, newY)
      });
    },

    onTouchEnd() {
      // 拖拽中：仅复位拖拽状态
      if (this.data.isDragging) {
        this.setData({ isDragging: false });
        this._moved = false;
        return;
      }
      // 非拖拽：判定为点击。再加一道时间保险——按下超过 500ms 也视为长按不触发
      const elapsed = Date.now() - (this._touchStartTime || 0);
      if (!this._moved && elapsed < 500) {
        this.setData({ chatOpen: true, bubbleVisible: false });
      }
      this._moved = false;
    },

    // 打开/关闭聊天（保留给外部调用，不再由 tap 触发）
    openChat() {
      this.setData({ chatOpen: true, bubbleVisible: false });
    },

    openFromBubble() {
      this.openChat();
    },

    closeChat() {
      this.setData({ chatOpen: false });
    },

    noop() {},

    switchAvatar() {
      this.setData(toggleAvatar());
    },

    onInput(e) {
      this.setData({ inputText: e.detail.value });
    },

    sendSuggestion(e) {
      const text = e.currentTarget.dataset.text;
      if (text === '开始首页新手导览') {
        this.startHomeTutorial();
        return;
      }
      this.setData({ inputText: text });
      this.sendMessage();
    },

    startSpotlightTutorial() {
      this.setData({ tutorialOpen: true, tutorialStep: 0, chatOpen: false, bubbleVisible: false }, () => {
        this._renderTutorialStep(0);
      });
    },

    startTwoDInteractionGuide() {
      this._offerContextTutorial('two-d', 180);
    },

    startVolumeFiveCompletionGuide() {
      this._offerContextTutorial('volume-five-complete', 180);
    },

    _offerContextTutorial(mode, delay) {
      this._tutorialMode = mode;
      if (this._offeredTutorialModes.has(mode)) return;
      clearTimeout(this._contextTutorialTimer);
      this._contextTutorialTimer = setTimeout(() => {
        this._offeredTutorialModes.add(mode);
        const storageKey = TUTORIAL_COUNT_KEY_PREFIX + mode;
        const shownCount = Number(wx.getStorageSync(storageKey)) || 0;
        if (shownCount < TUTORIAL_AUTO_LIMIT) {
          wx.setStorageSync(storageKey, shownCount + 1);
          this.startSpotlightTutorial();
          return;
        }
        this._pushPresetTeachingMessage(mode);
      }, typeof delay === 'number' ? delay : 450);
    },

    _pushPresetTeachingMessage(mode) {
      const content = PRESET_TEACHING_MESSAGES[mode];
      if (!content) return;
      clearTimeout(this._proactiveTimer);
      const botMsg = {
        id: 'msg-' + (++this._msgId),
        role: 'assistant',
        content
      };
      this._history.push({ role: 'assistant', content });
      const position = this._getBubblePosition(this.data.btnX, this.data.btnY);
      this.setData({
        messages: this.data.messages.concat([botMsg]),
        bubbleVisible: true,
        bubbleText: '我把本页操作提示发到消息里了，点我查看。',
        ...position
      });
      clearTimeout(this._bubbleHideTimer);
      this._bubbleHideTimer = setTimeout(() => {
        this.setData({ bubbleVisible: false });
      }, 7200);
      this._scrollToBottom();
    },

    _tutorialSteps() {
      if (this._tutorialMode === 'volume-five-complete') {
        return [
          { selector: '.advanced-proof-paper', title: '四色套印完成', text: '点击成画纸张，进入 2D 分色展厅继续观察四色图层。' },
          { selector: '.advanced-board-slot', title: '再看雕版细节', text: '点击版台上的木板，进入高清 3D 展厅；小年会在展厅里继续陪你。' }
        ];
      }
      if (this._tutorialMode === 'two-d') {
        return [
          { selector: '.stage', title: '单击展开或重合', text: '单击画面一次，可让全部色版沿当前布局展开，或重新重合成完整年画。' },
          { selector: '.stage', title: '双击切换展法', text: '在画面中心快速双击，可在 Z 轴展开和扇形展开之间切换。' },
          { selector: '.stage', title: '长按观看套印', text: '按住画面不松手，各色图层会按套印顺序循环显现；松手即停止。' }
        ];
      }
      if (this._tutorialMode === 'three-d') {
        return [
          { selector: '#webgl', title: '观察木板全貌', text: '单指拖动旋转木板，双指开合缩放，查看雕刻纹理和侧面厚度。' },
          { selector: '.ai-float-btn', title: '在展厅里问小年', text: '点击小年，可以检查当前模型、调整副本或恢复历史版本。' }
        ];
      }
      if (this._tutorialMode === 'two-point-five-d') {
        return [
          { selector: '#webgl', title: '观察二创木板', text: '单指拖动旋转，双指开合缩放；正面使用你的四色分版纹理，侧面由程序实时生成。' },
          { selector: '.ai-float-btn', title: '继续问小年', text: '点击小年，可以了解四色分版和 2.5D 木板的生成过程。' }
        ];
      }
      const inVolumeFive = this.data.pageContext.indexOf('版台') >= 0;
      if (inVolumeFive) {
        return [
          { selector: '.advanced-board-tray', title: '先选一块木板', text: '点击下方旋转木板，把它放上版台。' },
          { selector: '.advanced-board-slot', title: '这里是版台', text: '点击台上的木板，可以进入高清 3D 展厅。' },
          { selector: '.advanced-proof-paper', title: '向左翻印', text: '按住纸张向左拖动，按墨、红、黄、绿依次套印。' }
        ];
      }
      return [
        { selector: '.s1-print-stage', title: '重看套印过程', text: '点击上方年画，可以重新播放四色套印和人物欢迎动画。' },
        { selector: '.nav-dots', title: '先认识卷签', text: '点击卷签或滑动页面，浏览佛山木版年画的八卷内容。' },
        { selector: '.scroll-arrow', title: '上下翻阅画卷', text: '在页面空白处向上或向下滑动，逐卷阅读。' },
        { selector: '.ai-float-btn', title: '随时问小年', text: '点击左上角的小年，可以提问、听讲解或重新打开教程。' }
      ];
    },

    _renderTutorialStep(index) {
      const steps = this._tutorialSteps();
      if (!steps[index]) {
        this.finishSpotlightTutorial();
        return;
      }
      const step = steps[index];
      const query = wx.createSelectorQuery();
      query.select(step.selector).boundingClientRect((rect) => {
        if (!rect || !rect.width || !rect.height) {
          this._renderTutorialStep(index + 1);
          return;
        }
        const pad = 8;
        const left = Math.max(4, rect.left - pad);
        const top = Math.max(4, rect.top - pad);
        const right = Math.min(this._screenW - 4, rect.right + pad);
        const bottom = Math.min(this._screenH - 4, rect.bottom + pad);
        const cardTop = bottom + 14 < this._screenH - 130 ? bottom + 14 : Math.max(78, top - 118);
        const cardLeft = Math.max(16, Math.min(this._screenW - 286, left));
        this.setData({
          tutorialStep: index,
          tutorialTitle: step.title,
          tutorialText: step.text,
          tutorialMaskTop: `left:0;top:0;width:100%;height:${top}px;`,
          tutorialMaskLeft: `left:0;top:${top}px;width:${left}px;height:${bottom - top}px;`,
          tutorialMaskRight: `left:${right}px;top:${top}px;width:${this._screenW - right}px;height:${bottom - top}px;`,
          tutorialMaskBottom: `left:0;top:${bottom}px;width:100%;height:${this._screenH - bottom}px;`,
          tutorialCardStyle: `left:${cardLeft}px;top:${cardTop}px;`
        });
        this._playTutorialAudio(step.audio);
      }).exec();
    },

    nextSpotlightTutorial() {
      this._renderTutorialStep(this.data.tutorialStep + 1);
    },

    finishSpotlightTutorial() {
      wx.setStorageSync('nianhuaOnboardingSeen', true);
      if (this.data.pageContext.indexOf('版台') >= 0) {
        wx.setStorageSync('nianhuaVolumeFiveGuideSeen', true);
      }
      this.setData({ tutorialOpen: false });
      this._tutorialMode = '';
    },

    skipSpotlightTutorial() {
      this.finishSpotlightTutorial();
    },

    _playTutorialAudio(audioUrl) {
      if (!audioUrl) return;
      if (!this._tutorialAudio) this._tutorialAudio = wx.createInnerAudioContext();
      this._tutorialAudio.src = audioUrl;
      this._tutorialAudio.play();
    },

    startHomeTutorial() {
      const guide = [
        '首页由八卷组成，右侧卷签可以快速跳转，也可以上下滑动逐卷阅读。',
        '卷一到卷四：先看佛山木版年画的来历，再认识刀具、木材和5项核心工序；完整制作还包含20多道细分步骤。',
        '卷五版台：点击下方木板放上版台；双击右侧纸张后向左翻动，完成逐色套印。',
        '卷五数字体验：可进入 2D 分色展厅看图层炸开，进入 3D 展厅旋转观察，或把当前木板提交给 AI 生成 GLB 预置。',
        '卷六到卷八：翻看题材图鉴、观看视频并答题，最后了解传承团队。遇到任何名词或操作，随时点我提问。'
      ].join('\n\n');
      const botMsg = {
        id: 'msg-' + (++this._msgId),
        role: 'assistant',
        content: guide
      };
      this._history.push({ role: 'assistant', content: guide });
      this.setData({
        chatOpen: true,
        bubbleVisible: false,
        messages: this.data.messages.concat([botMsg])
      });
      this._scrollToBottom();
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
      this._history.push({ role: 'user', content: text });

      this.setData({
        messages: messages,
        inputText: '',
        isRunning: true
      });
      this._scrollToBottom();

      try {
        const result = await askXiaonian({
          text,
          history: this._history,
          pageContext: this.data.pageContext
        });
        const botMsg = {
          id: 'msg-' + (++this._msgId),
          role: 'assistant',
          content: result.reply
        };
        this._history.push({ role: 'assistant', content: result.reply });
        this.setData({
          messages: this.data.messages.concat([botMsg]),
          isRunning: false
        });
      } catch (err) {
        console.error('[小年] 调用失败:', err);
        const errMsg = {
          id: 'msg-' + (++this._msgId),
          role: 'assistant',
          content: '抱歉，我暂时无法回复，请稍后再试。'
        };
        this.setData({
          messages: this.data.messages.concat([errMsg]),
          isRunning: false
        });
      }
      this._scrollToBottom();
    },

    _scrollToBottom() {
      const messages = this.data.messages;
      if (messages.length === 0) return;
      this.setData({ scrollToId: 'float-msg-' + messages[messages.length - 1].id });
    }
  }
});
