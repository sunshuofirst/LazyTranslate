// 全局变量
let customWords = {};
let translationOverlay = null;
let originalTexts = new Map(); // 保存原始文本内容
let isShowingOriginal = false; // 标记是否正在显示原文
let isSelectingArea = false; // 标记是否正在选择区域
let isTranslating = false; // 标记是否正在翻译
let translationAborted = false; // 标记翻译是否被中止
let elementSelector = null; // 元素选择器实例

// 安全获取元素的className字符串
function getElementClassName(element) {
  if (!element || !element.className) {
    return '';
  }
  return typeof element.className === 'string' 
    ? element.className 
    : element.className.toString();
}

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
    // console.error('加载自定义词库失败:', error);
  }
}

// 设置消息监听器
function setupMessageListener() {
  // console.log('设置消息监听器');
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log('Content script 收到消息:', request);
    
    // 处理语言变化消息
    if (request.type === 'LANGUAGE_CHANGED') {
      // 如果页面中有翻译相关的界面，可以在这里更新
      // 目前 content script 主要处理翻译逻辑，暂时不需要处理语言变化
      return;
    }
    
    switch (request.action) {
      case 'translateCurrentPage':
        // console.log('开始翻译页面');
        translateElement(null).then(() => {
          sendResponse({ success: true, message: '页面翻译完成' });
        }).catch(error => {
          // console.error('翻译页面失败:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // 保持消息通道开放
        
      case 'translateSelection':
        // console.log('开始区域选择翻译');
        startAreaSelection().then(() => {
          sendResponse({ success: true, message: '区域选择模式已启动' });
        }).catch(error => {
          // console.error('启动区域选择失败:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // 保持消息通道开放
        
      case 'showOriginal':
        // console.log('显示网页原文');
        showOriginalPage().then(() => {
          sendResponse({ success: true, message: '显示原文完成' });
        }).catch(error => {
          // console.error('显示原文失败:', error);
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
      // console.error('发送测试消息失败:', error);
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
    // console.error('启动区域选择失败:', error);
    throw error;
  }
}

// 处理键盘事件
function handleKeyDown(event) {
  if (event.key === 'Escape') {
    if (isSelectingArea) {
      // console.log('用户按ESC键，退出选择模式');
      stopAreaSelection();
    } else if (isTranslating) {
      // console.log('用户按ESC键，中止翻译');
      abortTranslation();
    }
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
    // 设置翻译状态
    isTranslating = true;
    translationAborted = false;
    
    // 添加ESC键监听器
    document.addEventListener('keydown', handleKeyDown);
    
    // 1. 加载设置和自定义词库
    await loadCustomWords();
    const settings = await getDefaultSettings();
    
    // 2. 获取元素内的所有文本节点（包括Shadow DOM）
    const textNodes = await getTextNodesIncludingAllShadow(element === null ? document.body : element);
    if (textNodes.length === 0) {
      showNotification('该区域没有可翻译的文本', 'error');
      return;
    }

    // 3. 去重和过滤文本节点
    const uniqueTextNodes = [];
    const processedTexts = new Set();
    
    textNodes.forEach((node, index) => {
      const text = node.textContent.trim();
      
      // 跳过已经翻译过的节点
      if (node.parentElement && node.parentElement.hasAttribute('data-lazytranslate')) {
        return;
      }
      
      // 跳过重复文本
      if (processedTexts.has(text)) {
        return;
      }
      
      // 跳过过短的文本
      if (text.length < 3) {
        return;
      }
      
      processedTexts.add(text);
      uniqueTextNodes.push(node);
    });
    
    if (uniqueTextNodes.length === 0) {
      showNotification('没有找到需要翻译的文本', 'error');
      return;
    }
    

    // 显示中止提示
    showNotification('翻译中... (按ESC键中止)', 'info');

    // 4. 批量翻译节点，所有逻辑都在 translateTextNode 中处理
    const batchSize = 5;
    let interval = settings.apiProvider == 'google' ? 100 : 1000;


    for (let i = 0; i < uniqueTextNodes.length; i += batchSize) {
      // 检查是否被中止
      if (translationAborted) {
        showNotification('翻译已中止', 'error');
        return;
      }
      
      const batch = uniqueTextNodes.slice(i, i + batchSize);
      
      const promises = batch.map((node, index) => {
        return translateTextNode(node, settings);
      }); 
      
      try {
        // console.log(`执行批次翻译...`);
        await Promise.all(promises);
        // console.log(`批次翻译完成`);
      } catch (error) {
        // console.error(`批次翻译失败:`, error);
        if (translationAborted) {
          showNotification('翻译已中止', 'error');
          return;
        }
        throw error;
      }
      
      const progress = Math.min(100, ((i + batchSize) / textNodes.length) * 100);

      showNotification(`翻译进度: ${Math.round(progress)}% (按ESC键中止)`, 'info');
      
      // 添加延迟，避免API限制
      if (i + batchSize < textNodes.length) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    // 翻译成功后
    if (!translationAborted) {
      showNotification('页面翻译完成', 'success');
    }
  } catch (error) {
    if (translationAborted) {
      showNotification('翻译已中止', 'error');
    } else {
      // console.error('翻译元素失败:', error);
      showNotification('翻译失败，请检查控制台', 'error');
    }
  } finally {
    // 清理翻译状态
    isTranslating = false;
    translationAborted = false;
    
    // 移除ESC键监听器（只有在不处于选择模式时才移除）
    if (!isSelectingArea) {
      document.removeEventListener('keydown', handleKeyDown);
    }
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
    // console.error('显示网页原文失败:', error);
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

// 生成节点ID（支持Shadow DOM）
function generateNodeId(node) {
  const path = [];
  let current = node;
  let shadowDepth = 0;
  
  while (current) {
    const parent = current.parentElement || current.parentNode;
    
    if (parent) {
      // 检查是否跨越了Shadow DOM边界
      if (current.host) {
        // 到达Shadow DOM的根节点
        shadowDepth++;
        path.unshift(`shadow-${shadowDepth}`);
        current = current.host; // 跳到Shadow Host
        continue;
      }
      
      const index = Array.from(parent.childNodes).indexOf(current);
      path.unshift(index);
      current = parent;
      
      // 如果到达了document.body或document.documentElement，停止
      if (current === document.body || current === document.documentElement) {
        break;
      }
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

  // 1. 处理常规DOM中的翻译元素
  const translatedElements = document.querySelectorAll('[data-lazytranslate-id]');
  
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

  // 2. 处理Shadow DOM中的翻译元素
  await restoreShadowDOMTexts();

  // 移除字体样式
  removeFontStyles();
  
  // console.log('原始文本恢复完成');
}

// 恢复Shadow DOM中的原始文本
async function restoreShadowDOMTexts() {
  const shadowRoots = getAllShadowRootsRecursive(document.body);
  
  for (const shadowRoot of shadowRoots) {
    try {
      // 在Shadow DOM中查找被翻译的元素
      const translatedElements = shadowRoot.querySelectorAll('[data-lazytranslate-id]');
      
      for (const element of translatedElements) {
        const nodeId = element.getAttribute('data-lazytranslate-id');
        const originalText = originalTexts.get(nodeId);
        
        if (originalText) {
          // 找到该元素下的文本节点并恢复原始文本
          const textNodes = getTextNodes(element);
          for (const textNode of textNodes) {
            if (textNode.textContent.trim()) {
              textNode.textContent = originalText;
              break;
            }
          }
        }
        
        // 移除标记属性
        element.removeAttribute('data-lazytranslate-id');
        element.removeAttribute('data-lazytranslate');
      }
    } catch (e) {
      // console.warn('无法恢复Shadow DOM文本:', e);
    }
  }
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
    // console.error('获取设置失败:', error);
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
        
        // 排除代码块中的文本
        if (isInsideCodeBlock(node)) {
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

// 获取所有Shadow DOM根节点
function getAllShadowRootsRecursive(element) {
  const shadowRoots = [];
  
  function traverse(el) {
    // 直接访问shadowRoot属性（只适用于open模式）
    if (el.shadowRoot) {
      shadowRoots.push(el.shadowRoot);
      traverse(el.shadowRoot);
    }
    
    // 递归处理子元素
    Array.from(el.children || []).forEach(child => traverse(child));
  }
  
  traverse(element);
  return shadowRoots;
}

// 获取包含Shadow DOM的所有文本节点
async function getTextNodesIncludingAllShadow(element) {
  const textNodes = [];
  
  // 检查元素是否在Shadow DOM中
  const isInShadow = isElementInShadowDOM(element);
  
  if (isInShadow) {
    // console.log('选中的元素在Shadow DOM中，使用特殊处理逻辑');
    
    // 检查是否是包含slot的内容容器
    const hasSlots = element.querySelectorAll('slot').length > 0;
    
    if (hasSlots) {
      // console.log('🔍 检测到slot元素，等待动态内容加载...');
      
      // 对于Salesforce页面，我们需要等待更长时间让内容完全加载
      // await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 等待动态内容加载
      try {
        const dynamicNodes = await waitAndProcessDynamicContent(element);
        if (dynamicNodes.length > 0) {
          textNodes.push(...dynamicNodes);
        } else {
          const docContentElements = document.querySelectorAll('doc-content');
          docContentElements.forEach((docEl, index) => {
            if (docEl.shadowRoot) {
              const docNodes = getTextNodes(docEl.shadowRoot);
              if (docNodes.length > 0) {
                textNodes.push(...docNodes);
              }
            }
          });
        }
      } catch (error) {
        textNodes.push(...getTextNodesFromShadowElement(element));
      }
    } else {
      // 如果选中的元素在Shadow DOM中，直接处理该元素及其子树
      textNodes.push(...getTextNodesFromShadowElement(element));
    }
  } else {
    // 1. 获取常规DOM中的文本节点
    textNodes.push(...getTextNodes(element));
    
    // 2. 获取所有Shadow DOM中的文本节点
    const shadowRoots = getAllShadowRootsRecursive(element);
    shadowRoots.forEach(shadowRoot => {
      try {
        const shadowTextNodes = getTextNodes(shadowRoot);
        textNodes.push(...shadowTextNodes);
      } catch (e) {
        // console.warn('无法访问Shadow DOM:', e);
      }
    });
  }
  
  return textNodes;
}

// 检查元素是否在Shadow DOM中
function isElementInShadowDOM(element) {
  let current = element;
  while (current) {
    if (current.host) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

// 等待并处理动态内容的函数
function waitAndProcessDynamicContent(element, maxWaitTime = 5000) {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20; // 减少尝试次数，避免无限等待
    
    const checkForContent = () => {
      attempts++;
      
      // 深度搜索所有Shadow DOM和slot内容
      const foundNodes = [];
      const processedTexts = new Set();
      
      // 函数：递归搜索Shadow DOM
      function searchInShadowDOM(root, depth = 0) {
        if (depth > 5) return; // 防止无限递归
        
        const shadowElements = root.querySelectorAll('*');
        shadowElements.forEach(el => {
          // 检查每个元素是否有Shadow DOM
          if (el.shadowRoot) {
            // 搜索Shadow DOM中的文本
            const walker = document.createTreeWalker(
              el.shadowRoot,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: function(node) {
                  const text = node.textContent.trim();
                  if (text.length > 10 && !processedTexts.has(text)) {
                    // 排除Cookie弹窗和导航内容
                    const isMainContent = !text.includes('Cookie') &&
                                        !text.includes('cookies') &&
                                        !text.includes('广告') &&
                                        !text.includes('Search') &&
                                        !text.includes('PDF') &&
                                        !text.includes('DID THIS ARTICLE') &&
                                        !text.includes('Let us know') &&
                                        !text.includes('Share your feedback');
                    
                    if (isMainContent) {
                      // console.log(`✅ 在Shadow DOM深度 ${depth} 找到内容: ${text.substring(0, 100)}...`);
                      return NodeFilter.FILTER_ACCEPT;
                    }
                  }
                  return NodeFilter.FILTER_SKIP;
                }
              },
              false
            );
            
            let node;
            while (node = walker.nextNode()) {
              const text = node.textContent.trim();
              if (!processedTexts.has(text)) {
                processedTexts.add(text);
                foundNodes.push(node);
              }
            }
            
            // 递归搜索嵌套的Shadow DOM
            searchInShadowDOM(el.shadowRoot, depth + 1);
          }
        });
      }
      
      // 开始搜索
      searchInShadowDOM(element);
      
      // 同时搜索slot分配的内容
      const slots = element.querySelectorAll('slot');
      slots.forEach((slot, index) => {
        // console.log(`🔍 检查slot ${index + 1}...`);
        if (slot.assignedNodes) {
          const assignedNodes = slot.assignedNodes();
          assignedNodes.forEach((node, nodeIndex) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 特别检查Salesforce文档元素
              if (node.tagName && (
                node.tagName.toLowerCase().includes('doc-') ||
                (node.className && String(node.className).includes('doc-')) ||
                node.tagName === 'DOC-BREADCRUMBS' ||
                node.tagName === 'DOC-CONTENT'
              )) {
                // 获取Shadow DOM内容
                if (node.shadowRoot) {
                  try {
                    // 直接使用getTextNodes处理shadowRoot
                    const directNodes = getTextNodes(node.shadowRoot);
                    directNodes.forEach(textNode => {
                      const text = textNode.textContent.trim();
                      if (text.length > 5 && !processedTexts.has(text)) {
                        processedTexts.add(text);
                        foundNodes.push(textNode);
                      }
                    });
                  } catch (e) {
                    // console.log(`❌ ${node.tagName} Shadow DOM处理出错:`, e);
                  }
                }
                
                // 获取普通DOM内容
                const textNodes = getTextNodes(node);
                textNodes.forEach(textNode => {
                  const text = textNode.textContent.trim();
                  if (text.length > 5 && !processedTexts.has(text)) {
                    processedTexts.add(text);
                    foundNodes.push(textNode);
                  }
                });
              } else {
                // 普通元素处理
                const textNodes = getTextNodes(node);
                textNodes.forEach(textNode => {
                  const text = textNode.textContent.trim();
                  if (text.length > 10 && !processedTexts.has(text)) {
                    // 检查是否是主要内容
                    const isMainContent = !text.includes('Cookie') &&
                                        !text.includes('cookies') &&
                                        !text.includes('DID THIS ARTICLE') &&
                                        text.length > 20;
                    
                    if (isMainContent) {
                      processedTexts.add(text);
                      foundNodes.push(textNode);
                    }
                  }
                });
              }
            }
          });
        }
      });
      
      // 如果找到了内容或者尝试足够多次就结束
      if (foundNodes.length > 0 || attempts >= maxAttempts) {
        resolve(foundNodes);
        return;
      }
      
      // 继续等待
      setTimeout(checkForContent, 250); // 增加间隔时间
    };
    
    checkForContent();
  });
}

// 从Shadow DOM中的元素获取文本节点
function getTextNodesFromShadowElement(element) {
  const textNodes = [];
  
  // 直接从选中的Shadow DOM元素开始遍历
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const textContent = node.textContent.trim();
        if (!textContent) {
          return NodeFilter.FILTER_REJECT;
        }
        
        const parent = node.parentElement;
        if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
          return NodeFilter.FILTER_REJECT;
        }
        
        try {
          if (isInsideCodeBlock(node)) {
            return NodeFilter.FILTER_REJECT;
          }
        } catch (e) {
          // console.warn('代码块检查出错:', e);
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let node;
  let nodeCount = 0;
  while (node = walker.nextNode()) {
    nodeCount++;
    if (node.textContent.trim()) {
      textNodes.push(node);
    }
  }
  
  // 递归处理选中元素内可能存在的嵌套Shadow DOM
  const nestedShadowRoots = getAllShadowRootsRecursive(element);
  nestedShadowRoots.forEach(shadowRoot => {
    try {
      const shadowTextNodes = getTextNodes(shadowRoot);
      textNodes.push(...shadowTextNodes);
    } catch (e) {
      // console.warn('无法访问嵌套Shadow DOM:', e);
    }
  });
  
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
  
  // 检查翻译是否被中止
  if (translationAborted) {
    throw new Error('翻译已中止');
  }
  
  if (!trimmedText || trimmedText.length < 2) {
    return;
  }

  // 如果节点是script标签，则跳过
  if (node.parentElement && node.parentElement.tagName === 'SCRIPT') {
    return;
  }

  // 如果是代码节点（<code>或者<pre>），则跳过
  if (isInsideCodeBlock(node)) {
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
    // 再次检查翻译是否被中止
    if (translationAborted) {
      throw new Error('翻译已中止');
    }
    
    // 如果替换后与原文相同，可能无需翻译（取决于需求，此处总是翻译以确保流程一致）
    const translatedText = await translateText(textToTranslate, settings);
    
    // 翻译完成后再次检查是否被中止
    if (translationAborted) {
      throw new Error('翻译已中止');
    }
    
    if (translatedText && translatedText !== originalText) {
      // 4. 更新DOM
      const parentElement = node.parentElement;
      if (parentElement) {
        parentElement.setAttribute('data-lazytranslate', 'translated');
      }
      
      // 记录更新前后的内容
      node.textContent = translatedText;
      
      // 6. 监控DOM内容是否被其他脚本覆盖
      const monitorTextNode = node;
      const expectedText = translatedText;
      
      // 检查是否是LWC组件
      const isInLWC = parentElement && (
        (parentElement.className && String(parentElement.className).includes('lwc-')) || 
        parentElement.closest('[class*="lwc-"]') ||
        parentElement.tagName.includes('DX-') ||
        parentElement.closest('[class*="slds-"]')
      );
      
      if (isInLWC) {
        // 对于LWC组件，尝试多种策略
        const lwcStrategies = [
          // 策略1: 强制触发重新渲染
          () => {
            if (parentElement.style) {
              const originalDisplay = parentElement.style.display;
              parentElement.style.display = 'none';
              parentElement.offsetHeight; // 强制重排
              parentElement.style.display = originalDisplay;
            }
          },
          
          // 策略2: 触发自定义事件
          () => {
            const event = new CustomEvent('lazytranslate-updated', {
              detail: { translatedText: expectedText, originalText: originalText }
            });
            parentElement.dispatchEvent(event);
          },
          
          // 策略3: 标记数据属性
          () => {
            parentElement.setAttribute('data-lazytranslate-text', expectedText);
            parentElement.setAttribute('data-lazytranslate-timestamp', Date.now());
          }
        ];
        
        // 执行所有策略
        lwcStrategies.forEach((strategy, index) => {
          try {
            strategy();
          } catch (error) {
            // console.log(`❌ LWC策略 ${index + 1} 失败:`, error);
          }
        });
      }
      
    } else {
      // console.log(`⚠️ 翻译结果与原文相同或为空，原文: "${originalText}", 译文: "${translatedText}"`);
    }
  } catch (error) {
    if (translationAborted || error.message === '翻译已中止') {
      throw new Error('翻译已中止');
    }
    // 重新抛出错误，以中断 Promise.all
    throw error;
  }
}

// 翻译文本
async function translateText(text, settings) {
  return new Promise((resolve, reject) => {
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
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      if (response && response.success) {
        resolve(response.translatedText);
      } else {
        reject(new Error(response?.error || '翻译失败'));
      }
    });
  });
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
  // 移除主文档中的字体样式
  const existingStyle = document.getElementById('lazytranslate-font-style');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // 移除主文档中所有字体class
  const elementsWithFontClass = document.querySelectorAll('.lazytranslate-font-applied');
  elementsWithFontClass.forEach(element => {
    element.classList.remove('lazytranslate-font-applied');
  });

  // 移除Shadow DOM中的字体样式
  removeShadowDOMFontStyles();
  
  // console.log('字体样式已移除');
}

// 移除Shadow DOM中的字体样式
function removeShadowDOMFontStyles() {
  const shadowRoots = getAllShadowRootsRecursive(document.body);
  
  for (const shadowRoot of shadowRoots) {
    try {
      // 移除Shadow DOM中的字体样式
      const existingStyle = shadowRoot.getElementById('lazytranslate-font-style');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      // 移除Shadow DOM中所有字体class
      const elementsWithFontClass = shadowRoot.querySelectorAll('.lazytranslate-font-applied');
      elementsWithFontClass.forEach(element => {
        element.classList.remove('lazytranslate-font-applied');
      });
    } catch (e) {
      // console.warn('无法移除Shadow DOM字体样式:', e);
    }
  }
}

// 为单个元素应用字体设置
function applyFontToElement(element, fontFamily) {
  if (!fontFamily || fontFamily.trim() === '') {
    return;
  }
  
  // 检查元素是否在Shadow DOM中
  const shadowRoot = getShadowRootForElement(element);
  
  if (shadowRoot) {
    // 在Shadow DOM中应用字体
    ensureFontStyleExistsInShadowDOM(shadowRoot, fontFamily);
  } else {
    // 在主文档中应用字体
    ensureFontStyleExists(fontFamily);
  }
  
  // 为当前元素添加字体class
  element.classList.add('lazytranslate-font-applied');
  
  // 递归应用到所有子元素
  const childElements = element.querySelectorAll('*');
  childElements.forEach(child => {
    child.classList.add('lazytranslate-font-applied');
  });
}

// 获取元素所在的Shadow DOM根节点
function getShadowRootForElement(element) {
  let current = element;
  while (current) {
    if (current.host) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

// 在Shadow DOM中确保字体样式存在
function ensureFontStyleExistsInShadowDOM(shadowRoot, fontFamily) {
  const existingStyle = shadowRoot.getElementById('lazytranslate-font-style');
  
  if (existingStyle) {
    const expectedContent = `.lazytranslate-font-applied {\n      font-family: "${fontFamily}" !important;\n    }`;
    if (existingStyle.textContent.trim().includes(`font-family: "${fontFamily}"`)) {
      return;
    }
    existingStyle.textContent = expectedContent;
  } else {
    const styleElement = document.createElement('style');
    styleElement.id = 'lazytranslate-font-style';
    styleElement.textContent = `
    .lazytranslate-font-applied {
      font-family: "${fontFamily}" !important;
    }
  `;
    shadowRoot.appendChild(styleElement);
  }
}

// 确保字体样式存在于页面中
function ensureFontStyleExists(fontFamily) {
  const existingStyle = document.getElementById('lazytranslate-font-style');
  
  // 如果样式已存在且字体相同，则无需重新创建
  if (existingStyle) {
    const expectedContent = `.lazytranslate-font-applied {\n      font-family: "${fontFamily}" !important;\n    }`;
    if (existingStyle.textContent.trim().includes(`font-family: "${fontFamily}"`)) {
      return;
    }
    // 如果字体不同，则更新样式
    existingStyle.textContent = expectedContent;
  } else {
    // 创建新的样式元素
    const styleElement = document.createElement('style');
    styleElement.id = 'lazytranslate-font-style';
    styleElement.textContent = `
    .lazytranslate-font-applied {
      font-family: "${fontFamily}" !important;
    }
  `;
    document.head.appendChild(styleElement);
  }
}

// 检查节点是否在代码块内（递归检查所有父级元素）
function isInsideCodeBlock(node) {
  let current = node.parentElement;
  let depth = 0; // 防止无限循环
  const maxDepth = 50; // 最大遍历深度
  
  while (current && depth < maxDepth) {
    const tagName = current.tagName;
    
    // 检查是否是代码相关的标签
    if (tagName === 'CODE' || tagName === 'PRE' || tagName === 'KBD' || tagName === 'SAMP' || tagName === 'VAR') {
      return true;
    }
    
    // 检查是否有代码相关的class
    if (current.className) {
      try {
        const className = getElementClassName(current).toLowerCase();
        if (className.includes('code') || 
            className.includes('highlight') || 
            className.includes('syntax') ||
            className.includes('language-') ||
            className.includes('hljs') ||
            className.includes('prism')) {
          return true;
        }
      } catch (e) {
        // console.warn('检查className时出错:', e);
      }
    }
    
    // 检查是否有代码相关的data属性
    if (current.hasAttribute && 
        (current.hasAttribute('data-lang') || 
         current.hasAttribute('data-language') ||
         current.hasAttribute('data-code'))) {
      return true;
    }
    
    // 更好的终止条件：到达document.body、document.documentElement或Shadow Root
    if (current === document.body || 
        current === document.documentElement || 
        current.host) { // Shadow Root
      break;
    }
    
    current = current.parentElement;
    depth++;
  }
  
  return false;
}

// 等待Web Component完全加载
function waitForComponentToLoad(component, componentName, maxWait = 3000) {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 30;
    
    const checkLoaded = () => {
      attempts++;
      
      // 检查组件是否已完全加载
      const isLoaded = component.shadowRoot || 
                      component.textContent.trim().length > 0 ||
                      component.children.length > 0;
      
      if (isLoaded || attempts >= maxAttempts) {
        resolve();
      } else {
        setTimeout(checkLoaded, 100);
      }
    };
    
    checkLoaded();
  });
}

// 监听自定义词库变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.customWords) {
    customWords = changes.customWords.newValue || {};
    // console.log('自定义词库已更新:', customWords);
  }
});

// 中止翻译
function abortTranslation() {
  // console.log('中止翻译');
  
  if (!isTranslating) {
    return;
  }
  
  translationAborted = true;
  showNotification('正在中止翻译...', 'info');
}
