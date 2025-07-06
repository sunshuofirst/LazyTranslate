// 元素选择器 - 参考 selectElement.ts 实现
class ElementRenderer {
  constructor() {
    this.BORDER = 5;
    this.PADDING = 2;
    
    // 通用样式
    this.GENERAL_CSS = {
      position: "fixed",
      display: "none",
      background: "DodgerBlue",
      zIndex: 2147483647, // 最大 z-index
    };
    
    // 底部标签样式
    this.BOTTOM_CSS = {
      color: "white",
      overflow: "hidden",
      boxSizing: "border-box",
      fontFamily: "sans-serif",
      fontWeight: "bold",
      fontSize: `${this.BORDER * 2}px`,
      lineHeight: `${this.BORDER * 4}px`,
      paddingLeft: `${this.BORDER}px`,
      paddingRight: `${this.BORDER}px`,
    };
    
    // 创建边框元素
    this.left = document.createElement("div");
    this.right = document.createElement("div");
    this.top = document.createElement("div");
    this.bottom = document.createElement("div");
    
    // 初始化样式
    this.initializeStyles();
  }
  
  initializeStyles() {
    Object.assign(this.left.style, this.GENERAL_CSS);
    Object.assign(this.right.style, this.GENERAL_CSS);
    Object.assign(this.top.style, this.GENERAL_CSS);
    Object.assign(this.bottom.style, this.GENERAL_CSS, this.BOTTOM_CSS);
  }
  
  getTagPath(element) {
    const parent = element.parentElement;
    const parentTagName = parent?.tagName.toLowerCase() ?? "";
    return `${parentTagName} ${element.tagName.toLowerCase()}`;
  }
  
  initialize() {
    document.documentElement.appendChild(this.left);
    document.documentElement.appendChild(this.right);
    document.documentElement.appendChild(this.top);
    document.documentElement.appendChild(this.bottom);
  }
  
  destroy() {
    this.left.remove();
    this.right.remove();
    this.top.remove();
    this.bottom.remove();
  }
  
  hide() {
    this.left.style.display = "none";
    this.right.style.display = "none";
    this.top.style.display = "none";
    this.bottom.style.display = "none";
  }
  
  show() {
    this.left.style.display = "block";
    this.right.style.display = "block";
    this.top.style.display = "block";
    this.bottom.style.display = "block";
  }
  
  add(element) {
    this.hide();
    
    // 使用 getBoundingClientRect() 获取相对于视口的位置
    const { left, top, width, height } = element.getBoundingClientRect();
    
    // 计算边框位置（包含内边距）
    const outerLeft = left - this.BORDER - this.PADDING;
    const outerTop = top - this.BORDER - this.PADDING;
    const outerWidth = width + this.BORDER * 2 + this.PADDING * 2;
    const outerHeight = height + this.BORDER * 4 + this.PADDING * 2;
    
    // 设置左边框
    this.left.style.left = `${outerLeft}px`;
    this.left.style.top = `${outerTop}px`;
    this.left.style.width = `${this.BORDER}px`;
    this.left.style.height = `${outerHeight}px`;
    
    // 设置右边框
    this.right.style.left = `${outerLeft + outerWidth - this.BORDER}px`;
    this.right.style.top = `${outerTop}px`;
    this.right.style.width = `${this.BORDER}px`;
    this.right.style.height = `${outerHeight}px`;
    
    // 设置上边框
    this.top.style.left = `${outerLeft}px`;
    this.top.style.top = `${outerTop}px`;
    this.top.style.width = `${outerWidth}px`;
    this.top.style.height = `${this.BORDER}px`;
    
    // 设置下边框（包含标签）
    this.bottom.style.left = `${outerLeft}px`;
    this.bottom.style.top = `${outerTop + outerHeight - this.BORDER * 3}px`;
    this.bottom.style.width = `${outerWidth}px`;
    this.bottom.style.height = `${this.BORDER * 4}px`;
    this.bottom.textContent = this.getTagPath(element);
    
    this.show();
  }
}

// 元素选择器类
class ElementSelector {
  constructor() {
    this.renderer = new ElementRenderer();
    this.isOpen = false;
    this.onElementSelected = null; // 回调函数
  }
  
  // 设置元素选中回调
  setElementSelectedCallback(callback) {
    this.onElementSelected = callback;
  }
  
  // 鼠标悬停处理
  handlePointerOver = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    
    if (event.target === document.body || event.target === document.documentElement) {
      return;
    }
    
    this.renderer.add(event.target);
  };
  
  // 点击处理
  handleClick = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    
    // 只处理用户真实触发的事件
    if (!event.isTrusted) {
      return;
    }
    
    const target = event.target;
    
    // 如果设置了回调函数，则调用
    if (this.onElementSelected && typeof this.onElementSelected === 'function') {
      this.onElementSelected(target);
    }
  };
  
  // 打开选择模式
  open() {
    this.renderer.initialize();
    
    if (this.isOpen) {
      return;
    }
    
    this.isOpen = true;
    this.renderer.show();
    
    // 为所有元素添加事件监听器
    const elements = document.querySelectorAll('body *');
    for (const element of elements) {
      element.addEventListener("click", this.handleClick, {
        capture: true,
      });
      element.addEventListener("pointerover", this.handlePointerOver, {
        capture: true,
      });
    }
  }
  
  // 关闭选择模式
  close() {
    this.renderer.destroy();
    
    if (!this.isOpen) {
      return;
    }
    
    this.isOpen = false;
    this.renderer.hide();
    
    // 移除所有元素的事件监听器
    const elements = document.querySelectorAll('body *');
    for (const element of elements) {
      element.removeEventListener("click", this.handleClick, {
        capture: true,
      });
      element.removeEventListener("pointerover", this.handlePointerOver, {
        capture: true,
      });
    }
  }
  
  // 隐藏边框
  hide() {
    this.renderer.hide();
  }
  
  // 显示边框
  show() {
    this.renderer.show();
  }
}

// 导出选择器类
window.ElementSelector = ElementSelector; 