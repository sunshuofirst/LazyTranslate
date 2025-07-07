// 全局变量
let customWords = {};
let translationOverlay = null;
let originalTexts = new Map(); // 保存原始文本内容
let isShowingOriginal = false; // 标记是否正在显示原文
let isSelectingArea = false; // 标记是否正在选择区域
let elementSelector = null; // 元素选择器实例

// 初始化
// console.log('LazyTranslate content script 已加载');

// 立即设置消息监听器
setupMessageListener();

// 延迟加载自定义词库
setTimeout(async () => {
  await loadCustomWords();
  // console.log('自定义词库加载完成');
}, 100);

// 加载自定义词库
async function loadCustomWords() {
  try {
    const result = await chrome.storage.local.get(['customWords']);
    customWords = result.customWords || {};
    // console.log('加载自定义词库:', customWords);
  } catch (error) {
    console.error('加载自定义词库失败:', error);
  }
}

// 设置消息监听器
function setupMessageListener() {
  // console.log('设置消息监听器');
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log('Content script 收到消息:', request);
    
    switch (request.action) {
      case 'translateCurrentPage':
        // console.log('开始翻译页面');
        translateElement(null).then(() => {
          sendResponse({ success: true, message: '页面翻译完成' });
        }).catch(error => {
          console.error('翻译页面失败:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // 保持消息通道开放
        
      case 'translateSelection':
        // console.log('开始区域选择翻译');
        startAreaSelection().then(() => {
          sendResponse({ success: true, message: '区域选择模式已启动' });
        }).catch(error => {
          console.error('启动区域选择失败:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // 保持消息通道开放
        
      case 'showOriginal':
        // console.log('显示网页原文');
        showOriginalPage().then(() => {
          sendResponse({ success: true, message: '显示原文完成' });
        }).catch(error => {
          console.error('显示原文失败:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // 保持消息通道开放
        
      default:
        // console.log('未知消息类型:', request.action);
        sendResponse({ success: false, error: '未知消息类型' });
        return true;
    }
  });
  
  // 发送测试消息给background script
  setTimeout(() => {
    chrome.runtime.sendMessage({
      action: 'log',
      message: 'Content script 已准备就绪'
    }).catch(error => {
      console.error('发送测试消息失败:', error);
    });
  }, 200);
}

// 启动区域选择模式
async function startAreaSelection() {
  try {
    // console.log('启动区域选择模式');
    
    if (isSelectingArea) {
      // console.log('已经在选择区域模式');
      return;
    }
    
    isSelectingArea = true;
    
    // 显示提示信息
    showNotification('点击要翻译的区域', 'info');
    
    // 创建元素选择器实例
    if (!elementSelector) {
      elementSelector = new ElementSelector();
    }
    
    // 设置元素选中回调
    elementSelector.setElementSelectedCallback(async (element) => {
      // console.log('选择了区域:', element);
      
      // 停止选择模式
      stopAreaSelection();
      
      // 翻译选中的区域
      await translateElement(element);
    });
    
    // 打开选择模式
    elementSelector.open();
    
    // 添加ESC键监听器（退出选择模式）
    document.addEventListener('keydown', handleKeyDown);
    
    // console.log('区域选择模式已启动');
    
  } catch (error) {
    console.error('启动区域选择失败:', error);
    throw error;
  }
}

// 处理键盘事件
function handleKeyDown(event) {
  if (!isSelectingArea) return;
  
  if (event.key === 'Escape') {
    // console.log('用户按ESC键，退出选择模式');
    stopAreaSelection();
  }
}

// 停止区域选择模式
function stopAreaSelection() {
  // console.log('停止区域选择模式');
  
  isSelectingArea = false;
  
  // 关闭元素选择器
  if (elementSelector) {
    elementSelector.close();
  }
  
  // 移除ESC键监听器
  document.removeEventListener('keydown', handleKeyDown);
  
  // 显示提示信息
  showNotification('区域选择模式已退出', 'info');
}

// 翻译指定元素
async function translateElement(element) {
  showNotification('开始翻译...', 'info');
  
  try {
    // 1. 加载设置和自定义词库
    await loadCustomWords();
    const settings = await getDefaultSettings();
    
    // 2. 获取元素内的所有文本节点
    const textNodes = getTextNodes(element === null ? document.body : element);
    if (textNodes.length === 0) {
      showNotification('该区域没有可翻译的文本', 'error');
      // hideTranslationOverlay();
      return;
    }

    // 3. 批量翻译节点，所有逻辑都在 translateTextNode 中处理
    const batchSize = 5;
    let interval = settings.apiProvider == 'baidu' ? 1000 : 100;

    for (let i = 0; i < textNodes.length; i += batchSize) {
      const batch = textNodes.slice(i, i + batchSize);
      const promises = batch.map(node => translateTextNode(node, settings)); 
      
      await Promise.all(promises);
      
      const progress = Math.min(100, ((i + batchSize) / textNodes.length) * 100);
      updateTranslationProgress(progress);

      showNotification(`翻译进度: ${Math.round(progress)}%`, 'info');
      
      // 添加延迟，避免API限制
      if (i + batchSize < textNodes.length) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    // 4. 翻译完成后应用字体设置
    if (settings.targetLangFont) {
      applyFontSettings(settings.targetLangFont);
    }
    
    // 翻译成功后
    showNotification('页面翻译完成', 'success');
  } catch (error) {
    console.error('翻译元素失败:', error);
    showNotification('翻译失败，请检查控制台', 'error');
  }
}

// 显示网页原文
async function showOriginalPage() {
  try {
    // console.log('开始显示网页原文');
    
    if (isShowingOriginal) {
      // console.log('已经在显示原文状态');
      return;
    }
    
    // 恢复所有被翻译的文本节点
    await restoreOriginalTexts();
    
    isShowingOriginal = true;
    // console.log('网页原文显示完成');
    
    // 显示提示信息
    showNotification('已显示网页原文', 'success');
    
  } catch (error) {
    console.error('显示网页原文失败:', error);
    showNotification('翻译失败，请检查控制台', 'error');
  }
}

// 保存原始文本内容
function saveOriginalText(node, originalText) {
  // 为节点生成唯一ID
  const nodeId = generateNodeId(node);
  originalTexts.set(nodeId, originalText);
  
  // 在父元素上设置ID标记，而不是在文本节点上
  const parentElement = node.parentElement;
  if (parentElement) {
    parentElement.setAttribute('data-lazytranslate-id', nodeId);
  }
}

// 生成节点ID
function generateNodeId(node) {
  // 使用节点的路径作为ID
  const path = [];
  let current = node;
  
  while (current && current !== document.body) {
    const parent = current.parentElement;
    if (parent) {
      const index = Array.from(parent.childNodes).indexOf(current);
      path.unshift(index);
      current = parent;
    } else {
      break;
    }
  }
  
  return path.join('-');
}

// 恢复原始文本内容
async function restoreOriginalTexts() {
  // console.log('恢复原始文本内容');
  
  if (originalTexts.size === 0) {
    // console.log('没有保存的原始文本');
    return;
  }
  
  // 遍历所有被标记的父元素
  const translatedElements = document.querySelectorAll('[data-lazytranslate-id]');
  // console.log('找到被翻译的元素数量:', translatedElements.length);
  
  for (const element of translatedElements) {
    const nodeId = element.getAttribute('data-lazytranslate-id');
    const originalText = originalTexts.get(nodeId);
    
    if (originalText) {
      // 找到该元素下的文本节点并恢复原始文本
      const textNodes = getTextNodes(element);
      for (const textNode of textNodes) {
        if (textNode.textContent.trim()) {
          textNode.textContent = originalText;
          // console.log('恢复节点文本:', originalText);
          break; // 只恢复第一个文本节点
        }
      }
    }
    
    // 移除标记属性
    element.removeAttribute('data-lazytranslate-id');
    element.removeAttribute('data-lazytranslate');
  }
  
  // 移除字体样式
  removeFontStyles();
  
  // console.log('原始文本恢复完成');
}

// 恢复翻译后的内容
async function restoreTranslatedContent() {
  // console.log('恢复翻译后的内容');
  
  await translateElement(null);
  
  isShowingOriginal = false;
}

// 获取默认设置
async function getDefaultSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};
    const defaultSettings = {
      sourceLang: settings.sourceLang || 'auto',
      targetLang: settings.targetLang || 'zh',
      targetLangFont: settings.targetLangFont || '',
      apiProvider: settings.apiProvider || 'google',
      googleApiProxy: settings.googleApiProxy || ''
    };
    // console.log('获取默认设置:', defaultSettings);
    return defaultSettings;
  } catch (error) {
    console.error('获取设置失败:', error);
    return {
      sourceLang: 'auto',
      targetLang: 'zh',
      targetLangFont: '', // 添加字体设置
      apiProvider: 'google',
      googleApiProxy: ''
    };
  }
}

// 获取所有文本节点
function getTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // 排除脚本和样式标签中的文本
        const parent = node.parentElement;
        if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.trim()) {
      textNodes.push(node);
    }
  }
  
  return textNodes;
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 翻译单个文本节点（重构）
async function translateTextNode(node, settings) {
  const originalText = node.textContent; // 保存包含空格的完整原始内容
  const trimmedText = originalText.trim();
  
  if (!trimmedText || trimmedText.length < 2) {
    return;
  }

  // 如果节点是script标签，则跳过
  if (node.parentElement && node.parentElement.tagName === 'SCRIPT') {
    return;
  }

  // 如果是代码节点（<code>或者<pre>），则跳过
  if (node.parentElement && (node.parentElement.tagName === 'CODE' || node.parentElement.tagName === 'PRE')) {
    return;
  }
  
  // 1. 保存真实的原始文本
  saveOriginalText(node, originalText);

  // 2. 应用自定义词库替换
  let textToTranslate = originalText;
  if (customWords && Object.keys(customWords).length > 0) {
    const sortedWords = Object.keys(customWords).sort((a, b) => b.length - a.length);
    for (const originalWord of sortedWords) {
      const translatedWord = customWords[originalWord];
      const regex = new RegExp(`\\b${escapeRegExp(originalWord)}\\b`, 'gi');
      if (regex.test(textToTranslate)) {
        textToTranslate = textToTranslate.replace(regex, translatedWord);
      }
    }
  }
  
  // 3. 翻译处理后的文本
  try {
    // 如果替换后与原文相同，可能无需翻译（取决于需求，此处总是翻译以确保流程一致）
    const translatedText = await translateText(textToTranslate, settings);
    if (translatedText && translatedText !== originalText) {
      // 4. 更新DOM
      const parentElement = node.parentElement;
      if (parentElement) {
        parentElement.setAttribute('data-lazytranslate', 'translated');
      }
      node.textContent = translatedText;
    }
  } catch (error) {
    console.error('翻译文本节点失败:', error, '原始文本:', originalText);
    // 重新抛出错误，以中断 Promise.all
    throw error;
  }
}

// 翻译文本
async function translateText(text, settings) {
  return new Promise((resolve, reject) => {
    // console.log('发送翻译请求:', { text, settings });
    
    const msg = {
      action: 'translate',
      text: text,
      sourceLang: settings.sourceLang,
      targetLang: settings.targetLang,
      apiProvider: settings.apiProvider,
    };
    if (settings.apiProvider === 'google' && settings.googleApiProxy) {
      msg.googleApiProxy = settings.googleApiProxy;
    }
    chrome.runtime.sendMessage(msg, response => {
      if (chrome.runtime.lastError) {
        console.error('发送消息错误:', chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      if (response && response.success) {
        // console.log('翻译成功:', response.translatedText);
        resolve(response.translatedText);
      } else {
        console.error('翻译失败:', response?.error);
        reject(new Error(response?.error || '翻译失败'));
      }
    });
  });
}

// 更新翻译进度
function updateTranslationProgress(progress) {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = progress + '%';
  }
}

// 显示通知信息
function showNotification(message, type = 'info') {
  // 如果通知信息已显示，则移除
  const notification = document.querySelector('.lazytranslate-notification');
  if (notification) {
    notification.remove();
  }

  const notificationDiv = document.createElement('div');
  notificationDiv.className = 'lazytranslate-notification';
  notificationDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    z-index: 999999;
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
    text-align: center;
  `;
  
  notificationDiv.textContent = message;
  document.body.appendChild(notificationDiv);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (notificationDiv.parentElement) {
      notificationDiv.remove();
    }
  }, 3000);
}

// 应用字体设置
function applyFontSettings(fontFamily) {
  if (!fontFamily || fontFamily.trim() === '') {
    // console.log('未设置字体，使用默认字体');
    return;
  }
  
  // console.log('应用字体设置:', fontFamily);
  
  // 查找所有已翻译的元素
  const translatedElements = document.querySelectorAll('[data-lazytranslate="translated"]');
  
  if (translatedElements.length === 0) {
    // console.log('没有找到已翻译的元素');
    return;
  }
  
  // 移除之前的字体样式
  removeFontStyles();
  
  // 添加新的字体样式
  addFontStyle(fontFamily);
  
  // 为所有已翻译的元素添加字体class
  translatedElements.forEach(element => {
    element.classList.add('lazytranslate-font-applied');
    
    // 递归应用到所有子元素
    const childElements = element.querySelectorAll('*');
    childElements.forEach(child => {
      child.classList.add('lazytranslate-font-applied');
    });
  });
  
  // console.log(`字体已应用到 ${translatedElements.length} 个翻译元素`);
}

// 添加字体样式到页面
function addFontStyle(fontFamily) {
  // 移除之前的字体样式
  removeFontStyles();
  
  // 创建新的样式元素
  const styleElement = document.createElement('style');
  styleElement.id = 'lazytranslate-font-style';
  styleElement.textContent = `
    .lazytranslate-font-applied {
      font-family: "${fontFamily}" !important;
    }
  `;
  
  document.head.appendChild(styleElement);
  // console.log('字体样式已添加到页面');
}

// 移除字体样式
function removeFontStyles() {
  const existingStyle = document.getElementById('lazytranslate-font-style');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // 移除所有字体class
  const elementsWithFontClass = document.querySelectorAll('.lazytranslate-font-applied');
  elementsWithFontClass.forEach(element => {
    element.classList.remove('lazytranslate-font-applied');
  });
  
  // console.log('字体样式已移除');
}

// 监听自定义词库变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.customWords) {
    customWords = changes.customWords.newValue || {};
    // console.log('自定义词库已更新:', customWords);
  }
}); 