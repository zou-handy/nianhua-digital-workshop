const { generateReply } = require('../../utils/nianhuaKnowledge');

Page({
  data: {
    messages: [],
    inputText: '',
    isRunning: false,
    scrollToId: ''
  },

  onLoad() {
    this._msgId = 0;
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  sendSuggestion(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ inputText: text });
    this.sendMessage();
  },

  sendMessage() {
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

    // 本地知识库回复
    const reply = generateReply(text);
    this._typeWriterReply(reply);
  },

  _typeWriterReply(reply) {
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
        assistantMsg.content = reply.substring(0, index + 2);
        this.setData({ messages: messages });
        this._scrollToBottom();
        index += 2;
        setTimeout(typeWriter, 30);
      } else {
        assistantMsg.content = reply;
        assistantMsg.streaming = false;
        this.setData({ messages: messages, isRunning: false });
        this._scrollToBottom();
      }
    };
    setTimeout(typeWriter, 400);
  },

  _scrollToBottom() {
    const messages = this.data.messages;
    if (messages.length === 0) return;
    const lastId = 'msg-' + messages[messages.length - 1].id;
    this.setData({ scrollToId: lastId });
  },

  goBack() {
    wx.navigateBack();
  }
});
