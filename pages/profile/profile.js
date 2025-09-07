// 个人中心页面逻辑
const common = require('../../utils/common.js');
const { STORAGE_KEYS, DATA_VERSION, getStorageData, setStorageData, eventBus, log, LOG_LEVEL } = common;

Page({
  data: {
    // 用户信息
    userInfo: {
      nickname: "默认用户",
      userId: "123456",
      avatarUrl: "/images/avatar-default.png"
    },
    
    // 统计数据
    totalAnswered: 42,
    correctRate: 87,
    favoriteCount: 5,
    
    // 收藏题目
    favorites: [
      {
        id: 2,
        question: "CSS中，哪个属性用于设置元素的外边距？",
        type: "单选题"
      },
      {
        id: 5,
        question: "在SQL中，哪个命令用于从表中检索数据？",
        type: "单选题"
      }
    ],
    
    // 答题历史
    history: [
      {
        id: 1,
        question: "以下哪个不是JavaScript的基本数据类型？",
        date: "2023-11-15",
        isCorrect: true
      },
      {
        id: 3,
        question: "React的核心思想是什么？",
        date: "2023-11-14",
        isCorrect: false
      },
      {
        id: 4,
        question: "请简述HTTP和HTTPS的主要区别。",
        date: "2023-11-12",
        isCorrect: true
      }
    ]
  },

  onLoad: function() {
    // 初始化数据缓存标记
    this.dataLoaded = { userData: false, favorites: false, history: false };
    
    // 使用异步加载提升性能
    this.loadUserDataAsync();
    this.loadFavoritesAsync();
    this.loadHistoryAsync();
    
    // 注册事件监听
    eventBus.on('userInfoUpdated', this.handleUserInfoUpdated);
    eventBus.on('favoritesUpdated', this.handleFavoritesUpdated);
    eventBus.on('historyUpdated', this.handleHistoryUpdated);
  },
  
  onUnload: function() {
    // 移除事件监听
    eventBus.off('userInfoUpdated', this.handleUserInfoUpdated);
    eventBus.off('favoritesUpdated', this.handleFavoritesUpdated);
    eventBus.off('historyUpdated', this.handleHistoryUpdated);
  },

  // 页面显示时重新加载数据
  onShow: function() {
    // 检查全局数据是否有更新
    const app = getApp();
    if (app.globalData.userInfo) {
      // 如果全局数据有更新，直接使用
      this.setData({
        userInfo: app.globalData.userInfo
      });
    } else {
      // 否则重新从本地存储加载
      this.loadUserDataAsync();
    }
    
    // 重新加载收藏和历史数据
    this.loadFavoritesAsync();
    this.loadHistoryAsync();
  },
  
  // 事件处理函数
  handleUserInfoUpdated: function(userInfo) {
    log('收到用户信息更新事件', LOG_LEVEL.INFO);
    this.setData({ userInfo });
  },
  
  handleFavoritesUpdated: function() {
    log('收到收藏更新事件', LOG_LEVEL.INFO);
    this.loadFavoritesAsync();
  },
  
  handleHistoryUpdated: function() {
    log('收到历史记录更新事件', LOG_LEVEL.INFO);
    this.loadHistoryAsync();
  },

  // 检查数据是否全部加载完成
  checkAllDataLoaded: function() {
    const allLoaded = Object.values(this.dataLoaded).every(Boolean);
    if (allLoaded) {
      console.log('All data loaded successfully');
      // 可以在这里添加数据加载完成后的回调
    }
  },

  // 异步加载用户数据
  loadUserDataAsync: function() {
    try {
      const userInfo = getStorageData(STORAGE_KEYS.USER_INFO);
      if (userInfo) {
        // 数据版本检查和字段兼容性处理
        this.processUserData(userInfo);
      } else {
        log('No user info in storage, using default', LOG_LEVEL.INFO);
        this.setData({
          userInfo: this.data.userInfo
        }, () => {
          this.dataLoaded.userData = true;
          this.checkAllDataLoaded();
        });
      }
    } catch (error) {
      log('Error loading user data: ' + error.message, LOG_LEVEL.ERROR);
      this.setData({
        userInfo: this.data.userInfo
      }, () => {
        this.dataLoaded.userData = true;
        this.checkAllDataLoaded();
      });
    }
  },

  // 处理用户数据 - 检查版本和兼容性
  processUserData: function(userData) {
    // 检查数据版本
    const version = userData.version || 0;
    let processedData = { ...userData };
    
    // 根据版本执行必要的迁移
    if (version < DATA_VERSION) {
      // 版本迁移逻辑
      console.log(`Migrating user data from version ${version} to ${DATA_VERSION}`);
      // 示例: 如果需要添加新字段
      if (typeof processedData.nickname === 'undefined') {
        processedData.nickname = '默认用户';
      }
      if (typeof processedData.avatarUrl === 'undefined') {
        processedData.avatarUrl = '/images/avatar-default.png';
      }
      // 更新版本
      processedData.version = DATA_VERSION;
    }
    
    this.setData({
      userInfo: processedData
    }, () => {
      this.dataLoaded.userData = true;
      this.checkAllDataLoaded();
    });
  },

  // 异步加载收藏题目
  loadFavoritesAsync: function() {
    try {
      const favorites = getStorageData(STORAGE_KEYS.FAVORITES, []);
      log('Raw favorites from storage: ' + favorites.length, LOG_LEVEL.INFO);
      
      // 数据版本检查和字段兼容性处理
      this.processFavoritesData(favorites);
    } catch (error) {
      log('Error loading favorites: ' + error.message, LOG_LEVEL.ERROR);
      wx.showToast({
        title: '加载收藏失败',
        icon: 'none'
      });
      this.setData({
        favorites: this.data.favorites,
        favoriteCount: this.data.favorites.length
      }, () => {
        this.dataLoaded.favorites = true;
        this.checkAllDataLoaded();
      });
    }
  },

  // 处理收藏数据 - 检查版本和兼容性
  processFavoritesData: function(favoritesData) {
    // 检查数据类型
    if (!favoritesData || !Array.isArray(favoritesData)) {
      console.log('Favorites data is not an array, using default');
      this.setData({
        favorites: this.data.favorites,
        favoriteCount: this.data.favorites.length
      }, () => {
        this.dataLoaded.favorites = true;
        this.checkAllDataLoaded();
      });
      return;
    }
    
    console.log('Favorites from storage length:', favoritesData.length);
    
    // 处理每个收藏项
    const processedFavorites = favoritesData.map(item => {
      let processedItem = { ...item };
      
      // 检查数据版本
      const itemVersion = processedItem.version || 0;
      
      // 根据版本执行必要的迁移
      if (itemVersion < DATA_VERSION) {
        console.log(`Migrating favorite item from version ${itemVersion} to ${DATA_VERSION}`);
        
        // 统一ID字段 - 确保向后兼容
        if (typeof processedItem.questionId !== 'undefined' && typeof processedItem.id === 'undefined') {
          processedItem.id = processedItem.questionId;
          console.log('Converted questionId to id for favorite item');
        }
        
        // 统一题目文字字段 - 确保向后兼容
        if (typeof processedItem.questionText !== 'undefined' && typeof processedItem.question === 'undefined') {
          processedItem.question = processedItem.questionText;
          console.log('Converted questionText to question for favorite item');
        }
        
        // 确保题目类型字段存在
        if (typeof processedItem.type === 'undefined') {
          processedItem.type = '未知题型';
        }
        
        // 更新版本
        processedItem.version = DATA_VERSION;
      }
      
      return processedItem;
    });
    
    // 过滤有效的收藏项
    const validFavorites = processedFavorites.filter(item => {
      const isValid = item && typeof item.id !== 'undefined' && typeof item.question !== 'undefined';
      if (!isValid) {
        console.log('Invalid favorite item:', item);
      }
      return isValid;
    });
    
    console.log('Valid favorites after processing:', validFavorites.length);
    
    // 限制最多显示5个
    const limitedFavorites = validFavorites.slice(0, 5);
    
    this.setData({
      favorites: limitedFavorites,
      favoriteCount: validFavorites.length
    }, () => {
      this.dataLoaded.favorites = true;
      this.checkAllDataLoaded();
    });
  },

  // 异步加载历史记录
  loadHistoryAsync: function() {
    try {
      const history = getStorageData(STORAGE_KEYS.HISTORY, []);
      log('Raw history from storage: ' + history.length, LOG_LEVEL.INFO);
      
      // 数据版本检查和字段兼容性处理
      this.processHistoryData(history);
    } catch (error) {
      log('Error loading history: ' + error.message, LOG_LEVEL.ERROR);
      wx.showToast({
        title: '加载历史失败',
        icon: 'none'
      });
      this.setData({
        history: this.data.history,
        totalAnswered: this.data.history.length
      }, () => {
        this.dataLoaded.history = true;
        this.checkAllDataLoaded();
      });
    }
  },

  // 处理历史记录数据 - 检查版本和兼容性
  processHistoryData: function(historyData) {
    // 检查数据类型
    if (!historyData || !Array.isArray(historyData)) {
      console.log('History data is not an array, using default');
      this.setData({
        history: this.data.history,
        totalAnswered: this.data.history.length
      }, () => {
        this.dataLoaded.history = true;
        this.checkAllDataLoaded();
      });
      return;
    }
    
    // 处理每个历史记录项
    const processedHistory = historyData.map(item => {
      let processedItem = { ...item };
      
      // 检查数据版本
      const itemVersion = processedItem.version || 0;
      
      // 根据版本执行必要的迁移
      if (itemVersion < DATA_VERSION) {
        console.log(`Migrating history item from version ${itemVersion} to ${DATA_VERSION}`);
        
        // 统一题目文字字段 - 确保向后兼容
        if (typeof processedItem.questionText !== 'undefined' && typeof processedItem.question === 'undefined') {
          processedItem.question = processedItem.questionText;
          console.log('Converted questionText to question for history item');
        }
        
        // 统一日期字段 - 确保向后兼容
        if (typeof processedItem.timeStr !== 'undefined' && typeof processedItem.date === 'undefined') {
          processedItem.date = processedItem.timeStr;
          console.log('Converted timeStr to date for history item');
        }
        
        // 确保答题结果字段存在
        if (typeof processedItem.isCorrect === 'undefined') {
          processedItem.isCorrect = false;
        }
        
        // 更新版本
        processedItem.version = DATA_VERSION;
      }
      
      return processedItem;
    });
    
    // 过滤有效的历史记录项
    const validHistory = processedHistory.filter(item => {
      const isValid = item && typeof item.id !== 'undefined' && typeof item.question !== 'undefined';
      if (!isValid) {
        console.log('Invalid history item:', item);
      }
      return isValid;
    });
    
    console.log('Valid history after processing:', validHistory.length);
    
    // 限制最多显示5个，并按日期排序（最新的在前）
    const sortedHistory = [...validHistory].sort((a, b) => {
      return new Date(b.date || '') - new Date(a.date || '');
    });
    const limitedHistory = sortedHistory.slice(0, 5);
    
    this.setData({
      history: limitedHistory,
      totalAnswered: validHistory.length
    }, () => {
      this.dataLoaded.history = true;
      this.checkAllDataLoaded();
    });
  },

  // 跳转到题目详情
  goToQuestionDetail: function(e) {
    try {
      const index = e.currentTarget.dataset.index;
      const type = e.currentTarget.dataset.type;
      
      console.log('Navigating to question detail:', {index, type});
      console.log('Favorites length:', this.data.favorites.length);
      console.log('History length:', this.data.history.length);
      
      // 确保index是数字
      const numIndex = parseInt(index);
      if (isNaN(numIndex)) {
        throw new Error('Invalid index: ' + index);
      }
      
      // 检查index是否在有效范围内
      let arrayLength;
      if (type === 'favorite') {
        arrayLength = this.data.favorites.length;
      } else if (type === 'history') {
        arrayLength = this.data.history.length;
      }
      
      if (numIndex < 0 || numIndex >= arrayLength) {
        throw new Error(`Index ${numIndex} out of range for ${type} array of length ${arrayLength}`);
      }
      
      // 获取对应的item
      let item;
      if (type === 'favorite') {
        item = this.data.favorites[numIndex];
        console.log('Favorite item at index', numIndex, ':', item);
      } else if (type === 'history') {
        item = this.data.history[numIndex];
        console.log('History item at index', numIndex, ':', item);
      } else {
        throw new Error('Unknown type: ' + type);
      }
      
      // 确保item存在且有id属性
      if (!item || typeof item.id === 'undefined') {
        throw new Error('Item not found or has no id');
      }
      
      // 导航到题目详情，带上bankId（如果有）
      const bankId = item.bankId || 1; // 默认bankId为1
      wx.navigateTo({
        url: `/pages/questionDetail/questionDetail?id=${item.id}&bankId=${bankId}`
      });
    } catch (error) {
      console.error('Error navigating to question detail:', error);
      wx.showToast({
        title: '无法打开题目详情',
        icon: 'none'
      });
    }
  },

  // 编辑用户资料
  editUserProfile: function() {
    // 这里可以实现编辑用户资料的逻辑
    wx.navigateTo({
      url: '/pages/editProfile/editProfile'
    });
  }
});