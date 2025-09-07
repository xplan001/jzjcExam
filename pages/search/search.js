// 搜索页面逻辑
const common = require('../../utils/common.js');
const { STORAGE_KEYS, debounce } = common;

Page({
  data: {
    searchText: '',
    historySearches: [],
    hotSearches: ['低应变桩身阻抗', '土的干密度', '锚杆抗拔试验', '固结试验', '声波投射法'],
    searchResults: []
  },

  onLoad: function() {
    // 加载历史搜索记录
    const historySearches = common.getStorageData(STORAGE_KEYS.HISTORY_SEARCHES, []);
    this.setData({
      historySearches: historySearches
    });

    // 加载题库数据并创建搜索索引
    this.loadQuestionData();
  },

  // 加载题库数据
  loadQuestionData: function() {
    // 优先使用统一的题目数据
    const allQuestions = common.getStorageData(common.STORAGE_KEYS.ALL_QUESTIONS, []);
    if (allQuestions && allQuestions.length > 0) {
      // 直接使用统一的题目数据作为搜索索引
      this.searchIndex = allQuestions.map(q => ({
        id: q.id,
        bankId: q.subjectId,
        question: q.question,
        type: q.type
      }));
      console.log('搜索索引创建成功，总题目数:', this.searchIndex.length);
    } else {
      // 如果统一数据不存在，使用原始方法
      const questionData = common.loadAllQuestionData();
      if (Object.keys(questionData).length > 0) {
        this.searchIndex = common.createSearchIndex(questionData);
        console.log('搜索索引创建成功（备用方法），总题目数:', this.searchIndex.length);
      } else {
        wx.showToast({
          title: '题库数据加载失败',
          icon: 'none'
        });
      }
    }
  },

  // 输入框内容变化时触发
  onInput: function(e) {
    const searchText = e.detail.value;
    this.setData({
      searchText: searchText
    });

    // 使用防抖函数处理搜索
    if (!this._debouncedSearch) {
      this._debouncedSearch = debounce(this.searchQuestions, 200);
    }

    if (searchText) {
      this._debouncedSearch(searchText);
    } else {
      // 输入为空时清空搜索结果
      this.setData({
        searchResults: []
      });
    }
  },

  // 搜索题目
  searchQuestions: function(keyword) {
    if (!this.searchIndex || this.searchIndex.length === 0) {
      console.warn('搜索索引为空，尝试重新加载');
      this.loadQuestionData();
      return;
    }

    // 直接在搜索索引中筛选，避免每次都合并题库
    const results = this.searchIndex.filter(item => {
      return item.question && item.question.includes(keyword);
    });

    console.log('搜索结果数:', results.length);

    this.setData({
      searchResults: results
    });
  },

  // 点击搜索按钮
  onSearch: function() {
    const searchText = this.data.searchText;
    if (!searchText) return;

    // 执行搜索
    this.searchQuestions(searchText);

    // 记录历史搜索
    this.addToHistory(searchText);
  },

  // 添加到历史搜索
  addToHistory: function(text) {
    // 确保 historySearches 是数组
    let historySearches = this.data.historySearches || [];
    if (!Array.isArray(historySearches)) {
      console.warn('historySearches 不是数组，重置为空数组');
      historySearches = [];
    }
    
    // 去重
    if (historySearches.indexOf(text) === -1) {
      // 限制历史记录数量为10条
      if (historySearches.length >= 10) {
        historySearches.pop();
      }
      // 添加到数组开头
      historySearches.unshift(text);
      this.setData({
        historySearches: historySearches
      });
      // 保存到本地存储
      common.setStorageData(STORAGE_KEYS.HISTORY_SEARCHES, historySearches);
    }
  },

  // 清除历史搜索
  clearHistory: function() {
    this.setData({
      historySearches: []
    });
    wx.removeStorageSync(STORAGE_KEYS.HISTORY_SEARCHES);
  },

  // 点击历史搜索项
  clickHistoryItem: function(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({
      searchText: text
    });
    this.onSearch();
  },

  // 点击热门搜索项
  clickHotItem: function(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({
      searchText: text
    });
    this.onSearch();
  },

  // 点击搜索结果项
  clickResultItem: function(e) {
    const id = e.currentTarget.dataset.id;
    const bankId = e.currentTarget.dataset.bankId;
    // 跳转到题目详情页
    wx.navigateTo({
      url: `/pages/questionDetail/questionDetail?id=${id}&bankId=${bankId}`
    });
  },
  onUnload: function() {
    // 清理资源
    this.searchIndex = null;
    this._debouncedSearch = null;
  }
});
