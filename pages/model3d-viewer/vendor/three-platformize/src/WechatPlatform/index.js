var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/three-platformize/src/WechatPlatform/index.js
var WechatPlatform_exports = {};
__export(WechatPlatform_exports, {
  WechatPlatform: () => WechatPlatform
});
module.exports = __toCommonJS(WechatPlatform_exports);

// node_modules/three-platformize/src/libs/Blob.js
var Blob = class {
  constructor(parts, options) {
    this.parts = parts;
    this.options = options;
  }
};

// node_modules/three-platformize/src/libs/base64-arraybuffer.js
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var lookup = new Uint8Array(256);
for (i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}
var i;
function encode(arrayBuffer) {
  var base64 = "";
  var bytes = new Uint8Array(arrayBuffer);
  var byteLength = bytes.byteLength;
  var byteRemainder = byteLength % 3;
  var mainLength = byteLength - byteRemainder;
  var a, b, c, d;
  var chunk;
  for (var i = 0; i < mainLength; i = i + 3) {
    chunk = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
    a = (chunk & 16515072) >> 18;
    b = (chunk & 258048) >> 12;
    c = (chunk & 4032) >> 6;
    d = chunk & 63;
    base64 += chars[a] + chars[b] + chars[c] + chars[d];
  }
  if (byteRemainder == 1) {
    chunk = bytes[mainLength];
    a = (chunk & 252) >> 2;
    b = (chunk & 3) << 4;
    base64 += chars[a] + chars[b] + "==";
  } else if (byteRemainder == 2) {
    chunk = bytes[mainLength] << 8 | bytes[mainLength + 1];
    a = (chunk & 64512) >> 10;
    b = (chunk & 1008) >> 4;
    c = (chunk & 15) << 2;
    base64 += chars[a] + chars[b] + chars[c] + "=";
  }
  return base64;
}

// node_modules/three-platformize/src/libs/URL.js
var $URL = class {
  createObjectURL(obj) {
    if (obj instanceof Blob) {
      const base64 = encode(obj.parts[0]);
      const url = `data:${obj.options.type};base64,${base64}`;
      return url;
    }
    return "";
  }
  revokeObjectURL() {
  }
};

// node_modules/three-platformize/src/libs/atob.js
function atob(data) {
  data = `${data}`;
  data = data.replace(/[ \t\n\f\r]/g, "");
  if (data.length % 4 === 0) {
    data = data.replace(/==?$/, "");
  }
  if (data.length % 4 === 1 || /[^+/0-9A-Za-z]/.test(data)) {
    return null;
  }
  let output = "";
  let buffer = 0;
  let accumulatedBits = 0;
  for (let i = 0; i < data.length; i++) {
    buffer <<= 6;
    buffer |= atobLookup(data[i]);
    accumulatedBits += 6;
    if (accumulatedBits === 24) {
      output += String.fromCharCode((buffer & 16711680) >> 16);
      output += String.fromCharCode((buffer & 65280) >> 8);
      output += String.fromCharCode(buffer & 255);
      buffer = accumulatedBits = 0;
    }
  }
  if (accumulatedBits === 12) {
    buffer >>= 4;
    output += String.fromCharCode(buffer);
  } else if (accumulatedBits === 18) {
    buffer >>= 2;
    output += String.fromCharCode((buffer & 65280) >> 8);
    output += String.fromCharCode(buffer & 255);
  }
  return output;
}
var keystr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function atobLookup(chr) {
  const index = keystr.indexOf(chr);
  return index < 0 ? void 0 : index;
}

