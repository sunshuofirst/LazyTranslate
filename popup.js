// 默认设置
const DEFAULT_SETTINGS = {
  sourceLang: 'auto',
  targetLang: 'zh',
  targetLangFont: '', // 添加目标语言字体设置
  apiProvider: 'google',
  apiKeyBaidu: '',
  apiKeyTencent: '', // 新增腾讯翻译API Key
  customWords: {},
  googleApiProxy: '' // 新增谷歌API代理
};

// 语言映射
const LANGUAGE_MAP = {
  'auto': '自动识别',
  'en': '英语',
  'zh': '中文',
  'ja': '日语',
  'ko': '韩语',
  'fr': '法语',
  'de': '德语',
  'es': '西班牙语',
  'ru': '俄语',
  'pt': '葡萄牙语',
  'it': '意大利语'
};

// 字体配置 - 按语言分类
const FONT_CONFIG = {
  'zh': [
    { value: '', label: 'defaultFont', isI18nKey: true },
    { value: 'Microsoft YaHei', label: '微软雅黑', dataLang: 'zh' },
    { value: 'SimSun', label: '宋体', dataLang: 'zh' },
    { value: 'SimHei', label: '黑体', dataLang: 'zh' },
    { value: 'PingFang SC', label: '苹方', dataLang: 'zh' },
    { value: 'Hiragino Sans GB', label: '冬青黑体', dataLang: 'zh' },
    { value: 'Noto Sans CJK SC', label: '思源黑体', dataLang: 'zh' },
    { value: 'Arial Unicode MS', label: 'Arial Unicode MS', dataLang: 'zh' }
  ],
  'en': [
    { value: '', label: 'defaultFont', isI18nKey: true },
    { value: 'Arial', label: 'Arial', dataLang: 'en' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'en' },
    { value: 'Helvetica', label: 'Helvetica', dataLang: 'en' },
    { value: 'Georgia', label: 'Georgia', dataLang: 'en' },
    { value: 'Verdana', label: 'Verdana', dataLang: 'en' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'en' }
  ],
  'ja': [
    { value: '', label: 'defaultFont', isI18nKey: true },
    { value: 'Hiragino Kaku Gothic ProN', label: 'ヒラギノ角ゴ ProN', dataLang: 'ja' },
    { value: 'Hiragino Mincho ProN', label: 'ヒラギノ明朝 ProN', dataLang: 'ja' },
    { value: 'Yu Gothic', label: '游ゴシック', dataLang: 'ja' },
    { value: 'Yu Mincho', label: '游明朝', dataLang: 'ja' },
    { value: 'Noto Sans CJK JP', label: 'Noto Sans CJK JP', dataLang: 'ja' }
  ],
  'ko': [
    { value: '', label: 'defaultFont', isI18nKey: true },
    { value: 'Malgun Gothic', label: '맑은 고딕', dataLang: 'ko' },
    { value: 'Nanum Gothic', label: '나눔고딕', dataLang: 'ko' },
    { value: 'Nanum Myeongjo', label: '나눔명조', dataLang: 'ko' },
    { value: 'Noto Sans CJK KR', label: 'Noto Sans CJK KR', dataLang: 'ko' }
  ],
  'fr': [
    { value: '', label: 'defaultFont', isI18nKey: true },
    { value: 'Arial', label: 'Arial', dataLang: 'fr' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'fr' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'fr' },
    { value: 'Cambria', label: 'Cambria', dataLang: 'fr' }
  ],
  'de': [
    { value: '', label: 'defaultFont', isI18nKey: true },
    { value: 'Arial', label: 'Arial', dataLang: 'de' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'de' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'de' },
    { value: 'Cambria', label: 'Cambria', dataLang: 'de' }
  ],
  'es': [
    { value: '', label: 'defaultFont', isI18nKey: true },
    { value: 'Arial', label: 'Arial', dataLang: 'es' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'es' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'es' },
    { value: 'Cambria', label: 'Cambria', dataLang: 'es' }
  ],
  'ru': [
    { value: '', label: 'defaultFont', isI18nKey: true },
    { value: 'Arial', label: 'Arial', dataLang: 'ru' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'ru' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'ru' },
    { value: 'Cambria', label: 'Cambria', dataLang: 'ru' }
  ],
  'pt': [
    { value: '', label: 'defaultFont', isI18nKey: true },
    { value: 'Arial', label: 'Arial', dataLang: 'pt' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'pt' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'pt' },
    { value: 'Cambria', label: 'Cambria', dataLang: 'pt' }
  ],
  'it': [
    { value: '', label: 'defaultFont', isI18nKey: true },
    { value: 'Arial', label: 'Arial', dataLang: 'it' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'it' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'it' },
    { value: 'Cambria', label: 'Cambria', dataLang: 'it' }
  ]
};

