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
    suggestion2: '五色套印是什么？'
  },

  lifetimes: {
    attached() {
      const sysInfo = wx.getWindowInfo();
      this._screenW = sysInfo.windowWidth;
      this._screenH = sysInfo.windowHeight;
      this._btnSize = 56;

      this.setData({
        btnX: this._screenW - this._btnSize - 20,
        btnY: this._screenH - this._btnSize - 100
      });
      this._msgId = 0;
      this._history = [];
    }
  },

  methods: {
    // 设置页面上下文
    setPageContext(info) {
      const ctx = `当前在「${info.chapter || '首页'}」`;
      const suggestions = this._getSuggestions(info.chapter);
      this.setData({
        pageContext: ctx,
        suggestion1: suggestions[0],
        suggestion2: suggestions[1]
      });
    },

    _getSuggestions(chapter) {
      const map = {
        '入门': ['佛山年画是什么？', '年画有什么寓意？'],
        '溯源': ['年画起源于哪个朝代？', '为什么佛山年画能成为非遗？'],
        '器具': ['雕版用什么木材？', '有哪些雕刻工具？'],
        '工艺': ['五色套印是什么？', '年画制作有哪些步骤？'],
        '版台': ['套印为什么是五色？', '五块版的顺序是什么？'],
        '图鉴': ['门神有哪些故事？', '年画常见题材有哪些？'],
        '测验': ['门神是谁？', '年画入选非遗是哪年？'],
        '探索': ['3D展厅怎么看？', 'AI生图怎么用？'],
        '关于': ['佛山年画的历史？', '什么是五色套印？'],
        '视频学堂': ['年画有什么特色？', '五色套印是什么？']
      };
      return map[chapter] || ['佛山年画有什么特色？', '五色套印是什么？'];
    },

    // 拖拽逻辑
    onTouchStart(e) {
      this._startX = e.touches[0].clientX;
      this._startY = e.touches[0].clientY;
      this._startBtnX = this.data.btnX;
      this._startBtnY = this.data.btnY;
      this._moved = false;
    },

    onTouchMove(e) {
      const dx = e.touches[0].clientX - this._startX;
      const dy = e.touches[0].clientY - this._startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this._moved = true;
        this.setData({ isDragging: true });
      }
      let newX = this._startBtnX + dx;
      let newY = this._startBtnY + dy;
      newX = Math.max(10, Math.min(this._screenW - this._btnSize - 10, newX));
      newY = Math.max(80, Math.min(this._screenH - this._btnSize - 10, newY));
      this.setData({ btnX: newX, btnY: newY });
    },

    onTouchEnd() {
      if (this.data.isDragging) {
        this.setData({ isDragging: false });
      }
    },

    // 打开/关闭聊天
    openChat() {
      if (this._moved) return;
      this.setData({ chatOpen: true });
    },

    closeChat() {
      this.setData({ chatOpen: false });
    },

    noop() {},

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
      this._history.push({ role: 'user', content: text });

      this.setData({
        messages: messages,
        inputText: '',
        isRunning: true
      });
      this._scrollToBottom();

      // 调用云函数AI
      try {
        const res = await wx.cloud.callFunction({
          name: 'chatWithNianhua',
          data: {
            messages: this._history,
            currentPage: this.data.pageContext
          }
        });

        if (res.result && res.result.success) {
          const reply = res.result.reply;
          const botMsg = {
            id: 'msg-' + (++this._msgId),
            role: 'assistant',
            content: reply
          };
          this._history.push({ role: 'assistant', content: reply });
          this.setData({
            messages: this.data.messages.concat([botMsg]),
            isRunning: false
          });
        } else {
          throw new Error(res.result ? res.result.error : 'AI服务异常');
        }
      } catch (err) {
        console.error('[小年] 调用失败:', err);
        const errMsg = {
          id: 'msg-' + (++this._msgId),
          role: 'assistant',
          content: '抱歉，我暂时无法回复，请稍后再试 🙏'
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
