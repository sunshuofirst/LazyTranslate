try {
  importScripts(
    'ajax/libs/crypto-js/4.0.0/core.min.js',
    'ajax/libs/crypto-js/4.0.0/md5.js'
  );
} catch (e) {
  console.error('Failed to import CryptoJS:', e);
}

// 全局变量
const settingsCache = new Map();

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LANGUAGE_CHANGED') {
    // 转发语言变化消息到所有标签页
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // 忽略无法发送消息的标签页
        });
      });
    });
  }
});

// 初始化扩展
chrome.runtime.onInstalled.addListener(() => {
  // 创建右键菜单 - 一级菜单结构
  chrome.contextMenus.create({
    id: 'lazyTranslateTranslatePage',
    title: '翻译当前页面',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'lazyTranslateTranslateSelection',
    title: '翻译选中内容',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'lazyTranslateShowOriginal',
    title: '显示网页原文',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'lazyTranslateCustomWord',
    title: '自定义单词',
    contexts: ['page']
  });
  
  // console.log('LazyTranslate 扩展已安装');
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // console.log('右键菜单点击:', info.menuItemId, tab);
  
  switch (info.menuItemId) {
    case 'lazyTranslateTranslatePage':
      await translatePage(tab);
      break;
    case 'lazyTranslateTranslateSelection':
      await translateSelection(tab, info.selectionText);
      break;
    case 'lazyTranslateShowOriginal':
      await showOriginalPage(tab);
      break;
    case 'lazyTranslateCustomWord':
      await openPopup(tab);
      break;
  }
});

// 翻译整个页面
async function translatePage(tab) {
  try {
    // console.log('开始翻译页面:', tab.url);

    // 发送消息给content script
    await chrome.tabs.sendMessage(tab.id, {
      action: 'translateCurrentPage'
    });
  } catch (error) {
    console.error('翻译页面失败:', error);
  }
}

// 翻译选中文本
async function translateSelection(tab, selectionText) {
  try {
    // console.log('启动区域选择翻译模式');
    
    // 发送消息给content script启动区域选择模式
    await chrome.tabs.sendMessage(tab.id, {
      action: 'translateSelection'
    });
  } catch (error) {
    console.error('启动区域选择翻译失败:', error);
  }
}

// 显示网页原文
async function showOriginalPage(tab) {
  try {
    // console.log('显示网页原文:', tab.url);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 发送消息给content script
    await chrome.tabs.sendMessage(tab.id, {
      action: 'showOriginal'
    });
  } catch (error) {
    console.error('显示网页原文失败:', error);
  }
}

// 打开弹窗
async function openPopup(tab) {
  try {
    await chrome.action.openPopup();
  } catch (error) {
    console.error('打开弹窗失败:', error);
  }
}

// 监听来自 content script 的一次性消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    const { text, sourceLang, targetLang, apiProvider, googleApiProxy } = request;
    
    // 从存储中获取 API Key
    chrome.storage.local.get(['settings'], result => {
      const settings = result.settings || {};
      const apiKeyBaidu = settings.apiKeyBaidu || '';
      const apiKeyTencent = settings.apiKeyTencent || '';
      
      // 调用统一的翻译函数，传递googleApiProxy
      translate(text, sourceLang, targetLang, apiProvider, apiKeyBaidu, apiKeyTencent, googleApiProxy || settings.googleApiProxy)
        .then(translatedText => {
          sendResponse({ success: true, translatedText });
        })
        .catch(error => {
          console.error('翻译 API 调用失败 (onMessage):', error);
          sendResponse({ success: false, error: error.message });
        });
    });
    
    return true; // 异步处理
  }
});

// 监听来自 popup 的长连接
chrome.runtime.onConnect.addListener((port) => {
  // console.log('onConnect', port);
  port.onMessage.addListener((request) => {
    if (request.action === 'translate') {
      const { text, sourceLang, targetLang, apiProvider, googleApiProxy } = request;

      // 从存储中获取 API Key
      chrome.storage.local.get(['settings'], result => {
        const settings = result.settings || {};
        const apiKeyBaidu = settings.apiKeyBaidu || '';
        const apiKeyTencent = settings.apiKeyTencent || '';
        
        // 调用统一的翻译函数，传递googleApiProxy
        translate(text, sourceLang, targetLang, apiProvider, apiKeyBaidu, apiKeyTencent, googleApiProxy || settings.googleApiProxy)
          .then(translatedText => {
            port.postMessage({ success: true, translatedText });
          })
          .catch(error => {
            console.error('翻译 API 调用失败 (onConnect):', error);
            port.postMessage({ success: false, error: error.message });
          });
      });
    }
  });
});

// 核心翻译函数
async function translate(text, sourceLang, targetLang, apiProvider, apiKeyBaidu, apiKeyTencent, googleApiProxy) {
  // console.log(`开始翻译:
  //   - Provider: ${apiProvider}
  //   - From: ${sourceLang}
  //   - To: ${targetLang}
  //   - Text: "${text.substring(0, 50)}..."`);
    
  switch (apiProvider) {
    case 'google':
      return translateWithGoogle(text, sourceLang, targetLang, googleApiProxy);
    case 'baidu':
      return translateWithBaidu(text, sourceLang, targetLang, apiKeyBaidu);
    case 'tencent':
      return translateWithTencent(text, sourceLang, targetLang, apiKeyTencent);
    default:
      return Promise.reject(new Error('未知的翻译提供商'));
  }
}

