// 国际化工具类
class I18n {
  static currentLanguage = 'zh'; // 默认语言
  
  // 初始化国际化
  static async init() {
    const result = await chrome.storage.local.get(['displayLanguage']);
    this.currentLanguage = result.displayLanguage || this.detectBrowserLanguage();
    await this.loadLanguageMessages(this.currentLanguage);
  }
  
  // 检测浏览器语言
  static detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('zh')) {
      return 'zh';
    } else if (browserLang.startsWith('en')) {
      return 'en';
    }
    return 'zh'; // 默认中文
  }
  
  // 获取翻译文本
  static t(key, ...args) {
    if (!this.messages) {
      return key;
    }
    
    let message = this.messages[key] || key;
    
    // 支持参数替换
    if (args.length > 0) {
      args.forEach((arg, index) => {
        message = message.replace(new RegExp(`\\{${index}\\}`, 'g'), arg);
      });
    }
    
    // 处理转义的换行符
    message = message.replace(/\\n/g, '\n');
    
    return message;
  }
  
  // 设置语言
  static async setLanguage(language) {
    this.currentLanguage = language;
    await chrome.storage.local.set({ displayLanguage: language });
    
    // 由于 Chrome Extension 的 i18n API 不支持动态切换语言包，
    // 我们需要手动实现语言切换逻辑
    await this.loadLanguageMessages(language);
  }
  
  // 手动加载指定语言的消息
  static async loadLanguageMessages(language) {
    try {
      // 根据语言加载对应的消息
      if (language === 'zh') {
        this.messages = {
          'extensionName': 'LazyTranslate',
          'extensionDescription': '支持自定义词库的智能网页翻译扩展，支持多种翻译API',
          'popupTitle': 'LazyTranslate',
          'popupSubtitle': '网页翻译工具',
          'languageSettings': '翻译语言设置',
          'sourceLanguage': '原语言:',
          'targetLanguage': '目标语言:',
          'fontSettings': '字体设置',
          'targetLanguageFont': '目标语言字体:',
          'defaultFont': '默认字体',
          'translateCurrentPage': '翻译当前页面',
          'translateSelection': '翻译选中内容',
          'showOriginalText': '显示网页原文',
          'apiSettings': '翻译API',
          'selectApi': '选择API:',
          'googleTranslate': '谷歌翻译',
          'baiduTranslate': '百度翻译',
          'tencentTranslate': '腾讯翻译',
          'googleApiProxy': '谷歌翻译API代理:',
          'googleApiProxyDescription': '空白时直连https://translate.googleapis.com<br/>由于国内无法访问，可使用自己的代理服务器',
          'googleApiProxyPlaceholder': '请输入谷歌翻译API代理',
          'baiduApiKey': '百度翻译API密钥:',
          'baiduApiKeyPlaceholder': '请输入API密钥',
          'tencentApiKey': '腾讯翻译API密钥:',
          'tencentApiKeyPlaceholder': '请输入SecretId:SecretKey',
          'customWords': '自定义词库',
          'originalWord': '原词',
          'translatedWord': '翻译',
          'addWord': '添加',
          'clearWords': '清空词库',
          'exportWords': '导出词库',
          'importWords': '导入词库',
          'deleteWord': '删除',
          'optionsTitle': 'LazyTranslate 选项',
          'displayLanguageSettings': '显示语言设置',
          'displayLanguage': '界面语言:',
          'chinese': '中文',
          'english': '英语',
          'saveSettings': '保存设置',
          'settingsSaved': '设置已保存',
          'openOptions': '打开选项页面',
          'autoDetect': '自动识别',
          'japanese': '日语',
          'korean': '韩语',
          'french': '法语',
          'german': '德语',
          'spanish': '西班牙语',
          'russian': '俄语',
          'portuguese': '葡萄牙语',
          'italian': '意大利语',
          'wordAlreadyExists': '该词汇已存在',
          'pleaseEnterWordAndTranslation': '请输入原词和翻译',
          'confirmDeleteWord': '确定要删除词汇 "{0}" 吗？',
          'dictionaryIsEmpty': '词库为空，没有可导出的内容',
          'exportFailed': '导出词库失败，请重试',
          'pleaseSelectJsonFile': '请选择JSON格式的文件',
          'invalidDictionaryFormat': '文件格式错误：不是有效的词库格式',
          'invalidEntryFormat': '文件格式错误：词库条目必须为字符串',
          'noNewWordsToImport': '没有新词汇可导入',
          'importSuccess': '成功导入 {0} 个词汇',
          'invalidJsonFormat': '文件格式错误：无法解析JSON文件，请检查文件格式',
          'readFileFailed': '读取文件失败，请重试',
          'processFileFailed': '处理文件失败，请重试',
          'importFailed': '导入词库失败，请重试',
          'previousPage': '上一页',
          'nextPage': '下一页',
          'pageInfo': '第 {0} 页，共 {1} 页 ({2} 个词汇)',
          'totalWords': '共 {0} 个词汇',
          'confirmClearDictionary': '确定要清空所有自定义词库吗？',
          'andMore': '等{0}个',
          'confirmOverwriteDuplicates': '发现重复词汇：{0}\\n\\n是否覆盖现有词汇？\\n点击"确定"覆盖，点击"取消"跳过重复词汇'
        };
      } else if (language === 'en') {
        this.messages = {
          'extensionName': 'LazyTranslate',
          'extensionDescription': 'Intelligent web translation extension with custom dictionary support, supports multiple translation APIs',
          'popupTitle': 'LazyTranslate',
          'popupSubtitle': 'Web Translation Tool',
          'languageSettings': 'Translation Language Settings',
          'sourceLanguage': 'Source Language:',
          'targetLanguage': 'Target Language:',
          'fontSettings': 'Font Settings',
          'targetLanguageFont': 'Target Language Font:',
          'defaultFont': 'Default Font',
          'translateCurrentPage': 'Translate Current Page',
          'translateSelection': 'Translate Selection',
          'showOriginalText': 'Show Original Text',
          'apiSettings': 'Translation API',
          'selectApi': 'Select API:',
          'googleTranslate': 'Google Translate',
          'baiduTranslate': 'Baidu Translate',
          'tencentTranslate': 'Tencent Translate',
          'googleApiProxy': 'Google Translate API Proxy:',
          'googleApiProxyDescription': 'Direct connection to https://translate.googleapis.com when blank<br/>Can use your own proxy server due to access restrictions',
          'googleApiProxyPlaceholder': 'Enter Google Translate API proxy',
          'baiduApiKey': 'Baidu Translate API Key:',
          'baiduApiKeyPlaceholder': 'Enter API key',
          'tencentApiKey': 'Tencent Translate API Key:',
          'tencentApiKeyPlaceholder': 'Enter SecretId:SecretKey',
          'customWords': 'Custom Dictionary',
          'originalWord': 'Original Word',
          'translatedWord': 'Translation',
          'addWord': 'Add',
          'clearWords': 'Clear Dictionary',
          'exportWords': 'Export Dictionary',
          'importWords': 'Import Dictionary',
          'deleteWord': 'Delete',
          'optionsTitle': 'LazyTranslate Options',
          'displayLanguageSettings': 'Display Language Settings',
          'displayLanguage': 'Interface Language:',
          'chinese': 'Chinese',
          'english': 'English',
          'saveSettings': 'Save Settings',
          'settingsSaved': 'Settings saved',
          'openOptions': 'Open Options Page',
          'autoDetect': 'Auto Detect',
          'japanese': 'Japanese',
          'korean': 'Korean',
          'french': 'French',
          'german': 'German',
          'spanish': 'Spanish',
          'russian': 'Russian',
          'portuguese': 'Portuguese',
          'italian': 'Italian',
          'wordAlreadyExists': 'This word already exists',
          'pleaseEnterWordAndTranslation': 'Please enter both original word and translation',
          'confirmDeleteWord': 'Are you sure you want to delete the word "{0}"?',
          'dictionaryIsEmpty': 'Dictionary is empty, nothing to export',
          'exportFailed': 'Failed to export dictionary, please try again',
          'pleaseSelectJsonFile': 'Please select a JSON format file',
          'invalidDictionaryFormat': 'File format error: not a valid dictionary format',
          'invalidEntryFormat': 'File format error: dictionary entries must be strings',
          'noNewWordsToImport': 'No new words to import',
          'importSuccess': 'Successfully imported {0} words',
          'invalidJsonFormat': 'File format error: unable to parse JSON file, please check file format',
          'readFileFailed': 'Failed to read file, please try again',
          'processFileFailed': 'Failed to process file, please try again',
          'importFailed': 'Failed to import dictionary, please try again',
          'previousPage': 'Previous',
          'nextPage': 'Next',
          'pageInfo': 'Page {0} of {1} ({2} words)',
          'totalWords': 'Total {0} words',
          'confirmClearDictionary': 'Are you sure you want to clear all custom dictionary?',
          'andMore': 'and {0} more',
          'confirmOverwriteDuplicates': 'Found duplicate words: {0}\\n\\nDo you want to overwrite existing words?\\nClick "OK" to overwrite, "Cancel" to skip duplicates'
        };
      }
    } catch (error) {
      console.error('加载语言消息失败:', error);
    }
  }
  
  // 获取当前语言
  static getCurrentLanguage() {
    return this.currentLanguage;
  }
  
  // 翻译页面上的所有元素
  static translatePage() {
    // 翻译所有带有 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const text = this.t(key);
      
      if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'password')) {
        element.placeholder = text;
      } else if (element.innerHTML.includes('<br')) {
        // 处理包含 HTML 的内容
        element.innerHTML = text;
      } else {
        element.textContent = text;
      }
    });
    
    // 翻译所有带有 data-i18n-title 属性的元素
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });
    
    // 翻译 select 选项
    this.translateSelectOptions();
  }
  
  // 翻译 select 选项
  static translateSelectOptions() {
    // 语言选项翻译
    const sourceLangSelect = document.getElementById('sourceLang');
    const targetLangSelect = document.getElementById('targetLang');
    
    if (sourceLangSelect) {
      this.translateLanguageOptions(sourceLangSelect);
    }
    
    if (targetLangSelect) {
      this.translateLanguageOptions(targetLangSelect);
    }
    
    // API 提供商选项翻译
    const apiProviderSelect = document.getElementById('apiProvider');
    if (apiProviderSelect) {
      const options = apiProviderSelect.querySelectorAll('option');
      options.forEach(option => {
        const value = option.value;
        switch (value) {
          case 'google':
            option.textContent = this.t('googleTranslate');
            break;
          case 'baidu':
            option.textContent = this.t('baiduTranslate');
            break;
          case 'tencent':
            option.textContent = this.t('tencentTranslate');
            break;
        }
      });
    }
  }
  
  // 翻译语言选项
  static translateLanguageOptions(selectElement) {
    const options = selectElement.querySelectorAll('option');
    options.forEach(option => {
      const value = option.value;
      switch (value) {
        case 'auto':
          option.textContent = this.t('autoDetect');
          break;
        case 'en':
          option.textContent = this.t('english');
          break;
        case 'zh':
          option.textContent = this.t('chinese');
          break;
        case 'ja':
          option.textContent = this.t('japanese');
          break;
        case 'ko':
          option.textContent = this.t('korean');
          break;
        case 'fr':
          option.textContent = this.t('french');
          break;
        case 'de':
          option.textContent = this.t('german');
          break;
        case 'es':
          option.textContent = this.t('spanish');
          break;
        case 'ru':
          option.textContent = this.t('russian');
          break;
        case 'pt':
          option.textContent = this.t('portuguese');
          break;
        case 'it':
          option.textContent = this.t('italian');
          break;
      }
    });
  }
}

// 导出 I18n 类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18n;
}
