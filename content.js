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

// 初始化
// console.log('LazyTranslate content script 已加载');

// 立即设置消息监听器
setupMessageListener();

// 启用Shadow DOM拦截
interceptShadowDOMCreation();

// 立即注册调试工具（不等待延迟加载）
window.LazyTranslateDebug = {
  mapContent: () => mapEntirePageContent(),
  analyzeElement: (selector) => {
    const el = document.querySelector(selector);
    if (el) {
      analyzeShadowDOMStructure(el);
      return getTextNodes(el);
    }
    return null;
  },
  findBestContent: () => {
    const candidates = mapEntirePageContent();
    if (candidates.length > 0) {
      console.log('🎯 推荐翻译目标:', candidates[0]);
      return candidates[0].element;
    }
    return null;
  },
  translateDocContent: async () => {
    console.log('🔍 查找DOC-CONTENT元素...');
    const docContent = document.querySelector('doc-content');
    if (docContent) {
      console.log('✅ 找到DOC-CONTENT，开始翻译...');
      await translateElement(docContent);
    } else {
      console.log('❌ 未找到DOC-CONTENT元素');
    }
  },
  // ⭐ 测试Web Components检测
  testWebComponents: async () => {
    console.log('🧪 测试Web Components检测...');
    const contentBody = document.querySelector('[class*="content-body"]') || 
                       document.querySelector('.content-body') ||
                       document.body;
    if (contentBody) {
      try {
        const nodes = await processSalesforceWebComponents(contentBody);
        console.log(`🎯 找到 ${nodes.length} 个Web Component文本节点`);
        return nodes;
      } catch (e) {
        console.log('❌ Web Components测试出错:', e);
        return [];
      }
    }
    return [];
  },
  // ⭐ 直接翻译slot内容
  translateSlotContent: async () => {
    console.log('🔍 查找slot内容...');
    const contentBody = document.querySelector('[class*="content-body"]');
    if (contentBody) {
      console.log('✅ 找到content-body，开始翻译slot内容...');
      await translateElement(contentBody);
    } else {
      console.log('❌ 未找到content-body元素');
    }
  },
  // ⭐ 强制翻译DOC-CONTENT
  forceTranslateDocContent: async () => {
    console.log('🔍 强制查找并翻译DOC-CONTENT...');
    const docElements = document.querySelectorAll('doc-content');
    console.log(`找到 ${docElements.length} 个doc-content元素`);
    
    for (let i = 0; i < docElements.length; i++) {
      const docEl = docElements[i];
      console.log(`处理doc-content ${i + 1}: Shadow DOM = ${!!docEl.shadowRoot}`);
      
      if (docEl.shadowRoot) {
        const textNodes = getTextNodes(docEl.shadowRoot);
        console.log(`找到 ${textNodes.length} 个文本节点`);
        
        for (const node of textNodes) {
          const text = node.textContent.trim();
          if (text.length > 20) {
            console.log(`文本内容: ${text.substring(0, 100)}...`);
          }
        }
        
        if (textNodes.length > 0) {
          console.log('开始翻译DOC-CONTENT...');
          await translateElement(docEl);
          break;
        }
      }
    }
  }
};

console.log('🔧 LazyTranslate调试工具已准备就绪！使用 window.LazyTranslateDebug 访问。');
console.log('💡 测试Web Components: window.LazyTranslateDebug.testWebComponents()');
console.log('💡 翻译slot内容: window.LazyTranslateDebug.translateSlotContent()');
console.log('💡 强制翻译DOC-CONTENT: window.LazyTranslateDebug.forceTranslateDocContent()');

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
      console.log('选择了区域:', element);
      console.log('元素是否在Shadow DOM中:', isElementInShadowDOM(element));
      console.log('元素标签名:', element.tagName);
      console.log('元素文本内容预览:', element.textContent?.substring(0, 100));
      
      // 检测页面环境
      detectPageEnvironment();
      
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

// 检查元素及其翻译内容的可见性
function checkElementVisibility(element, translatedNodes) {
  console.log('🔍 检查元素可见性和翻译状态...');
  
  const checks = {
    element: {
      display: getComputedStyle(element).display,
      visibility: getComputedStyle(element).visibility,
      opacity: getComputedStyle(element).opacity,
      offsetParent: element.offsetParent !== null,
      clientRect: element.getBoundingClientRect(),
      zIndex: getComputedStyle(element).zIndex
    },
    shadowDOM: {
      isInShadowDOM: !!element.getRootNode().host,
      shadowRoot: element.getRootNode(),
      hostElement: element.getRootNode().host
    }
  };
  
  console.log('📊 元素可见性检查结果:', checks);
  
  // 检查每个翻译节点的状态
  translatedNodes.forEach((node, index) => {
    const nodeInfo = {
      textContent: node.textContent,
      isConnected: node.isConnected,
      parentElement: node.parentElement?.tagName,
      parentClass: node.parentElement?.className,
      nodeType: node.nodeType
    };
    console.log(`📋 翻译节点 ${index + 1} 状态:`, nodeInfo);
  });
  
  // 检查是否有CSS样式可能隐藏了内容
  const hiddenByCSS = 
    checks.element.display === 'none' ||
    checks.element.visibility === 'hidden' ||
    parseFloat(checks.element.opacity) === 0;
    
  if (hiddenByCSS) {
    console.warn('⚠️ 元素被CSS隐藏！', {
      display: checks.element.display,
      visibility: checks.element.visibility,
      opacity: checks.element.opacity
    });
  }
  
  return checks;
}

