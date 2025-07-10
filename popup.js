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
    { value: '', label: '默认字体' },
    { value: 'Microsoft YaHei', label: '微软雅黑', dataLang: 'zh' },
    { value: 'SimSun', label: '宋体', dataLang: 'zh' },
    { value: 'SimHei', label: '黑体', dataLang: 'zh' },
    { value: 'PingFang SC', label: '苹方', dataLang: 'zh' },
    { value: 'Hiragino Sans GB', label: '冬青黑体', dataLang: 'zh' },
    { value: 'Noto Sans CJK SC', label: '思源黑体', dataLang: 'zh' },
    { value: 'Arial Unicode MS', label: 'Arial Unicode MS', dataLang: 'zh' }
  ],
  'en': [
    { value: '', label: '默认字体' },
    { value: 'Arial', label: 'Arial', dataLang: 'en' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'en' },
    { value: 'Helvetica', label: 'Helvetica', dataLang: 'en' },
    { value: 'Georgia', label: 'Georgia', dataLang: 'en' },
    { value: 'Verdana', label: 'Verdana', dataLang: 'en' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'en' }
  ],
  'ja': [
    { value: '', label: '默认字体' },
    { value: 'Hiragino Kaku Gothic ProN', label: 'ヒラギノ角ゴ ProN', dataLang: 'ja' },
    { value: 'Hiragino Mincho ProN', label: 'ヒラギノ明朝 ProN', dataLang: 'ja' },
    { value: 'Yu Gothic', label: '游ゴシック', dataLang: 'ja' },
    { value: 'Yu Mincho', label: '游明朝', dataLang: 'ja' },
    { value: 'Noto Sans CJK JP', label: 'Noto Sans CJK JP', dataLang: 'ja' }
  ],
  'ko': [
    { value: '', label: '默认字体' },
    { value: 'Malgun Gothic', label: '맑은 고딕', dataLang: 'ko' },
    { value: 'Nanum Gothic', label: '나눔고딕', dataLang: 'ko' },
    { value: 'Nanum Myeongjo', label: '나눔명조', dataLang: 'ko' },
    { value: 'Noto Sans CJK KR', label: 'Noto Sans CJK KR', dataLang: 'ko' }
  ],
  'fr': [
    { value: '', label: '默认字体' },
    { value: 'Arial', label: 'Arial', dataLang: 'fr' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'fr' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'fr' },
    { value: 'Cambria', label: 'Cambria', dataLang: 'fr' }
  ],
  'de': [
    { value: '', label: '默认字体' },
    { value: 'Arial', label: 'Arial', dataLang: 'de' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'de' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'de' },
    { value: 'Cambria', label: 'Cambria', dataLang: 'de' }
  ],
  'es': [
    { value: '', label: '默认字体' },
    { value: 'Arial', label: 'Arial', dataLang: 'es' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'es' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'es' },
    { value: 'Cambria', label: 'Cambria', dataLang: 'es' }
  ],
  'ru': [
    { value: '', label: '默认字体' },
    { value: 'Arial', label: 'Arial', dataLang: 'ru' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'ru' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'ru' },
    { value: 'Cambria', label: 'Cambria', dataLang: 'ru' }
  ],
  'pt': [
    { value: '', label: '默认字体' },
    { value: 'Arial', label: 'Arial', dataLang: 'pt' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'pt' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'pt' },
    { value: 'Cambria', label: 'Cambria', dataLang: 'pt' }
  ],
  'it': [
    { value: '', label: '默认字体' },
    { value: 'Arial', label: 'Arial', dataLang: 'it' },
    { value: 'Times New Roman', label: 'Times New Roman', dataLang: 'it' },
    { value: 'Calibri', label: 'Calibri', dataLang: 'it' },
    { value: 'Cambria', label: 'Cambria', dataLang: 'it' }
  ]
};

// 初始化页面
document.addEventListener('DOMContentLoaded', async () => {
  // 1. 加载设置
  const settings = await loadSettings();
  
  // 2. 根据加载的设置更新字体选项
  updateFontOptions(settings.targetLang, settings.targetLangFont);
  
  // 3. 加载自定义词库并设置事件监听器
  await loadCustomWords();
  setupEventListeners();
  
  // 4. 为首次使用的用户检测浏览器语言
  const result = await chrome.storage.local.get(['settings']);
  if (!result.settings) {
    detectBrowserLanguage();
  }
});

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
    option.textContent = font.label;
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
        <p>点击下方按钮添加常用词汇</p>
      </div>
    `;
    return;
  }
  
  wordList.innerHTML = words.map(word => `
    <div class="word-item">
      <div class="word-content">
        <div class="word-original">${word}</div>
        <div class="word-translated">${customWords[word]}</div>
      </div>
      <button class="delete-word" data-word="${word}">删除</button>
    </div>
  `).join('');
}

// 添加自定义词汇
async function addCustomWord(original, translated) {
  try {
    const result = await chrome.storage.local.get(['customWords']);
    const customWords = result.customWords || {};
    
    customWords[original.trim()] = translated.trim();
    
    await chrome.storage.local.set({ customWords });
    await loadCustomWords();
    
    // 清空输入框
    document.getElementById('originalWord').value = '';
    document.getElementById('translatedWord').value = '';
    
    // console.log('词汇已添加');
  } catch (error) {
    console.error('添加词汇失败:', error);
  }
}

// 删除自定义词汇
async function deleteCustomWord(word) {
  try {
    const result = await chrome.storage.local.get(['customWords']);
    const customWords = result.customWords || {};
    
    delete customWords[word];
    
    await chrome.storage.local.set({ customWords });
    await loadCustomWords();
    
    // console.log('词汇已删除');
  } catch (error) {
    console.error('删除词汇失败:', error);
  }
}

// 清空自定义词库
async function clearCustomWords() {
  try {
    await chrome.storage.local.set({ customWords: {} });
    await loadCustomWords();
    // console.log('词库已清空');
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
        alert('请输入原词和翻译');
      }
    });
  }
  
  // 删除自定义词汇
  const wordList = document.getElementById('wordList');
  if (wordList) {
    wordList.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-word')) {
        const word = e.target.dataset.word;
        if (confirm(`确定要删除词汇 "${word}" 吗？`)) {
          deleteCustomWord(word);
        }
      }
    });
  }
  
  // 清空自定义词库
  const clearWordsButton = document.getElementById('clearWordsButton');
  if (clearWordsButton) {
    clearWordsButton.addEventListener('click', clearCustomWords);
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
}