// 在文件顶部添加分页配置
const WORDS_PER_PAGE = 5; // 每页显示词汇数量
let currentPage = 1;

// 初始化页面
document.addEventListener('DOMContentLoaded', async () => {
  // 1. 初始化国际化
  await I18n.init();
  
  // 2. 翻译页面
  I18n.translatePage();
  
  // 3. 加载设置
  const settings = await loadSettings();
  
  // 4. 根据加载的设置更新字体选项
  updateFontOptions(settings.targetLang, settings.targetLangFont);
  
  // 5. 加载自定义词库并设置事件监听器
  await loadCustomWords();
  setupEventListeners();
  
  // 6. 为首次使用的用户检测浏览器语言
  const result = await chrome.storage.local.get(['settings']);
  if (!result.settings) {
    detectBrowserLanguage();
  }
  
  // 7. 监听语言变化消息
  setupLanguageChangeListener();
});

// 设置语言变化监听器
function setupLanguageChangeListener() {
  // 监听来自 background script 的语言变化消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'LANGUAGE_CHANGED') {
      // 重新初始化国际化并翻译页面
      I18n.setLanguage(message.language).then(() => {
        I18n.translatePage();
        // 重新更新字体选项
        const targetLang = document.getElementById('targetLang').value;
        const targetLangFont = document.getElementById('targetLangFont').value;
        updateFontOptions(targetLang, targetLangFont);
      });
    }
  });
}

// 加载设置
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || DEFAULT_SETTINGS;
    
    document.getElementById('sourceLang').value = settings.sourceLang;
    document.getElementById('targetLang').value = settings.targetLang;
    // 注意：字体的值将由 updateFontOptions 函数设置
    document.getElementById('apiProvider').value = settings.apiProvider;
    document.getElementById('apiKeyBaidu').value = settings.apiKeyBaidu || '';
    document.getElementById('googleApiProxy').value = settings.googleApiProxy || '';
    document.getElementById('apiKeyTencent').value = settings.apiKeyTencent || '';
    
    toggleApiKeyBaiduSection(settings.apiProvider);
    toggleApiKeyTencentSection(settings.apiProvider);
    toggleGoogleApiProxySection(settings.apiProvider);
    
    // 返回 settings 对象，供其他函数使用
    return settings;
  } catch (error) {
    console.error('加载设置失败:', error);
    // 返回默认设置以防出错
    return { ...DEFAULT_SETTINGS };
  }
}