// 检测页面JavaScript环境
function detectPageEnvironment() {
  console.log('🔍 检测页面JavaScript环境...');
  
  const frameworks = {
    'React': () => window.React || document.querySelector('[data-reactroot]') || document.querySelector('[data-react-helmet]'),
    'Vue': () => window.Vue || document.querySelector('[data-v-]') || document.querySelector('.vue-'),
    'Angular': () => window.angular || window.ng || document.querySelector('[ng-app]') || document.querySelector('[ng-controller]'),
    'jQuery': () => window.jQuery || window.$,
    'LWC (Lightning Web Components)': () => document.querySelector('[class*="lwc-"]') || document.querySelector('lightning-'),
    'Salesforce': () => window.sforce || window.Sfdc || document.querySelector('[class*="slds-"]'),
    'Aura Framework': () => window.$A || document.querySelector('[data-aura-class]'),
    'MutationObserver': () => window.MutationObserver,
    'Proxy Support': () => window.Proxy
  };
  
  const detected = [];
  for (const [name, detector] of Object.entries(frameworks)) {
    if (detector()) {
      detected.push(name);
    }
  }
  
  console.log('🎯 检测到的框架/技术:', detected);
  
  // 检查是否有活跃的MutationObserver
  console.log('🔬 检查DOM观察器...');
  const testElement = document.createElement('div');
  document.body.appendChild(testElement);
  testElement.textContent = 'test-mutation-observer';
  
  setTimeout(() => {
    if (testElement.textContent !== 'test-mutation-observer') {
      console.log('⚠️ 检测到活跃的DOM监听器正在修改内容');
    }
    testElement.remove();
  }, 10);
  
  return detected;
}

