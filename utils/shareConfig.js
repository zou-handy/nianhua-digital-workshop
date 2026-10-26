const SHARE_TITLE = '赤壁缘陶年画文创小店｜AI 木版年画工坊';
const SHARE_PATH = '/pages/home/home';

function buildShareAppMessage() {
  return {
    title: SHARE_TITLE,
    path: SHARE_PATH
  };
}

function buildShareTimeline() {
  return {
    title: SHARE_TITLE,
    query: ''
  };
}

module.exports = {
  buildShareAppMessage,
  buildShareTimeline
};
