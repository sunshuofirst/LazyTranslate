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

// 初始化扩展
chrome.runtime.onInstalled.addListener(() => {
  // 创建右键菜单 - 一级菜单结构
  chrome.contextMenus.create({
    id: 'lazyTranslateTranslatePage',
    title: '翻译此页面',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'lazyTranslateTranslateSelection',
    title: '翻译此区域',
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
  
  console.log('LazyTranslate 扩展已安装');
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('右键菜单点击:', info.menuItemId, tab);
  
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
    console.log('开始翻译页面:', tab.url);
    
    // 首先确保content script已注入
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    // 等待一下确保content script加载完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 发送消息给content script
    await chrome.tabs.sendMessage(tab.id, {
      action: 'translatePage'
    });
  } catch (error) {
    console.error('翻译页面失败:', error);
  }
}

// 翻译选中文本
async function translateSelection(tab, selectionText) {
  try {
    console.log('启动区域选择翻译模式');
    
    // 确保content script已注入
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
    console.log('显示网页原文:', tab.url);
    
    // 确保content script已注入
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
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
      const apiKey = settings.apiKey || '';
      
      // 调用统一的翻译函数，传递googleApiProxy
      translate(text, sourceLang, targetLang, apiProvider, apiKey, googleApiProxy || settings.googleApiProxy)
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
  console.log('onConnect', port);
  port.onMessage.addListener((request) => {
    if (request.action === 'translate') {
      const { text, sourceLang, targetLang, apiProvider, googleApiProxy } = request;

      // 从存储中获取 API Key
      chrome.storage.local.get(['settings'], result => {
        const settings = result.settings || {};
        const apiKey = settings.apiKey || '';
        
        // 调用统一的翻译函数，传递googleApiProxy
        translate(text, sourceLang, targetLang, apiProvider, apiKey, googleApiProxy || settings.googleApiProxy)
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
async function translate(text, sourceLang, targetLang, apiProvider, apiKey, googleApiProxy) {
  console.log(`开始翻译:
    - Provider: ${apiProvider}
    - From: ${sourceLang}
    - To: ${targetLang}
    - Text: "${text.substring(0, 50)}..."`);
    
  switch (apiProvider) {
    case 'google':
      return translateWithGoogle(text, sourceLang, targetLang, googleApiProxy);
    case 'microsoft':
      return translateWithMicrosoft(text, sourceLang, targetLang, apiKey);
    case 'baidu':
      return translateWithBaidu(text, sourceLang, targetLang, apiKey);
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

// 微软翻译API
async function translateWithMicrosoft(text, sourceLang, targetLang, apiKey) {
  if (!apiKey) {
    throw new Error('请先配置微软翻译API密钥');
  }
  
  const endpoint = 'https://api.cognitive.microsofttranslator.com';
  const location = 'global';
  
  const url = `${endpoint}/translate?api-version=3.0&from=${sourceLang}&to=${targetLang}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Ocp-Apim-Subscription-Region': location,
      'Content-Type': 'application/json',
      'X-ClientTraceId': generateUUID()
    },
    body: JSON.stringify([{ text }])
  });
  
  if (!response.ok) {
    throw new Error(`微软翻译API错误: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data && data[0] && data[0].translations && data[0].translations[0]) {
    return data[0].translations[0].text;
  }
  
  throw new Error('微软翻译失败');
}

// 百度翻译API
async function translateWithBaidu(text, sourceLang, targetLang, apiKey) {
  const [appid, secret] = apiKey.split(':');
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