// node_modules/three-platformize/src/libs/EventTarget.js
var _events = /* @__PURE__ */ new WeakMap();
var Touch = class {
  constructor(touch) {
    this.identifier = touch.identifier;
    this.force = touch.force === void 0 ? 1 : touch.force;
    this.pageX = touch.pageX === void 0 ? touch.x : touch.pageX;
    this.pageY = touch.pageY === void 0 ? touch.y : touch.pageY;
    this.clientX = touch.clientX === void 0 ? touch.x : touch.clientX;
    this.clientY = touch.clientY === void 0 ? touch.y : touch.clientY;
    this.screenX = this.pageX;
    this.screenY = this.pageY;
  }
};
var EventTarget = class {
  constructor() {
    _events.set(this, {});
  }
  addEventListener(type, listener, options = {}) {
    let events = _events.get(this);
    if (!events) {
      events = {};
      _events.set(this, events);
    }
    if (!events[type]) {
      events[type] = [];
    }
    events[type].push(listener);
    if (options.capture) {
    }
    if (options.once) {
    }
    if (options.passive) {
    }
  }
  removeEventListener(type, listener) {
    const events = _events.get(this);
    if (events) {
      const listeners = events[type];
      if (listeners && listeners.length > 0) {
        for (let i = listeners.length; i--; i > 0) {
          if (listeners[i] === listener) {
            listeners.splice(i, 1);
            break;
          }
        }
      }
    }
  }
  dispatchEvent(event = {}) {
    if (typeof event.preventDefault !== "function") {
      event.preventDefault = () => {
      };
    }
    if (typeof event.stopPropagation !== "function") {
      event.stopPropagation = () => {
      };
    }
    const events = _events.get(this);
    if (events) {
      const listeners = events[event.type];
      if (listeners) {
        for (let i = 0; i < listeners.length; i++) {
          listeners[i](event);
        }
      }
    }
  }
  releasePointerCapture() {
  }
  setPointerCapture() {
  }
};