// 验证翻译结果
function verifyTranslationResults(element) {
  console.log('🔍 开始验证翻译结果...');
  
  const targetElement = element || document.body;
  const isInShadow = isElementInShadowDOM(targetElement);
  
  let currentTextNodes = [];
  
  if (isInShadow) {
    console.log('验证Shadow DOM中的翻译结果');
    // 获取当前Shadow DOM中的文本内容
    currentTextNodes = getTextNodesFromShadowElement(targetElement);
    console.log(`当前找到 ${currentTextNodes.length} 个文本节点`);
    
    currentTextNodes.forEach((node, index) => {
      const text = node.textContent.trim();
      if (text) {
        console.log(`节点 ${index + 1}: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      }
    });
  } else {
    console.log('验证常规DOM中的翻译结果');
    currentTextNodes = getTextNodes(targetElement);
    console.log(`当前找到 ${currentTextNodes.length} 个文本节点`);
    
    currentTextNodes.forEach((node, index) => {
      const text = node.textContent.trim();
      if (text) {
        console.log(`节点 ${index + 1}: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      }
    });
  }
  
  // 检查被标记为已翻译的元素
  const translatedElements = targetElement.querySelectorAll ? 
    targetElement.querySelectorAll('[data-lazytranslate="translated"]') : 
    [];
  console.log(`找到 ${translatedElements.length} 个被标记为已翻译的元素`);
  
  // 检查元素可见性
  if (targetElement && currentTextNodes && currentTextNodes.length > 0) {
    checkElementVisibility(targetElement, currentTextNodes);
    
    // 对于Salesforce LWC组件，尝试强制刷新
    if (targetElement.className && (targetElement.className.includes('lwc-') || targetElement.closest('[class*="lwc-"]'))) {
      console.log('🔄 尝试强制刷新LWC组件显示...');
      
      setTimeout(() => {
        // 强制重新计算样式
        const allElements = targetElement.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.style) {
            const currentTransform = el.style.transform;
            el.style.transform = 'translateZ(0)';
            el.offsetHeight; // 强制重排
            el.style.transform = currentTransform;
          }
        });
        
        // 触发窗口resize事件，可能强制LWC重新渲染
        window.dispatchEvent(new Event('resize'));
        
        console.log('✅ LWC组件刷新完成');
      }, 200);
    }
  }
  
  console.log('✅ 翻译结果验证完成');
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

    console.log(`发现 ${textNodes.length} 个文本节点（包括Shadow DOM）`);

    // 3. 去重和过滤文本节点
    const uniqueTextNodes = [];
    const processedTexts = new Set();
    
    textNodes.forEach((node, index) => {
      const text = node.textContent.trim();
      
      // 跳过已经翻译过的节点
      if (node.parentElement && node.parentElement.hasAttribute('data-lazytranslate')) {
        console.log(`⏭️ 跳过已翻译节点 ${index + 1}: ${text.substring(0, 50)}...`);
        return;
      }
      
      // 跳过重复文本
      if (processedTexts.has(text)) {
        console.log(`⏭️ 跳过重复文本 ${index + 1}: ${text.substring(0, 50)}...`);
        return;
      }
      
      // 跳过过短的文本
      if (text.length < 3) {
        return;
      }
      
      processedTexts.add(text);
      uniqueTextNodes.push(node);
      console.log(`✅ 接受文本节点 ${uniqueTextNodes.length}: ${text.substring(0, 50)}...`);
    });
    
    if (uniqueTextNodes.length === 0) {
      showNotification('没有找到需要翻译的文本', 'error');
      return;
    }
    
    console.log(`去重后剩余 ${uniqueTextNodes.length} 个唯一文本节点需要翻译`);

    // 显示中止提示
    showNotification('翻译中... (按ESC键中止)', 'info');

    // 4. 批量翻译节点，所有逻辑都在 translateTextNode 中处理
    const batchSize = 5;
    let interval = settings.apiProvider == 'google' ? 100 : 1000;

    console.log(`开始批量翻译，批次大小: ${batchSize}, 间隔: ${interval}ms`);

    for (let i = 0; i < uniqueTextNodes.length; i += batchSize) {
      // 检查是否被中止
      if (translationAborted) {
        showNotification('翻译已中止', 'error');
        return;
      }
      
      const batch = uniqueTextNodes.slice(i, i + batchSize);
      console.log(`翻译批次 ${Math.floor(i/batchSize) + 1}, 节点数: ${batch.length}`);
      
      const promises = batch.map((node, index) => {
        console.log(`准备翻译节点 ${i + index + 1}: "${node.textContent.trim().substring(0, 50)}..."`);
        return translateTextNode(node, settings);
      }); 
      
      try {
        console.log(`执行批次翻译...`);
        await Promise.all(promises);
        console.log(`批次翻译完成`);
      } catch (error) {
        console.error(`批次翻译失败:`, error);
        if (translationAborted) {
          showNotification('翻译已中止', 'error');
          return;
        }
        throw error;
      }
      
      const progress = Math.min(100, ((i + batchSize) / textNodes.length) * 100);
      updateTranslationProgress(progress);

      showNotification(`翻译进度: ${Math.round(progress)}% (按ESC键中止)`, 'info');
      
      // 添加延迟，避免API限制
      if (i + batchSize < textNodes.length) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    // 翻译成功后
    if (!translationAborted) {
      showNotification('页面翻译完成', 'success');
      
      // 验证翻译结果
      setTimeout(() => {
        verifyTranslationResults(element);
      }, 1000);
    }
  } catch (error) {
    if (translationAborted) {
      showNotification('翻译已中止', 'error');
    } else {
      console.error('翻译元素失败:', error);
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
              console.log('恢复Shadow DOM节点文本:', originalText);
              break;
            }
          }
        }
        
        // 移除标记属性
        element.removeAttribute('data-lazytranslate-id');
        element.removeAttribute('data-lazytranslate');
      }
    } catch (e) {
      console.warn('无法恢复Shadow DOM文本:', e);
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
    console.log('选中的元素在Shadow DOM中，使用特殊处理逻辑');
    
    // 添加详细的Shadow DOM结构分析
    console.log('🔍 分析Shadow DOM结构...');
    analyzeShadowDOMStructure(element);
    
    // 添加全页面内容映射
    console.log('🗺️ 开始全页面内容映射...');
    mapEntirePageContent();
    
    // ⭐ 新增：专门处理Salesforce Web Components
    console.log('🎯 专门处理Salesforce Web Components...');
    try {
      const webComponentNodes = await processSalesforceWebComponents(element);
      if (webComponentNodes.length > 0) {
        textNodes.push(...webComponentNodes);
        console.log(`✅ 从Web Components获取了 ${webComponentNodes.length} 个文本节点`);
      } else {
        // 如果Web Components处理器没找到内容，尝试直接处理已知的Shadow DOM
        console.log('🔍 Web Components处理器无结果，尝试直接处理已知Shadow DOM...');
        const docContentElements = document.querySelectorAll('doc-content');
        for (const docEl of docContentElements) {
          if (docEl.shadowRoot) {
            console.log('✅ 找到DOC-CONTENT Shadow DOM，直接提取...');
            const docNodes = getTextNodes(docEl.shadowRoot);
            textNodes.push(...docNodes);
            console.log(`📄 从DOC-CONTENT获取了 ${docNodes.length} 个文本节点`);
          }
        }
        
        const breadcrumbElements = document.querySelectorAll('doc-breadcrumbs');
        for (const breadEl of breadcrumbElements) {
          if (breadEl.shadowRoot) {
            console.log('✅ 找到DOC-BREADCRUMBS Shadow DOM，直接提取...');
            const breadNodes = getTextNodes(breadEl.shadowRoot);
            textNodes.push(...breadNodes);
            console.log(`🍞 从DOC-BREADCRUMBS获取了 ${breadNodes.length} 个文本节点`);
          }
        }
      }
    } catch (e) {
      console.log('⚠️ Web Components处理出错:', e);
    }
    
    // 检查是否是包含slot的内容容器
    const hasSlots = element.querySelectorAll('slot').length > 0;
    
    if (hasSlots) {
      console.log('🔍 检测到slot元素，等待动态内容加载...');
      
      // 对于Salesforce页面，我们需要等待更长时间让内容完全加载
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 等待动态内容加载
      try {
        const dynamicNodes = await waitAndProcessDynamicContent(element);
        if (dynamicNodes.length > 0) {
          textNodes.push(...dynamicNodes);
          console.log(`✅ 从动态内容获取了 ${dynamicNodes.length} 个文本节点`);
        } else {
          console.log('⚠️ 动态内容检测未找到主要内容，使用备用方法');
          // 使用智能内容定位
          const bestCandidates = mapEntirePageContent();
          
          // 特别检查DOC-CONTENT元素
          console.log('🔍 特别搜索DOC-CONTENT元素...');
          const docContentElements = document.querySelectorAll('doc-content');
          docContentElements.forEach((docEl, index) => {
            console.log(`📄 DOC-CONTENT ${index + 1}:`, {
              shadowRoot: !!docEl.shadowRoot,
              textLength: docEl.textContent.trim().length,
              preview: docEl.textContent.trim().substring(0, 100)
            });
            
            if (docEl.shadowRoot) {
              const docNodes = getTextNodes(docEl.shadowRoot);
              if (docNodes.length > 0) {
                console.log(`✅ 在DOC-CONTENT的Shadow DOM中找到 ${docNodes.length} 个文本节点`);
                textNodes.push(...docNodes);
              }
            }
          });
          
          if (bestCandidates && bestCandidates.length > 0 && textNodes.length === 0) {
            console.log('🎯 使用智能定位找到的最佳候选内容');
            const bestCandidate = bestCandidates[0];
            const candidateNodes = getTextNodes(bestCandidate.element);
            if (candidateNodes.length > 0) {
              textNodes.push(...candidateNodes);
              console.log(`✅ 从最佳候选获取了 ${candidateNodes.length} 个文本节点`);
            }
          }
          
          // 如果智能定位也失败，使用原来的备用方法
          if (textNodes.length === 0) {
            const fallbackNodes = searchEntirePage();
            textNodes.push(...fallbackNodes);
          }
        }
      } catch (error) {
        console.log('❌ 动态内容等待失败，使用常规方法:', error);
        textNodes.push(...getTextNodesFromShadowElement(element));
      }
    } else {
      // 如果选中的元素在Shadow DOM中，直接处理该元素及其子树
      textNodes.push(...getTextNodesFromShadowElement(element));
    }
  } else {
    // ⭐ 新增：即使不在Shadow DOM中，也要处理页面上的Web Components
    console.log('🎯 在常规DOM中搜索Salesforce Web Components...');
    try {
      const webComponentNodes = await processSalesforceWebComponents(element);
      if (webComponentNodes.length > 0) {
        textNodes.push(...webComponentNodes);
        console.log(`✅ 从常规DOM的Web Components获取了 ${webComponentNodes.length} 个文本节点`);
      }
    } catch (e) {
      console.log('⚠️ 常规DOM中Web Components处理出错:', e);
    }
    
    // 1. 获取常规DOM中的文本节点
    textNodes.push(...getTextNodes(element));
    
    // 2. 获取所有Shadow DOM中的文本节点
    const shadowRoots = getAllShadowRootsRecursive(element);
    shadowRoots.forEach(shadowRoot => {
      try {
        const shadowTextNodes = getTextNodes(shadowRoot);
        textNodes.push(...shadowTextNodes);
        console.log(`在Shadow DOM中发现 ${shadowTextNodes.length} 个文本节点`);
      } catch (e) {
        console.warn('无法访问Shadow DOM:', e);
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

// 全页面内容映射 - 找出所有可能的文档内容
function mapEntirePageContent() {
  console.log('🗺️ === 全页面内容映射开始 ===');
  
  // 1. 分析页面标题和URL
  console.log('📄 页面信息:', {
    title: document.title,
    url: window.location.href,
    domain: window.location.hostname
  });
  
  // 2. 搜索所有可能包含主要内容的容器
  console.log('📦 搜索主要内容容器...');
  const contentSelectors = [
    'main', 'article', '[role="main"]', '.main-content', '#main-content',
    '.content', '#content', '.page-content', '.article-content',
    '.help-content', '.documentation', '.doc-content', 'doc-content',
    '.helpHead1', '.body.refbody', '.shortdesc', '.section',
    '.slds-article', '.articleContent', '.help-article'
  ];
  
  contentSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ 找到容器 "${selector}": ${elements.length} 个`);
      elements.forEach((el, index) => {
        const text = el.textContent.trim();
        if (text.length > 50) {
          console.log(`   容器 ${index + 1}: ${text.substring(0, 100)}...`);
        }
      });
    }
  });
  
  // 3. 分析所有iframe
  console.log('🖼️ 检查iframe...');
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach((iframe, index) => {
    console.log(`   iframe ${index + 1}:`, {
      src: iframe.src,
      id: iframe.id,
      className: iframe.className
    });
  });
  
  // 4. 深度分析所有Shadow DOM
  console.log('👥 深度分析所有Shadow DOM...');
  const allShadowInfo = [];
  
  function collectAllShadowRoots(root, depth = 0) {
    const elements = root.querySelectorAll('*');
    elements.forEach(el => {
      if (el.shadowRoot) {
        const shadowContent = el.shadowRoot.textContent.trim();
        const info = {
          host: `${el.tagName}.${el.className || '(无类名)'}`,
          depth: depth,
          contentLength: shadowContent.length,
          contentPreview: shadowContent.substring(0, 120),
          hasChildren: el.shadowRoot.children.length,
          childTags: Array.from(el.shadowRoot.children).map(child => child.tagName).slice(0, 5)
        };
        allShadowInfo.push(info);
        
        // 递归搜索嵌套Shadow DOM
        collectAllShadowRoots(el.shadowRoot, depth + 1);
      }
    });
  }
  
  collectAllShadowRoots(document.body);
  
  console.log(`📊 发现 ${allShadowInfo.length} 个Shadow DOM:`);
  allShadowInfo.forEach((info, index) => {
    console.log(`   Shadow ${index + 1}:`, info);
  });
  
  // 5. 查找最有希望的文档内容
  console.log('🎯 识别最可能的文档内容...');
  const candidates = [];
  
  // 搜索所有文本长度超过100字符的元素
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    const text = el.textContent.trim();
    if (text.length > 100 && text.length < 10000) { // 排除过长的内容（可能是整页）
      // 排除明显的UI元素
      const isUI = text.includes('Cookie') || 
                   text.includes('DID THIS ARTICLE') ||
                   text.includes('PDF') ||
                   text.includes('Search') ||
                   text.includes('Contact') ||
                   text.includes('Help & Training') ||
                   text.includes('Log In') ||
                   text.includes('Sign Up');
      
      if (!isUI) {
        candidates.push({
          element: el,
          tag: el.tagName,
          class: el.className || '(无)',
          id: el.id || '(无)',
          textLength: text.length,
          preview: text.substring(0, 150),
          isInShadowDOM: !!el.getRootNode().host
        });
      }
    }
  });
  
  // 按文本长度排序
  candidates.sort((a, b) => b.textLength - a.textLength);
  
  console.log(`🏆 发现 ${candidates.length} 个可能的文档内容容器:`);
  candidates.slice(0, 10).forEach((candidate, index) => {
    console.log(`   候选 ${index + 1}:`, {
      tag: candidate.tag,
      class: candidate.class,
      id: candidate.id,
      length: candidate.textLength,
      preview: candidate.preview + '...',
      inShadowDOM: candidate.isInShadowDOM
    });
  });
  
  // 6. 特别检查Lightning Web Components
  console.log('⚡ 检查Lightning Web Components...');
  const lwcElements = document.querySelectorAll('[class*="lwc-"], [class*="slds-"]');
  console.log(`   发现 ${lwcElements.length} 个LWC/SLDS元素`);
  
  lwcElements.forEach((el, index) => {
    if (index < 5) { // 只显示前5个
      const text = el.textContent.trim();
      if (text.length > 20) {
        console.log(`   LWC ${index + 1}: ${el.tagName}.${el.className} - ${text.substring(0, 80)}...`);
      }
    }
  });
  
  console.log('🗺️ === 全页面内容映射完成 ===');
  
  // 返回最有希望的候选者
  return candidates.slice(0, 3);
}

// 分析Shadow DOM结构
function analyzeShadowDOMStructure(element) {
  console.log('📊 Shadow DOM结构分析:');
  console.log(`   元素: ${element.tagName}.${element.className}`);
  console.log(`   内容预览: ${element.textContent.trim().substring(0, 100)}...`);
  
  // 分析子元素
  const children = Array.from(element.children);
  console.log(`   直接子元素数量: ${children.length}`);
  
  children.forEach((child, index) => {
    if (index < 10) { // 只显示前10个子元素
      console.log(`   子元素 ${index + 1}: ${child.tagName}.${child.className || '(无类名)'}`);
      
      // 检查是否有Shadow DOM
      if (child.shadowRoot) {
        console.log(`     └─ 包含Shadow DOM，内容: ${child.shadowRoot.textContent.trim().substring(0, 50)}...`);
      }
      
      // 检查文本内容
      const textContent = child.textContent.trim();
      if (textContent.length > 20) {
        console.log(`     └─ 文本内容: ${textContent.substring(0, 60)}...`);
      }
    }
  });
  
  // 分析slot元素
  const slots = element.querySelectorAll('slot');
  if (slots.length > 0) {
    console.log(`   发现 ${slots.length} 个slot元素:`);
    slots.forEach((slot, index) => {
      console.log(`   Slot ${index + 1}: name="${slot.name || '(无名称)'}"`);
      if (slot.assignedNodes) {
        const assignedNodes = slot.assignedNodes();
        console.log(`     分配的节点数量: ${assignedNodes.length}`);
      }
    });
  }
  
  // 查找所有包含文本的嵌套Shadow DOM
  console.log('🔍 查找嵌套Shadow DOM...');
  const allElements = element.querySelectorAll('*');
  let shadowDOMCount = 0;
  
  allElements.forEach(el => {
    if (el.shadowRoot) {
      shadowDOMCount++;
      const shadowContent = el.shadowRoot.textContent.trim();
      if (shadowContent.length > 10) {
        console.log(`   嵌套Shadow DOM ${shadowDOMCount}: ${el.tagName}.${el.className || '(无类名)'}`);
        console.log(`     内容: ${shadowContent.substring(0, 80)}...`);
      }
    }
  });
  
  console.log(`📊 分析完成，发现 ${shadowDOMCount} 个嵌套Shadow DOM`);
}

// 搜索整个页面的备用方法
function searchEntirePage() {
  console.log('🔍 搜索整个页面的主要内容...');
  const foundNodes = [];
  const processedTexts = new Set();
  
  // 首先尝试深度搜索所有Shadow DOM
  console.log('🔍 深度搜索所有Shadow DOM...');
  
  function deepSearchAllShadowDOM() {
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      if (el.shadowRoot) {
        console.log(`🔍 发现Shadow DOM: ${el.tagName}.${el.className}`);
        
        const walker = document.createTreeWalker(
          el.shadowRoot,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: function(node) {
              const text = node.textContent.trim();
              
              // 检查是否是文档内容
              const isDocContent = text.length > 20 &&
                                 // 包含技术文档关键词
                                 (text.includes('Salesforce') ||
                                  text.includes('Service Cloud') ||
                                  text.includes('Lightning') ||
                                  text.includes('platform') ||
                                  text.includes('user') ||
                                  text.includes('field') ||
                                  text.includes('object') ||
                                  text.includes('record') ||
                                  text.includes('workflow') ||
                                  text.includes('setup') ||
                                  text.includes('configuration') ||
                                  text.includes('organization') ||
                                  // 或者是比较长的描述性文本
                                  text.length > 100);
              
              // 排除明显的UI元素
              const isExcluded = text.includes('Cookie') ||
                               text.includes('DID THIS ARTICLE') ||
                               text.includes('Let us know') ||
                               text.includes('Share your feedback') ||
                               text.includes('PDF') ||
                               text.includes('Search') ||
                               text.includes('Contact') ||
                               text.includes('Help') ||
                               text.includes('Support') ||
                               text.match(/^[\d\s]+$/); // 纯数字和空格
              
              if (isDocContent && !isExcluded && !processedTexts.has(text)) {
                return NodeFilter.FILTER_ACCEPT;
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
            console.log(`📖 在Shadow DOM中找到文档内容: ${text.substring(0, 80)}...`);
          }
        }
      }
    });
  }
  
  // 搜索所有Shadow DOM
  deepSearchAllShadowDOM();
  
  // 特别搜索Salesforce文档内容
  console.log('🔍 特别搜索Salesforce文档组件...');
  const salesforceDocSelectors = [
    'doc-content',
    'doc-xml-content', 
    'doc-content-layout',
    '[class*="doc-"]'
  ];
  
  salesforceDocSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, index) => {
      console.log(`📄 找到Salesforce文档元素 ${selector} ${index + 1}:`, {
        shadowRoot: !!el.shadowRoot,
        textLength: el.textContent.trim().length
      });
      
      if (el.shadowRoot) {
        const walker = document.createTreeWalker(
          el.shadowRoot,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: function(node) {
              const text = node.textContent.trim();
              
              // 检查是否是Salesforce文档内容
              const isSalesforceDoc = text.length > 30 &&
                                    // 排除调查问卷
                                    !text.includes('DID THIS ARTICLE SOLVE') &&
                                    !text.includes('Let us know') &&
                                    !text.includes('Share your feedback') &&
                                    // 排除导航
                                    !text.includes('PDF') &&
                                    !text.includes('Search') &&
                                    // 包含文档相关内容
                                    (text.includes('Data Loader') ||
                                     text.includes('Salesforce') ||
                                     text.includes('field') ||
                                     text.includes('object') ||
                                     text.includes('record') ||
                                     text.length > 100);
              
              if (isSalesforceDoc && !processedTexts.has(text)) {
                return NodeFilter.FILTER_ACCEPT;
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
            console.log(`📖 在Salesforce文档中找到内容: ${text.substring(0, 80)}...`);
          }
        }
      }
    });
  });
  
  // 如果Shadow DOM中没找到足够内容，搜索普通DOM
  if (foundNodes.length < 3) {
    console.log('🔍 在普通DOM中搜索...');
    
    const salesforceSelectors = [
      'h1.helpHead1',
      '.body.refbody',
      '.shortdesc',
      '.section',
      'doc-content',
      '.help-content',
      '.documentation',
      '.article-content',
      'article',
      'main',
      '[role="main"]',
      'p',
      'li',
      'td',
      'th'
    ];
    
    salesforceSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const textNodes = getTextNodes(element);
        textNodes.forEach(node => {
          const text = node.textContent.trim();
          
          if (!processedTexts.has(text)) {
            // 检查是否是主要内容
            const isMainContent = text.length > 20 && 
                                !text.includes('DID THIS ARTICLE SOLVE') &&
                                !text.includes('Let us know so we can') &&
                                !text.includes('Share your feedback') &&
                                !text.includes('Cookie') &&
                                !text.includes('PDF') &&
                                !text.includes('Search') &&
                                !text.match(/^\d+$/); // 排除纯数字
            
            if (isMainContent) {
              processedTexts.add(text);
              foundNodes.push(node);
              console.log(`📖 在普通DOM中找到内容: ${text.substring(0, 80)}...`);
            }
          }
        });
      });
    });
  }
  
  console.log(`✅ 在整个页面中找到 ${foundNodes.length} 个主要内容节点`);
  return foundNodes;
}

// 等待并处理动态内容的函数
function waitAndProcessDynamicContent(element, maxWaitTime = 5000) {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20; // 减少尝试次数，避免无限等待
    
    const checkForContent = () => {
      attempts++;
      
      console.log(`🔍 尝试 ${attempts}: 深度搜索Shadow DOM内容...`);
      
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
            console.log(`🔍 在深度 ${depth} 发现Shadow DOM:`, el.tagName, el.className);
            
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
                      console.log(`✅ 在Shadow DOM深度 ${depth} 找到内容: ${text.substring(0, 100)}...`);
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
        console.log(`🔍 检查slot ${index + 1}...`);
        if (slot.assignedNodes) {
          const assignedNodes = slot.assignedNodes();
          console.log(`📦 Slot ${index + 1} 包含 ${assignedNodes.length} 个分配节点`);
          
          assignedNodes.forEach((node, nodeIndex) => {
            console.log(`🔍 检查分配节点 ${nodeIndex + 1}: ${node.nodeName}${node.className ? '.' + node.className : ''}`);
            
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 特别检查Salesforce文档元素
              if (node.tagName && (
                node.tagName.toLowerCase().includes('doc-') ||
                node.className.includes('doc-') ||
                node.tagName === 'DOC-BREADCRUMBS' ||
                node.tagName === 'DOC-CONTENT'
              )) {
                console.log(`🎯 发现Salesforce文档元素: ${node.tagName}`);
                
                // 获取Shadow DOM内容
                if (node.shadowRoot) {
                  console.log(`🔍 检查${node.tagName}的Shadow DOM...`);
                  try {
                    // 直接使用getTextNodes处理shadowRoot
                    const directNodes = getTextNodes(node.shadowRoot);
                    directNodes.forEach(textNode => {
                      const text = textNode.textContent.trim();
                      if (text.length > 5 && !processedTexts.has(text)) {
                        console.log(`✅ 从${node.tagName} Shadow DOM获取: ${text.substring(0, 100)}...`);
                        processedTexts.add(text);
                        foundNodes.push(textNode);
                      }
                    });
                  } catch (e) {
                    console.log(`❌ ${node.tagName} Shadow DOM处理出错:`, e);
                  }
                }
                
                // 获取普通DOM内容
                const textNodes = getTextNodes(node);
                textNodes.forEach(textNode => {
                  const text = textNode.textContent.trim();
                  if (text.length > 5 && !processedTexts.has(text)) {
                    console.log(`✅ 在${node.tagName}中找到内容: ${text.substring(0, 100)}...`);
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
                      console.log(`✅ 在slot中找到内容: ${text.substring(0, 100)}...`);
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
      
      console.log(`🔍 尝试 ${attempts}: 找到 ${foundNodes.length} 个主要内容文本节点`);
      
      // 如果找到了内容或者尝试足够多次就结束
      if (foundNodes.length > 0 || attempts >= maxAttempts) {
        console.log(`✅ 内容搜索完成，找到 ${foundNodes.length} 个主要内容文本节点`);
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
  
  console.log('开始从Shadow DOM元素获取文本节点:', element.tagName, element.className);
  
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
          console.log('跳过脚本/样式节点:', textContent.substring(0, 30));
          return NodeFilter.FILTER_REJECT;
        }
        
        try {
          if (isInsideCodeBlock(node)) {
            console.log('跳过代码块节点:', textContent.substring(0, 30));
            return NodeFilter.FILTER_REJECT;
          }
        } catch (e) {
          console.warn('代码块检查出错:', e);
        }
        
        console.log('✓ 接受文本节点:', textContent.substring(0, 50) + (textContent.length > 50 ? '...' : ''));
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
  
  console.log(`遍历完成，处理了 ${nodeCount} 个文本节点，其中 ${textNodes.length} 个有效`);
  
  // 递归处理选中元素内可能存在的嵌套Shadow DOM
  const nestedShadowRoots = getAllShadowRootsRecursive(element);
  nestedShadowRoots.forEach(shadowRoot => {
    try {
      const shadowTextNodes = getTextNodes(shadowRoot);
      textNodes.push(...shadowTextNodes);
      console.log(`在嵌套Shadow DOM中发现 ${shadowTextNodes.length} 个文本节点`);
    } catch (e) {
      console.warn('无法访问嵌套Shadow DOM:', e);
    }
  });
  
  console.log(`从Shadow DOM元素中总共找到 ${textNodes.length} 个文本节点`);
  return textNodes;
}

// 拦截Shadow DOM创建
function interceptShadowDOMCreation() {
  const originalAttachShadow = Element.prototype.attachShadow;
  
  Element.prototype.attachShadow = function(options) {
    const shadowRoot = originalAttachShadow.call(this, options);
    
    console.log('拦截到Shadow DOM创建:', this, shadowRoot);
    
    // 延迟处理，确保Shadow DOM内容已加载
    setTimeout(() => {
      if (shadowRoot && shadowRoot.innerHTML) {
        console.log('新Shadow DOM内容已加载');
      }
    }, 100);
    
    return shadowRoot;
  };
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 翻译单个文本节点（重构）
async function translateTextNode(node, settings) {
  const originalText = node.textContent; // 保存包含空格的完整原始内容
  const trimmedText = originalText.trim();
  
  console.log(`🔄 开始翻译文本节点: "${trimmedText.substring(0, 50)}..."`);
  
  // 检查翻译是否被中止
  if (translationAborted) {
    console.log(`❌ 翻译已中止`);
    throw new Error('翻译已中止');
  }
  
  if (!trimmedText || trimmedText.length < 2) {
    console.log(`⏭️ 跳过短文本: "${trimmedText}"`);
    return;
  }

  // 如果节点是script标签，则跳过
  if (node.parentElement && node.parentElement.tagName === 'SCRIPT') {
    console.log(`⏭️ 跳过脚本节点`);
    return;
  }

  // 如果是代码节点（<code>或者<pre>），则跳过
  if (isInsideCodeBlock(node)) {
    console.log(`⏭️ 跳过代码块节点`);
    return;
  }
  
  console.log(`📝 保存原始文本并开始翻译流程`);
  
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
    
    console.log(`🌐 调用翻译API，文本: "${textToTranslate.substring(0, 50)}..."`);
    
    // 如果替换后与原文相同，可能无需翻译（取决于需求，此处总是翻译以确保流程一致）
    const translatedText = await translateText(textToTranslate, settings);
    
    console.log(`✅ 翻译完成: "${translatedText?.substring(0, 50)}..."`);
    
    // 翻译完成后再次检查是否被中止
    if (translationAborted) {
      throw new Error('翻译已中止');
    }
    
    if (translatedText && translatedText !== originalText) {
      console.log(`🔄 更新DOM内容`);
      // 4. 更新DOM
      const parentElement = node.parentElement;
      if (parentElement) {
        parentElement.setAttribute('data-lazytranslate', 'translated');
      }
      
      // 记录更新前后的内容
      console.log(`📝 DOM更新前: "${node.textContent}"`);
      node.textContent = translatedText;
      console.log(`📝 DOM更新后: "${node.textContent}"`);
      
      // 验证父元素信息
      console.log(`📍 父元素:`, parentElement?.tagName, parentElement?.className);
      
      // 5. 立即为当前节点应用字体设置
      if (settings.targetLangFont && parentElement) {
        applyFontToElement(parentElement, settings.targetLangFont);
        console.log(`🎨 应用字体: ${settings.targetLangFont}`);
      }
      
      // 6. 监控DOM内容是否被其他脚本覆盖
      const monitorTextNode = node;
      const expectedText = translatedText;
      
      // 检查是否是LWC组件
      const isInLWC = parentElement && (
        parentElement.className.includes('lwc-') || 
        parentElement.closest('[class*="lwc-"]') ||
        parentElement.tagName.includes('DX-') ||
        parentElement.closest('[class*="slds-"]')
      );
      
      if (isInLWC) {
        console.log('🔧 检测到LWC组件，使用特殊处理');
        
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
            console.log(`✅ LWC策略 ${index + 1} 执行成功`);
          } catch (error) {
            console.log(`❌ LWC策略 ${index + 1} 失败:`, error);
          }
        });
      }
      
      // 短期检查 (100ms)
      setTimeout(() => {
        const currentText = monitorTextNode.textContent;
        if (currentText !== expectedText) {
          console.warn('⚠️ 翻译内容在100ms后被覆盖！', {
            expected: expectedText,
            actual: currentText,
            element: parentElement,
            isLWC: isInLWC
          });
          
          // 尝试重新设置
          monitorTextNode.textContent = expectedText;
          console.log('🔄 重新设置翻译内容');
          
          // 如果是LWC，尝试额外的恢复策略
          if (isInLWC) {
            setTimeout(() => {
              monitorTextNode.textContent = expectedText;
              console.log('🔄 LWC组件二次重新设置');
            }, 50);
          }
        }
      }, 100);
      
      // 中期检查 (500ms)
      setTimeout(() => {
        const currentText = monitorTextNode.textContent;
        if (currentText !== expectedText) {
          console.warn('⚠️ 翻译内容在500ms后被覆盖！', {
            expected: expectedText,
            actual: currentText,
            element: parentElement,
            isLWC: isInLWC
          });
        } else {
          console.log('✅ 500ms检查：翻译内容保持稳定');
        }
      }, 500);
      
      // 长期检查 (1秒)
      setTimeout(() => {
        const currentText = monitorTextNode.textContent;
        if (currentText !== expectedText) {
          console.warn('⚠️ 翻译内容在1秒后仍被覆盖！', {
            expected: expectedText,
            actual: currentText,
            element: parentElement,
            isLWC: isInLWC
          });
          
          // 检查是否有MutationObserver或其他监听器
          console.log('🔍 检查元素状态:', {
            nodeType: monitorTextNode.nodeType,
            parentNode: monitorTextNode.parentNode,
            isConnected: monitorTextNode.isConnected,
            parentVisible: parentElement.offsetParent !== null,
            parentDisplay: getComputedStyle(parentElement).display,
            parentVisibility: getComputedStyle(parentElement).visibility
          });
        } else {
          console.log('✅ 1秒检查：翻译内容持久保持');
        }
      }, 1000);
      
      console.log(`✅ 节点翻译完成`);
    } else {
      console.log(`⚠️ 翻译结果与原文相同或为空，原文: "${originalText}", 译文: "${translatedText}"`);
    }
  } catch (error) {
    if (translationAborted || error.message === '翻译已中止') {
      throw new Error('翻译已中止');
    }
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
  }, 1000);
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
      console.warn('无法移除Shadow DOM字体样式:', e);
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
        console.warn('检查className时出错:', e);
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

// 专门处理Salesforce Web Components（灰色标签）
async function processSalesforceWebComponents(rootElement) {
  console.log('🎯 === 专门处理Salesforce Web Components ===');
  
  const foundNodes = [];
  const processedTexts = new Set();
  
  // 定义所有可能的Salesforce Web Components
  const salesforceComponents = [
    'doc-content',
    'doc-breadcrumbs', 
    'doc-xml-content',
    'doc-content-layout',
    'help-article',
    'help-content',
    'lightning-formatted-text',
    'lightning-output-field',
    'lightning-record-view-form'
  ];
  
  // 搜索所有Salesforce组件
  for (const componentName of salesforceComponents) {
    const components = rootElement.querySelectorAll(componentName);
    
    if (components.length > 0) {
      console.log(`🔍 发现 ${components.length} 个 ${componentName} 组件`);
      
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        console.log(`📦 处理 ${componentName} 组件 ${i + 1}/${components.length}`);
        
        // 策略1: 等待组件完全渲染
        await waitForComponentToLoad(component, componentName);
        
        // 策略2: 检查Shadow DOM
        if (component.shadowRoot) {
          console.log(`✅ ${componentName} 有Shadow DOM，提取内容...`);
          const shadowNodes = getTextNodes(component.shadowRoot);
          
          shadowNodes.forEach(node => {
            const text = node.textContent.trim();
            if (text.length > 5 && !processedTexts.has(text)) {
              // 排除不需要翻译的内容
              const shouldTranslate = !text.includes('DID THIS ARTICLE') &&
                                    !text.includes('Let us know') &&
                                    !text.includes('Share your feedback') &&
                                    !text.includes('Cookie') &&
                                    !text.match(/^[\d\s]+$/);
              
              if (shouldTranslate) {
                console.log(`📝 从${componentName} Shadow DOM提取: ${text.substring(0, 80)}...`);
                processedTexts.add(text);
                foundNodes.push(node);
              }
            }
          });
        }
        
        // 策略3: 检查直接DOM内容（可能组件还在加载）
        const directNodes = getTextNodes(component);
        directNodes.forEach(node => {
          const text = node.textContent.trim();
          if (text.length > 5 && !processedTexts.has(text)) {
            const shouldTranslate = !text.includes('DID THIS ARTICLE') &&
                                  !text.includes('Let us know') &&
                                  !text.includes('Cookie');
            
            if (shouldTranslate) {
              console.log(`📝 从${componentName}直接DOM提取: ${text.substring(0, 80)}...`);
              processedTexts.add(text);
              foundNodes.push(node);
            }
          }
        });
        
        // 策略4: 强制触发组件更新
        try {
          // 触发resize事件，可能促使组件重新渲染
          window.dispatchEvent(new Event('resize'));
          
          // 如果组件有特定的更新方法，尝试调用
          if (typeof component.forceUpdate === 'function') {
            component.forceUpdate();
          }
          
          // 触发自定义事件
          component.dispatchEvent(new CustomEvent('force-render'));
        } catch (e) {
          console.log(`⚠️ 无法强制更新${componentName}:`, e);
        }
      }
    }
  }
  
  console.log(`🎯 Web Components处理完成，提取了 ${foundNodes.length} 个文本节点`);
  return foundNodes;
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
        console.log(`${isLoaded ? '✅' : '⏳'} ${componentName} 加载状态: ${isLoaded ? '完成' : '超时'} (尝试 ${attempts}/${maxAttempts})`);
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