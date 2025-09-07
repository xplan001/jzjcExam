// 题库页面逻辑
Page({
  data: {
    questionBanks: [
      {
        id: 1,
        title: "主体检测题库",
        description: "专注于建筑结构检测的题目，包括混凝土、钢筋布置等核心概念。",
        questionCount: 20,
        coverImage: "/images/icon_question.png",
        loadStatus: 'loading' // loading, success, error
      },
      {
        id: 2,
        title: "基础检测题库",
        description: "包括建筑桩基检测、土力学等相关题目，适合工程检测人员学习。",
        questionCount: 15,
        coverImage: "/images/icon_question.png",
        loadStatus: 'loading'
      },
      {
        id: 3,
        title: "钢结构检测题库",
        description: "包含钢结构检测相关知识，适合钢结构检测相关的工程师。",
        questionCount: 18,
        coverImage: "/images/icon_question.png",
        loadStatus: 'loading'
      },
      {
        id: 4,
        title: "桥梁检测题库",
        description: "包含桥梁检测的题目，适合桥梁检测相关的工程师。",
        questionCount: 25,
        coverImage: "/images/icon_question.png",
        loadStatus: 'loading'
      }
    ],
    searchValue: "",
    globalLoadError: false
  },

  onLoad: function() {
    this.loadAllQuestionBanks();
  },
  
  // 加载所有题库数据
  loadAllQuestionBanks: function() {
    const that = this;
    let hasError = false;
    
    // 直接从JS模块加载题库数据
    const updatedBanks = that.data.questionBanks.map(bank => {
      try {
        // 加载对应ID的题库数据
        const subjectData = require('../../data/subject' + bank.id + '.js');
        
        // 增强数据校验逻辑
        if (!Array.isArray(subjectData)) {
          throw new Error('题库数据不是数组格式');
        }
        
        // 检查每道题是否包含必要字段
        const isValid = subjectData.every(question => {
          return question && 
                 question.id !== undefined && 
                 question.question !== undefined && 
                 question.options !== undefined && 
                 question.answer !== undefined;
        });
        
        if (!isValid) {
          throw new Error('题库数据格式不完整，缺少必要字段');
        }
        
        // 更新题目数量和状态
        return {
          ...bank,
          questionCount: subjectData.length,
          loadStatus: 'success'
        };
      } catch (err) {
        console.error(`加载题库ID: ${bank.id} 失败`, err);
        hasError = true;
        // 记录错误信息
        return {
          ...bank,
          loadStatus: 'error',
          errorMsg: err.message || '加载失败'
        };
      }
    });
    
    that.setData({ 
      questionBanks: updatedBanks,
      globalLoadError: hasError
    });
    
    // 如果有错误，显示提示
    if (hasError) {
      wx.showToast({
        title: '部分题库加载失败',
        icon: 'none',
        duration: 3000
      });
    }
  },
  
  // 刷新特定题库
  refreshBank: function(e) {
    const that = this;
    const bankId = e.currentTarget.dataset.id;
    
    // 更新状态为加载中
    const updatedBanks = that.data.questionBanks.map(bank => {
      if (bank.id === bankId) {
        return {
          ...bank,
          loadStatus: 'loading'
        };
      }
      return bank;
    });
    
    that.setData({ questionBanks: updatedBanks });
    
    // 尝试重新加载
    try {
      const subjectData = require('../../data/subject' + bankId + '.js');
      
      // 校验数据
      if (!Array.isArray(subjectData)) {
        throw new Error('题库数据不是数组格式');
      }
      
      const isValid = subjectData.every(question => {
        return question && 
               question.id !== undefined && 
               question.question !== undefined && 
               question.options !== undefined && 
               question.answer !== undefined;
      });
      
      if (!isValid) {
        throw new Error('题库数据格式不完整');
      }
      
      // 更新数据
      const refreshedBanks = that.data.questionBanks.map(bank => {
        if (bank.id === bankId) {
          return {
            ...bank,
            questionCount: subjectData.length,
            loadStatus: 'success',
            errorMsg: ''
          };
        }
        return bank;
      });
      
      that.setData({ 
        questionBanks: refreshedBanks,
        globalLoadError: refreshedBanks.some(bank => bank.loadStatus === 'error')
      });
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
      
    } catch (err) {
      console.error(`刷新题库ID: ${bankId} 失败`, err);
      
      const errorBanks = that.data.questionBanks.map(bank => {
        if (bank.id === bankId) {
          return {
            ...bank,
            loadStatus: 'error',
            errorMsg: err.message || '刷新失败'
          };
        }
        return bank;
      });
      
      that.setData({ 
        questionBanks: errorBanks,
        globalLoadError: true
      });
      
      wx.showToast({
        title: '刷新失败: ' + err.message,
        icon: 'none',
        duration: 3000
      });
    }
  },
  
  // 刷新所有题库
  refreshAllBanks: function() {
    this.loadAllQuestionBanks();
    wx.showLoading({
      title: '正在刷新',
    });
    
    setTimeout(() => {
      wx.hideLoading();
      if (!this.data.globalLoadError) {
        wx.showToast({
          title: '全部刷新成功',
          icon: 'success'
        });
      }
    }, 1000);
  },

  onSearchInput: function(e) {
    const searchValue = e.detail.value.toLowerCase();
    this.setData({
      searchValue: searchValue
    });
    
    // 这里可以添加题库搜索逻辑
  },

  goToBankDetail: function(e) {
    const index = e.currentTarget.dataset.index;
    const bank = this.data.questionBanks[index];
    
    // 如果题库加载失败，提示用户
    if (bank.loadStatus === 'error') {
      wx.showToast({
        title: '该题库加载失败，请先刷新',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到题库详情页
    wx.navigateTo({
      url: `/pages/bankDetail/bankDetail?id=${bank.id}&title=${encodeURIComponent(bank.title)}`
    });
  },

  // 跳转到搜索页面
  navigateToSearch: function() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  }
});