// node_modules/three-platformize/src/WechatPlatform/XMLHttpRequest.js
var _requestHeader = /* @__PURE__ */ new WeakMap();
var _responseHeader = /* @__PURE__ */ new WeakMap();
var _requestTask = /* @__PURE__ */ new WeakMap();
function _triggerEvent(type, event = {}) {
  event.target = event.target || this;
  if (typeof this[`on${type}`] === "function") {
    this[`on${type}`].call(this, event);
  }
}
function _changeReadyState(readyState, event = {}) {
  this.readyState = readyState;
  event.readyState = readyState;
  _triggerEvent.call(this, "readystatechange", event);
}
function _isRelativePath(url) {
  return !/^(http|https|ftp|wxfile):\/\/.*/i.test(url);
}
var { platform } = wx.getSystemInfoSync();
var $XMLHttpRequest = class extends EventTarget {
  constructor() {
    super();
    this.onabort = null;
    this.onerror = null;
    this.onload = null;
    this.onloadstart = null;
    this.onprogress = null;
    this.ontimeout = null;
    this.onloadend = null;
    this.onreadystatechange = null;
    this.readyState = 0;
    this.response = null;
    this.responseText = null;
    this.responseType = "text";
    this.dataType = "string";
    this.responseXML = null;
    this.status = 0;
    this.statusText = "";
    this.upload = {};
    this.withCredentials = false;
    _requestHeader.set(this, {
      "content-type": "application/x-www-form-urlencoded"
    });
    _responseHeader.set(this, {});
  }
  abort() {
    const myRequestTask = _requestTask.get(this);
    if (myRequestTask) {
      myRequestTask.abort();
    }
  }
  getAllResponseHeaders() {
    const responseHeader = _responseHeader.get(this);
    return Object.keys(responseHeader).map((header) => {
      return `${header}: ${responseHeader[header]}`;
    }).join("\n");
  }
  getResponseHeader(header) {
    return _responseHeader.get(this)[header];
  }
  open(method, url) {
    this._method = method;
    this._url = url;
    _changeReadyState.call(this, $XMLHttpRequest.OPENED);
  }
  overrideMimeType() {
  }
  send(data = "") {
    if (this.readyState !== $XMLHttpRequest.OPENED) {
      throw new Error("Failed to execute 'send' on 'XMLHttpRequest': The object's state must be OPENED.");
    } else {
      const url = this._url;
      const header = _requestHeader.get(this);
      const responseType = this.responseType;
      const dataType = this.dataType;
      const relative = _isRelativePath(url);
      let encoding;
      if (responseType === "arraybuffer") {
      } else {
        encoding = "utf8";
      }
      delete this.response;
      this.response = null;
      let resolved = false;
      const onSuccess = ({ data: data2, statusCode, header: header2 }) => {
        if (resolved)
          return;
        resolved = true;
        statusCode = statusCode === void 0 ? 200 : statusCode;
        if (typeof data2 !== "string" && !(data2 instanceof ArrayBuffer)) {
          try {
            data2 = JSON.stringify(data2);
          } catch (e) {
          }
        }
        this.status = statusCode;
        if (header2) {
          _responseHeader.set(this, header2);
        }
        _triggerEvent.call(this, "loadstart");
        _changeReadyState.call(this, $XMLHttpRequest.HEADERS_RECEIVED);
        _changeReadyState.call(this, $XMLHttpRequest.LOADING);
        this.response = data2;
        if (data2 instanceof ArrayBuffer) {
          Object.defineProperty(this, "responseText", {
            enumerable: true,
            configurable: true,
            get: function() {
              throw "InvalidStateError : responseType is " + this.responseType;
            }
          });
        } else {
          this.responseText = data2;
        }
        _changeReadyState.call(this, $XMLHttpRequest.DONE);
        _triggerEvent.call(this, "load");
        _triggerEvent.call(this, "loadend");
      };
      const onFail = ({ errMsg }) => {
        if (resolved)
          return;
        resolved = true;
        if (errMsg.indexOf("abort") !== -1) {
          _triggerEvent.call(this, "abort");
        } else {
          _triggerEvent.call(this, "error", {
            message: errMsg
          });
        }
        _triggerEvent.call(this, "loadend");
        if (relative) {
          console.warn(errMsg);
        }
      };
      if (relative) {
        const fs = wx.getFileSystemManager();
        var options = {
          filePath: url,
          success: onSuccess,
          fail: onFail
        };
        if (encoding) {
          options["encoding"] = encoding;
        }
        fs.readFile(options);
        return;
      }
      const usePatch = responseType === "arraybuffer" && platform === "ios" && $XMLHttpRequest.useFetchPatch;
      wx.request({
        data,
        url,
        method: this._method,
        header,
        dataType,
        responseType,
        enableCache: false,
        success: onSuccess,
        fail: onFail
      });
      if (usePatch) {
        setTimeout(function() {
          wx.request({
            data,
            url,
            method: this._method,
            header,
            dataType,
            responseType,
            enableCache: true,
            success: onSuccess,
            fail: onFail
          });
        }, $XMLHttpRequest.fetchPatchDelay);
      }
    }
  }
  setRequestHeader(header, value) {
    const myHeader = _requestHeader.get(this);
    myHeader[header] = value;
    _requestHeader.set(this, myHeader);
  }
  addEventListener(type, listener) {
    if (typeof listener !== "function") {
      return;
    }
    this["on" + type] = (event = {}) => {
      event.target = event.target || this;
      listener.call(this, event);
    };
  }
  removeEventListener(type, listener) {
    if (this["on" + type] === listener) {
      this["on" + type] = null;
    }
  }
};
$XMLHttpRequest.UNSEND = 0;
$XMLHttpRequest.OPENED = 1;
$XMLHttpRequest.HEADERS_RECEIVED = 2;
$XMLHttpRequest.LOADING = 3;
$XMLHttpRequest.DONE = 4;
$XMLHttpRequest.useFetchPatch = false;
$XMLHttpRequest.fetchPatchDelay = 200;

// node_modules/three-platformize/src/libs/copyProperties.js
function copyProperties(target, source) {
  for (let key of Object.getOwnPropertyNames(source)) {
    if (key !== "constructor" && key !== "prototype" && key !== "name") {
      let desc = Object.getOwnPropertyDescriptor(source, key);
      Object.defineProperty(target, key, desc);
    }
  }
}