// 保存设置
async function saveSettings() {
  try {
    // 首先获取现有设置，以避免覆盖其他可能存在的键
    const result = await chrome.storage.local.get(['settings']);
    const existingSettings = result.settings || {};

    const newSettings = {
      ...existingSettings,
      sourceLang: document.getElementById('sourceLang').value,
      targetLang: document.getElementById('targetLang').value,
      targetLangFont: document.getElementById('targetLangFont').value,
      apiProvider: document.getElementById('apiProvider').value,
      apiKeyBaidu: document.getElementById('apiKeyBaidu').value,
      apiKeyTencent: document.getElementById('apiKeyTencent').value,
      googleApiProxy: document.getElementById('googleApiProxy').value
    };
    
    await chrome.storage.local.set({ settings: newSettings });
    // console.log('设置已保存:', newSettings);
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

// 根据所选语言更新字体选项
// 此函数不再从存储中读取数据，而是接收参数
function updateFontOptions(targetLang, fontToSet) {
  const targetLangFontEl = document.getElementById('targetLangFont');
  
  // 清空现有选项
  targetLangFontEl.innerHTML = '';
  
  // 获取该语言的字体列表
  const fonts = FONT_CONFIG[targetLang] || FONT_CONFIG['en'];
  
  // 添加字体选项
  fonts.forEach(font => {
    const option = document.createElement('option');
    option.value = font.value;
    
    // 支持国际化文本
    if (font.isI18nKey && typeof I18n !== 'undefined') {
      option.textContent = I18n.t(font.label);
    } else {
      option.textContent = font.label;
    }
    
    if (font.dataLang) {
      option.setAttribute('data-lang', font.dataLang);
    }
    targetLangFontEl.appendChild(option);
  });
  
  // 尝试恢复之前选中的字体
  if (fontToSet && fonts.some(font => font.value === fontToSet)) {
    targetLangFontEl.value = fontToSet;
  } else {
    targetLangFontEl.value = ''; // 否则使用默认字体
  }
}

// 加载自定义词库
async function loadCustomWords() {
  try {
    const result = await chrome.storage.local.get(['customWords']);
    const customWords = result.customWords || {};
    displayCustomWords(customWords);
  } catch (error) {
    console.error('加载自定义词库失败:', error);
  }
}

// 显示自定义词库
function displayCustomWords(customWords) {
  const wordList = document.getElementById('wordList');
  const words = Object.keys(customWords);
  
  if (words.length === 0) {
    wordList.innerHTML = `
      <div class="empty-state">
        <p>暂无自定义词汇</p>
      </div>
    `;
    return;
  }
  
  // 计算分页
  const totalPages = Math.ceil(words.length / WORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * WORDS_PER_PAGE;
  const endIndex = startIndex + WORDS_PER_PAGE;
  const currentWords = words.slice(startIndex, endIndex);
  
  // 显示当前页词汇
  const wordsHtml = currentWords.map(word => `
    <div class="add-word-form" data-word="${word}">
        <input type="text" class="edit-original" value="${word}" />
        <input type="text" class="edit-translated" value="${customWords[word]}" />
        <button class="delete-word" data-word="${word}">${I18n.t('deleteWord')}</button>
    </div>
  `).join('');
  
  // 生成分页控件 - 使用class而不是onclick
  const paginationHtml = totalPages > 1 ? `
    <div class="pagination">
      <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>${I18n.t('previousPage')}</button>
      <span>${I18n.t('pageInfo', currentPage, totalPages, words.length)}</span>
      <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>${I18n.t('nextPage')}</button>
    </div>
  ` : `<div class="word-count">${I18n.t('totalWords', words.length)}</div>`;
  
  wordList.innerHTML = wordsHtml + paginationHtml;
}

// 添加页面切换函数
function changePage(page) {
  currentPage = page;
  loadCustomWords();
}

// 自动保存编辑后的词汇
async function autoSaveEditedWord(oldWord, wordItem) {
  try {
    const originalInput = wordItem.querySelector('.edit-original');
    const translatedInput = wordItem.querySelector('.edit-translated');
    
    const newOriginal = originalInput.value.trim();
    const newTranslated = translatedInput.value.trim();
    
    // 验证输入
    if (!newOriginal || !newTranslated) {
      return;
    }
    
    const result = await chrome.storage.local.get(['customWords']);
    const customWords = result.customWords || {};
    
    // 如果原词发生了变化，需要删除旧词条
    if (newOriginal !== oldWord) {
      // 检查新词汇是否已存在
      if (customWords[newOriginal] && newOriginal !== oldWord) {
        return;
      }
      delete customWords[oldWord];
    }
    
    // 添加/更新词条
    customWords[newOriginal] = newTranslated;
    
    await chrome.storage.local.set({ customWords });
    
  } catch (error) {
    console.error('自动保存词汇失败:', error);
  }
}

// 添加自定义词汇
async function addCustomWord(original, translated) {
  try {
    const result = await chrome.storage.local.get(['customWords']);
    const customWords = result.customWords || {};
    
    // 检查是否已存在该词汇
    if (customWords[original.trim()]) {
      alert(I18n.t('wordAlreadyExists'));
      return;
    }
    
    customWords[original.trim()] = translated.trim();
    
    await chrome.storage.local.set({ customWords });
    
    // 计算新词汇应该在哪一页（按字母顺序排序后）
    const allWords = Object.keys(customWords).sort();
    const newWordIndex = allWords.indexOf(original.trim());
    const newPage = Math.ceil((newWordIndex + 1) / WORDS_PER_PAGE);
    
    // 跳转到包含新词汇的页面
    currentPage = newPage;
    
    await loadCustomWords();
    
    // 清空输入框
    document.getElementById('originalWord').value = '';
    document.getElementById('translatedWord').value = '';
    
    // console.log('词汇已添加');
  } catch (error) {
    console.error('添加词汇失败:', error);
  }
}

// 删除词汇后调整当前页
async function deleteCustomWord(word) {
  try {
    const result = await chrome.storage.local.get(['customWords']);
    const customWords = result.customWords || {};
    
    delete customWords[word];
    
    await chrome.storage.local.set({ customWords });
    
    // 检查删除后当前页是否还有内容
    const remainingWords = Object.keys(customWords);
    const totalPages = Math.ceil(remainingWords.length / WORDS_PER_PAGE);
    
    // 如果当前页超出了总页数，跳转到最后一页
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = totalPages;
    } else if (remainingWords.length === 0) {
      currentPage = 1;
    }
    
    await loadCustomWords();
    
    // console.log('词汇已删除');
  } catch (error) {
    console.error('删除词汇失败:', error);
  }
}

// 清空自定义词库
async function clearCustomWords() {
  try {
    if (confirm(I18n.t('confirmClearDictionary'))) { 
      // 清空词库
      await chrome.storage.local.set({ customWords: {} });
      await loadCustomWords();
      // console.log('词库已清空');
    }
  } catch (error) {
    console.error('清空词库失败:', error);
  }
}

// 切换API密钥输入框显示
function toggleApiKeyBaiduSection(apiProvider) {
  const apiKeyBaiduSection = document.getElementById('apiKeyBaiduSection');
  const needsApiKeyBaidu = apiProvider === 'baidu';
  
  if (needsApiKeyBaidu) {
    apiKeyBaiduSection.style.display = 'block';
  } else {
    apiKeyBaiduSection.style.display = 'none';
  }
}
async function toggleApiKeyTencentSection(apiProvider) {
  const apiKeyTencentSection = document.getElementById('apiKeyTencentSection');
  const needsApiKeyTencent = apiProvider === 'tencent';

  if (needsApiKeyTencent) {
    apiKeyTencentSection.style.display = 'block';
  } else {
    apiKeyTencentSection.style.display = 'none';
  }
}

// 新增：切换谷歌API代理输入框显示
function toggleGoogleApiProxySection(apiProvider) {
  const googleApiProxySection = document.getElementById('googleApiProxySection');
  if (!googleApiProxySection) return;
  if (apiProvider === 'google') {
    googleApiProxySection.style.display = 'block';
  } else {
    googleApiProxySection.style.display = 'none';
  }
}

// 检测浏览器语言
async function detectBrowserLanguage() {
  const browserLang = navigator.language.split('-')[0];
  const targetLangSelect = document.getElementById('targetLang');
  
  // 如果目标语言还没有设置过，使用浏览器语言
  if (targetLangSelect.value === 'zh') {
    const supportedLangs = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt', 'it'];
    if (supportedLangs.includes(browserLang)) {
      targetLangSelect.value = browserLang;
      await updateFontOptions(browserLang, ''); // 更新字体选项
      saveSettings();
    }
  }
}

// 翻译当前页面
async function translateCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      window.close();
      await chrome.tabs.sendMessage(tab.id, {
        action: 'translateCurrentPage'
      });
    }
  } catch (error) {
    console.error('翻译页面失败:', error);
  }
}
// 翻译选中内容
async function translateSelectedText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      window.close();
      await chrome.tabs.sendMessage(tab.id, {
        action: 'translateSelection'
      });
    }
  } catch (error) {
    console.error('翻译选中内容失败:', error);
  }
}
// 显示网页原文
async function showOriginalText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      window.close();
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showOriginal'
      });
    }
  } catch (error) {
    console.error('显示网页原文失败:', error);
  }
}

