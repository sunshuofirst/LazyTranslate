// Options 页面脚本
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化国际化
  await I18n.init();
  
  // 翻译页面
  I18n.translatePage();
  
  // 更新语言选择下拉框
  updateLanguageOptions();
  
  // 加载当前设置
  await loadSettings();
  
  // 设置事件监听器
  setupEventListeners();
});

// 加载设置
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['displayLanguage']);
    const displayLanguage = result.displayLanguage || I18n.detectBrowserLanguage();
    
    document.getElementById('displayLanguage').value = displayLanguage;
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

// 设置事件监听器
function setupEventListeners() {
  // 保存设置按钮
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  
  // 语言选择改变时立即应用
  document.getElementById('displayLanguage').addEventListener('change', async (e) => {
    const selectedLanguage = e.target.value;
    await I18n.setLanguage(selectedLanguage);
    I18n.translatePage();
    
    // 手动更新语言选择下拉框的选项文本
    updateLanguageOptions();
  });
}

// 更新语言选择下拉框的选项文本（保持原始语言显示）
function updateLanguageOptions() {
  const displayLanguageSelect = document.getElementById('displayLanguage');
  const options = displayLanguageSelect.querySelectorAll('option');
  
  options.forEach(option => {
    const value = option.value;
    if (value === 'zh') {
      option.textContent = '中文';
    } else if (value === 'en') {
      option.textContent = 'English';
    }
  });
}

// 保存设置
async function saveSettings() {
  try {
    const displayLanguage = document.getElementById('displayLanguage').value;
    
    // 保存到存储
    await chrome.storage.local.set({ displayLanguage });
    
    // 更新国际化语言
    await I18n.setLanguage(displayLanguage);
    
    // 重新翻译整个页面
    I18n.translatePage();
    
    // 显示保存成功消息（使用更新后的语言）
    showSaveMessage();
    
    // 通知其他页面语言已更改
    notifyLanguageChange(displayLanguage);
    
  } catch (error) {
    console.error('保存设置失败:', error);
    showNotification('保存设置失败', 'error');
  }
}

// 显示通知消息
function showNotification(message, type = 'success') {
  // 移除现有的通知
  const existingNotification = document.querySelector('.options-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // 创建新的通知元素
  const notification = document.createElement('div');
  notification.className = 'options-notification';
  notification.style.cssText = `
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
  
  // 添加动画样式
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 1000);
}

// 显示保存成功消息（保持向后兼容）
function showSaveMessage() {
  showNotification(I18n.t('settingsSaved'), 'success');
}

// 通知其他页面语言已更改
function notifyLanguageChange(language) {
  // 发送消息到 background script
  chrome.runtime.sendMessage({
    type: 'LANGUAGE_CHANGED',
    language: language
  }).catch(() => {
    // 忽略错误，可能没有 background script 在监听
  });
}