// 谷歌翻译API，支持代理
async function translateWithGoogle(text, sourceLang, targetLang, googleApiProxy) {
  let url = '';
  if (googleApiProxy && googleApiProxy.trim()) {
    // 用户自定义代理，直接拼接参数
    url = googleApiProxy
      .replace(/\/$/, '') // 去除结尾/
      + `/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  } else {
    url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  }
  const response = await fetch(url);
  const data = await response.json();
  if (data && data[0] && data[0][0]) {
    return data[0][0][0];
  }
  throw new Error('谷歌翻译失败');
}

// 百度翻译API
async function translateWithBaidu(text, sourceLang, targetLang, apiKeyBaidu) {
  const [appid, secret] = apiKeyBaidu.split(':');
  const salt = Date.now();
  const sign = await generateMD5(appid + text + salt + secret);
  
  const url = new URL('https://fanyi-api.baidu.com/api/trans/vip/translate');
  // url.searchParams.append('q', encodeURIComponent(text));
  url.searchParams.append('q', text);
  url.searchParams.append('from', sourceLang);
  url.searchParams.append('to', targetLang);
  url.searchParams.append('appid', appid);
  url.searchParams.append('salt', salt);
  url.searchParams.append('sign', sign);
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data && data.trans_result && data.trans_result[0]) {
    return data.trans_result[0].dst;
  }
  
  throw new Error(`百度翻译失败: ${data.error_msg || '未知错误'}`);
}

async function translateWithTencent(text, sourceLang, targetLang, apiKeyTencent) {
  const [secretId, secretKey] = apiKeyTencent.split(':');
  
  // 腾讯云API配置
  const endpoint = 'tmt.tencentcloudapi.com';
  const service = 'tmt';
  const region = 'ap-beijing';  // 可以根据需要修改地域
  const action = 'TextTranslate';
  const version = '2018-03-21';
  
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().substr(0, 10);
  
  // 请求体
  const payload = JSON.stringify({
    SourceText: text,
    Source: sourceLang === 'auto' ? 'auto' : sourceLang,
    Target: targetLang,
    ProjectId: 0
  });
  
  // 步骤1：拼接规范请求串
  const canonicalHeaders = [
    `content-type:application/json; charset=utf-8`,
    `host:${endpoint}`,
    `x-tc-action:${action.toLowerCase()}`,
    `x-tc-region:${region}`,
    `x-tc-timestamp:${timestamp}`,
    `x-tc-version:${version}`
  ].join('\n') + '\n';
  
  const signedHeaders = 'content-type;host;x-tc-action;x-tc-region;x-tc-timestamp;x-tc-version';
  
  const hashedRequestPayload = await sha256(payload);
  
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join('\n');
  
  // 步骤2：拼接待签名字符串
  const algorithm = 'TC3-HMAC-SHA256';
  const hashedCanonicalRequest = await sha256(canonicalRequest);
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    hashedCanonicalRequest
  ].join('\n');
  
  // 步骤3：计算签名
  const secretDate = await hmacSha256(date, `TC3${secretKey}`);
  const secretService = await hmacSha256(service, secretDate);
  const secretSigning = await hmacSha256('tc3_request', secretService);
  const signature = await hmacSha256(stringToSign, secretSigning);
  
  // 步骤4：拼接 Authorization
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  // 发起请求
  const response = await fetch(`https://${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'Content-Type': 'application/json; charset=utf-8',
      'Host': endpoint,
      'X-TC-Action': action,
      'X-TC-Region': region,
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Version': version
    },
    body: payload
  });
  
  const data = await response.json();
  
  if (data.Response && data.Response.TargetText) {
    return data.Response.TargetText;
  }
  
  throw new Error(`腾讯翻译失败: ${data.Response?.Error?.Message || '未知错误'}`);
}

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 生成MD5签名
async function generateMD5(text) {
  if (typeof CryptoJS === 'undefined') {
    throw new Error('CryptoJS not loaded');
  }
  return CryptoJS.MD5(text).toString();
}

// SHA256 哈希函数
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// HMAC-SHA256 签名函数
async function hmacSha256(message, key) {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = new Uint8Array(signature);
  
  // 如果需要返回十六进制字符串（用于最终签名）
  if (typeof message === 'string' && message.includes('TC3-HMAC-SHA256')) {
    return bytesToHex(signatureArray);
  }
  
  // 返回字节数组（用于中间步骤）
  return signatureArray;
}

// 将字节数组转换为十六进制字符串
function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 这个函数在目标标签页中执行
function triggerPageTranslation() {
  // 从存储中获取设置
  chrome.storage.local.get('settings', (data) => {
    // 如果存储中没有设置，则使用默认值
    const settings = data.settings || {
      sourceLang: 'auto',
      targetLang: 'zh',
      apiProvider: 'google',
      targetLangFont: '',
      googleApiProxy: ''
    };
    
    // 向 content script 发送消息
    chrome.runtime.sendMessage({ action: 'translatePage', settings: settings });
  });
}