// 设置事件监听器
function setupEventListeners() {
  // 翻译当前页面
  const translateButton = document.getElementById('translateButton');
  if (translateButton) {
    translateButton.addEventListener('click', translateCurrentPage);
  }
  // 翻译选中内容
  const translateSelectionButton = document.getElementById('translateSelectionButton');
  if (translateSelectionButton) {
    translateSelectionButton.addEventListener('click', translateSelectedText);
  }
  // 显示网页原文
  const showOriginalTextButton = document.getElementById('showOriginalTextButton');
  if (showOriginalTextButton) {
    showOriginalTextButton.addEventListener('click', showOriginalText);
  }

  // 打开选项页面
  const openOptionsButton = document.getElementById('openOptions');
  if (openOptionsButton) {
    openOptionsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // 监听设置变化并保存
  const sourceLang = document.getElementById('sourceLang');
  const targetLang = document.getElementById('targetLang');
  const targetLangFont = document.getElementById('targetLangFont');
  const apiProvider = document.getElementById('apiProvider');
  const apiKeyBaidu = document.getElementById('apiKeyBaidu');
  const apiKeyTencent = document.getElementById('apiKeyTencent');
  const googleApiProxy = document.getElementById('googleApiProxy');

  if (sourceLang) {
    sourceLang.addEventListener('change', saveSettings);
  }

  // 目标语言变化时，更新字体选项并保存设置
  if (targetLang) {
    targetLang.addEventListener('change', async () => {
      const newLang = document.getElementById('targetLang').value;
      updateFontOptions(newLang, ''); // 更新字体列表，并将字体设为默认值
      await saveSettings(); // 保存新的语言和默认字体设置
    });
  }

  // 目标语言字体变化时，保存设置
  if (targetLangFont) {
    targetLangFont.addEventListener('change', saveSettings);
  }

  // API提供商变化时，切换API密钥输入框和谷歌代理输入框的显示并保存
  if (apiProvider) {
    apiProvider.addEventListener('change', (e) => {
      toggleApiKeyBaiduSection(e.target.value);
      toggleApiKeyTencentSection(e.target.value);
      toggleGoogleApiProxySection(e.target.value);
      saveSettings();
    });
  }

  if (apiKeyBaidu) {
    apiKeyBaidu.addEventListener('change', saveSettings);
  }
  
  if (apiKeyTencent) {
    apiKeyTencent.addEventListener('change', saveSettings);
  }

  if (googleApiProxy) {
    googleApiProxy.addEventListener('change', saveSettings);
  }

  // 添加自定义词汇
  const addWordButton = document.getElementById('addWord');
  if (addWordButton) {
    addWordButton.addEventListener('click', () => {
      const original = document.getElementById('originalWord').value;
      const translated = document.getElementById('translatedWord').value;
      
      if (original.trim() && translated.trim()) {
        addCustomWord(original, translated);
      } else {
        alert(I18n.t('pleaseEnterWordAndTranslation'));
      }
    });
  }
  
  // 删除自定义词汇和分页事件
  const wordList = document.getElementById('wordList');
  if (wordList) {
    wordList.addEventListener('click', (e) => {
      // 处理删除按钮
      if (e.target.classList.contains('delete-word')) {
        const word = e.target.dataset.word;
        if (confirm(I18n.t('confirmDeleteWord', word))) {
          deleteCustomWord(word);
        }
      }
      
      // 处理分页按钮
      if (e.target.classList.contains('page-btn') && !e.target.disabled) {
        const page = parseInt(e.target.dataset.page);
        if (page > 0) {
          changePage(page);
        }
      }
    });
    
    // 添加输入框变化监听器用于自动保存
    wordList.addEventListener('input', (e) => {
      if (e.target.classList.contains('edit-original') || e.target.classList.contains('edit-translated')) {
        const wordItem = e.target.closest('.add-word-form'); // 修改为正确的class名
        const word = wordItem.dataset.word;
        
        // 延迟保存，避免频繁保存
        clearTimeout(wordItem.saveTimeout);
        wordItem.saveTimeout = setTimeout(() => {
          autoSaveEditedWord(word, wordItem);
        }, 500);
      }
    });
  }
  
  // 清空自定义词库
  const clearWordsButton = document.getElementById('clearWords');
  if (clearWordsButton) {
    clearWordsButton.addEventListener('click', clearCustomWords);
  }

  // 导出词库
  const exportWordsButton = document.getElementById('exportWords');
  if (exportWordsButton) {
    exportWordsButton.addEventListener('click', exportCustomWords);
  }

  // 导入词库
  const importWordsButton = document.getElementById('importWords');
  if (importWordsButton) {
    importWordsButton.addEventListener('click', importCustomWords);
  }

  // 谷歌API代理输入框变化时，自动保存
  const googleApiProxyInput = document.getElementById('googleApiProxy');
  if (googleApiProxyInput) {
    googleApiProxyInput.addEventListener('input', saveSettings);
  }

  // 密码显示切换功能
  const toggleBaiduPassword = document.getElementById('toggleBaiduPassword');
  if (toggleBaiduPassword) {
    toggleBaiduPassword.addEventListener('click', () => {
      const passwordInput = document.getElementById('apiKeyBaidu');
      const eyeIcon = toggleBaiduPassword.querySelector('.eye-icon');
      const eyeSlashIcon = toggleBaiduPassword.querySelector('.eye-slash-icon');
      
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.style.display = 'none';
        eyeSlashIcon.style.display = 'block';
      } else {
        passwordInput.type = 'password';
        eyeIcon.style.display = 'block';
        eyeSlashIcon.style.display = 'none';
      }
    });
  }
  // 腾讯API密钥显示切换功能
  const toggleTencentPassword = document.getElementById('toggleTencentPassword');
  if (toggleTencentPassword) {
    toggleTencentPassword.addEventListener('click', () => {
      const passwordInput = document.getElementById('apiKeyTencent');
      const eyeIcon = toggleTencentPassword.querySelector('.eye-icon');
      const eyeSlashIcon = toggleTencentPassword.querySelector('.eye-slash-icon');
      
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.style.display = 'none';
        eyeSlashIcon.style.display = 'block';
      } else {
        passwordInput.type = 'password';
        eyeIcon.style.display = 'block';
        eyeSlashIcon.style.display = 'none';
      }
    });
  }

  // 导出词库按钮
  const exportButton = document.getElementById('exportWords');
  if (exportButton) {
    exportButton.addEventListener('click', exportCustomWords);
  }

  // 导入词库按钮
  const importButton = document.getElementById('importWords');
  if (importButton) {
    importButton.addEventListener('click', importCustomWords);
  }
}