// node_modules/three-platformize/src/libs/xml-parser.js
function parse(xml) {
  xml = xml.trim();
  xml = xml.replace(/<!--[\s\S]*?-->/g, "");
  return document();
  function document() {
    return {
      declaration: declaration(),
      root: tag()
    };
  }
  function declaration() {
    const m = match(/^<\?xml\s*/);
    if (!m)
      return;
    const node = {
      attributes: {}
    };
    while (!(eos() || is("?>"))) {
      const attr = attribute();
      if (!attr)
        return node;
      node.attributes[attr.name] = attr.value;
    }
    match(/\?>\s*/);
    match(/<!DOCTYPE[^>]*>\s/);
    return node;
  }
  function tag() {
    const m = match(/^<([\w-:.]+)\s*/);
    if (!m)
      return;
    const node = {
      name: m[1],
      attributes: {},
      children: []
    };
    while (!(eos() || is(">") || is("?>") || is("/>"))) {
      const attr = attribute();
      if (!attr)
        return node;
      node.attributes[attr.name] = attr.value;
    }
    if (match(/^\s*\/>\s*/)) {
      return node;
    }
    match(/\??>\s*/);
    node.content = content();
    let child;
    while (child = tag()) {
      node.children.push(child);
    }
    match(/^<\/[\w-:.]+>\s*/);
    return node;
  }
  function content() {
    const m = match(/^([^<]*)/);
    if (m)
      return m[1];
    return "";
  }
  function attribute() {
    const m = match(/([\w:-]+)\s*=\s*("[^"]*"|'[^']*'|\w+)\s*/);
    if (!m)
      return;
    return { name: m[1], value: strip(m[2]) };
  }
  function strip(val) {
    return val.replace(/^['"]|['"]$/g, "");
  }
  function match(re) {
    const m = xml.match(re);
    if (!m)
      return;
    xml = xml.slice(m[0].length);
    return m;
  }
  function eos() {
    return xml.length == 0;
  }
  function is(prefix) {
    return xml.indexOf(prefix) == 0;
  }
}
var xml_parser_default = parse;

// node_modules/three-platformize/src/libs/DOMParser.js
function walkTree(node, processer) {
  processer(node);
  node.children.forEach((i) => walkTree(i, processer));
}
var $DOMParser = class {
  parseFromString(str) {
    const xml = xml_parser_default(str);
    const nodeBase = {
      hasAttribute(key) {
        return this.attributes[key] !== void 0;
      },
      getAttribute(key) {
        return this.attributes[key];
      },
      getElementsByTagName(tag) {
        const result = [];
        this.childNodes.forEach((i) => walkTree(i, (node) => tag === node.name && result.push(node)));
        return result;
      }
    };
    walkTree(xml.root, (node) => {
      node.nodeType = 1;
      node.nodeName = node.name;
      node.style = new Proxy((node.attributes.style || "").split(";").reduce((acc, curr) => {
        if (curr) {
          let [key, value] = curr.split(":");
          acc[key.trim()] = value.trim();
        }
        return acc;
      }, {}), {
        get(target, key) {
          return target[key] || "";
        }
      });
      node.textContent = node.content;
      node.childNodes = node.children;
      node.__proto__ = nodeBase;
    });
    const out = {
      documentElement: xml.root,
      childNodes: [xml.root]
    };
    out.__proto__ = nodeBase;
    return out;
  }
};

// node_modules/three-platformize/src/libs/TextDecoder.js
var $TextDecoder = class {
  decode(uint8Array) {
    if (uint8Array instanceof ArrayBuffer)
      uint8Array = new Uint8Array(uint8Array);
    let s = "";
    for (let i = 0, il = uint8Array.length; i < il; i++)
      s += String.fromCharCode(uint8Array[i]);
    try {
      return decodeURIComponent(escape(s));
    } catch (e) {
      return s;
    }
  }
};

// node_modules/three-platformize/src/WechatPlatform/index.js
function OffscreenCanvas(width = 1, height = 1) {
  return wx.createOffscreenCanvas({
    type: "2d",
    width,
    height
  });
}
var WechatPlatform = class {
  constructor(canvas, width, height) {
    const systemInfo = wx.getSystemInfoSync();
    const isAndroid = systemInfo.platform === "android";
    this.canvas = canvas;
    this.canvasW = width === void 0 ? canvas.width : width;
    this.canvasH = height === void 0 ? canvas.height : height;
    this.document = {
      createElementNS(_, type) {
        if (type === "canvas")
          return new OffscreenCanvas(1, 1);
        if (type === "img")
          return canvas.createImage();
      }
    };
    this.window = {
      innerWidth: systemInfo.windowWidth,
      innerHeight: systemInfo.windowHeight,
      devicePixelRatio: systemInfo.pixelRatio,
      URL: new $URL(),
      AudioContext: function() {
      },
      requestAnimationFrame: this.canvas.requestAnimationFrame,
      cancelAnimationFrame: this.canvas.cancelAnimationFrame,
      DeviceOrientationEvent: {
        requestPermission() {
          return Promise.resolve("granted");
        }
      },
      DOMParser: $DOMParser,
      TextDecoder: $TextDecoder
    };
    [this.canvas, this.document, this.window].forEach((i) => {
      const old = i.__proto__;
      i.__proto__ = {};
      i.__proto__.__proto__ = old;
      copyProperties(i.__proto__, EventTarget.prototype);
    });
    this.patchCanvas();
    this.onDeviceMotionChange = (e) => {
      e.type = "deviceorientation";
      if (isAndroid) {
        e.alpha *= -1;
        e.beta *= -1;
        e.gamma *= -1;
      }
      this.window.dispatchEvent(e);
    };
  }
  patchCanvas() {
    const { canvasH, canvasW } = this;
    Object.defineProperty(this.canvas, "style", {
      get() {
        return {
          width: this.width + "px",
          height: this.height + "px"
        };
      }
    });
    Object.defineProperty(this.canvas, "clientHeight", {
      get() {
        return canvasH || this.height;
      }
    });
    Object.defineProperty(this.canvas, "clientWidth", {
      get() {
        return canvasW || this.width;
      }
    });
    this.canvas.ownerDocument = this.document;
  }
  patchXHR() {
    $XMLHttpRequest.useFetchPatch = true;
    return this;
  }
  getGlobals() {
    return {
      atob,
      Blob,
      window: this.window,
      document: this.document,
      HTMLCanvasElement: void 0,
      XMLHttpRequest: $XMLHttpRequest,
      OffscreenCanvas,
      createImageBitmap: void 0
    };
  }
  enableDeviceOrientation(interval) {
    return new Promise((resolve, reject) => {
      wx.onDeviceMotionChange(this.onDeviceMotionChange);
      wx.startDeviceMotionListening({
        interval,
        success: (e) => {
          resolve(e);
          this.enabledDeviceMotion = true;
        },
        fail: reject
      });
    });
  }
  disableDeviceOrientation() {
    return new Promise((resolve, reject) => {
      wx.offDeviceMotionChange(this.onDeviceMotionChange);
      this.enabledDeviceMotion && wx.stopDeviceMotionListening({
        success: () => {
          resolve();
          this.enabledDeviceMotion = false;
        },
        fail: reject
      });
    });
  }
  dispatchTouchEvent(e = {}) {
    const target = { ...this };
    const changedTouches = e.changedTouches.map((touch) => new Touch(touch));
    const event = {
      changedTouches,
      touches: e.touches.map((touch) => new Touch(touch)),
      targetTouches: Array.prototype.slice.call(e.touches.map((touch) => new Touch(touch))),
      timeStamp: e.timeStamp,
      target,
      currentTarget: target,
      type: e.type,
      cancelBubble: false,
      cancelable: false
    };
    this.canvas.dispatchEvent(event);
    if (changedTouches.length) {
      const touch = changedTouches[0];
      const pointerEvent = {
        pageX: touch.pageX,
        pageY: touch.pageY,
        pointerId: touch.identifier,
        type: {
          touchstart: "pointerdown",
          touchmove: "pointermove",
          touchend: "pointerup"
        }[e.type],
        pointerType: "touch"
      };
      this.canvas.dispatchEvent(pointerEvent);
    }
  }
  dispose() {
    this.disableDeviceOrientation();
    this.canvas.width = 0;
    this.canvas.height = 0;
    if (this.canvas)
      this.canvas.ownerDocument = null;
    this.onDeviceMotionChange = null;
    this.document = null;
    this.window = null;
    this.canvas = null;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WechatPlatform
});