// 导出词库为JSON文件
async function exportCustomWords() {
  try {
    const result = await chrome.storage.local.get(['customWords']);
    const customWords = result.customWords || {};
    
    // 检查是否有词汇可导出
    if (Object.keys(customWords).length === 0) {
      alert(I18n.t('dictionaryIsEmpty'));
      return;
    }
    
    // 创建JSON数据
    const jsonData = JSON.stringify(customWords, null, 2);
    
    // 创建Blob对象
    const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 生成文件名（包含当前日期时间）
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    link.download = `LazyTranslate_Dictionary_${timestamp}.json`;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放URL对象
    URL.revokeObjectURL(url);
    
    console.log('词库导出成功');
  } catch (error) {
    console.error('导出词库失败:', error);
    alert(I18n.t('exportFailed'));
  }
}

// 导入词库从JSON文件
async function importCustomWords() {
  try {
    // 创建文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    // 添加文件选择事件监听器
    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      // 检查文件类型
      if (!file.name.toLowerCase().endsWith('.json')) {
        alert(I18n.t('pleaseSelectJsonFile'));
        return;
      }
      
      try {
        // 读取文件内容
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            // 解析JSON数据
            const importedWords = JSON.parse(e.target.result);
            
            // 验证数据格式
            if (typeof importedWords !== 'object' || importedWords === null) {
              alert(I18n.t('invalidDictionaryFormat'));
              return;
            }
            
            // 验证每个条目是否为字符串
            for (const [key, value] of Object.entries(importedWords)) {
              if (typeof key !== 'string' || typeof value !== 'string') {
                alert(I18n.t('invalidEntryFormat'));
                return;
              }
            }
            
            // 获取当前词库
            const result = await chrome.storage.local.get(['customWords']);
            const currentWords = result.customWords || {};
            
            // 检查是否有重复词汇
            const duplicates = [];
            for (const key in importedWords) {
              if (currentWords.hasOwnProperty(key)) {
                duplicates.push(key);
              }
            }
            
            let shouldProceed = true;
            if (duplicates.length > 0) {
              const duplicateList = duplicates.slice(0, 5).join(', ') + (duplicates.length > 5 ? ` ${I18n.t('andMore', duplicates.length)}` : '');
              shouldProceed = confirm(I18n.t('confirmOverwriteDuplicates', duplicateList));
              
              if (!shouldProceed) {
                // 移除重复词汇
                for (const key of duplicates) {
                  delete importedWords[key];
                }
              }
            }
            
            if (Object.keys(importedWords).length === 0) {
              alert(I18n.t('noNewWordsToImport'));
              return;
            }
            
            // 合并词库
            const mergedWords = { ...currentWords, ...importedWords };
            
            // 保存到存储
            await chrome.storage.local.set({ customWords: mergedWords });
            
            // 重新加载词库显示
            await loadCustomWords();
            
            alert(I18n.t('importSuccess', Object.keys(importedWords).length));
            console.log('词库导入成功');
            
          } catch (parseError) {
            console.error('解析JSON失败:', parseError);
            alert(I18n.t('invalidJsonFormat'));
          }
        };
        
        reader.onerror = () => {
          alert(I18n.t('readFileFailed'));
        };
        
        // 以UTF-8编码读取文件
        reader.readAsText(file, 'UTF-8');
        
      } catch (error) {
        console.error('处理文件失败:', error);
        alert(I18n.t('processFileFailed'));
      }
    });
    
    // 触发文件选择对话框
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
    
  } catch (error) {
    console.error('导入词库失败:', error);
    alert(I18n.t('importFailed'));
  }
}