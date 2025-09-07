// 历史记录页面逻辑
const common = require('../../utils/common.js');
const { STORAGE_KEYS, BANK_NAMES, getStorageData, setStorageData } = common;

Page({
  data: {
    historyList: [], // 历史记录列表
    isEmpty: true    // 是否为空
  },

  onLoad: function() {
    this.loadHistory();
  },
  
  onShow: function() {
    // 每次页面显示时重新加载历史记录
    this.loadHistory();
  },
  
  onPullDownRefresh: function() {
    // 下拉刷新
    this.loadHistory();
    wx.stopPullDownRefresh();
  },

  // 加载历史记录
  loadHistory: function() {
    try {
      let history = getStorageData(STORAGE_KEYS.HISTORY, []);
      
      console.log('历史记录原始数据:', history);
      
      // 检查是否有历史记录但没有question或questionText字段
      const hasInvalidItems = history.some(item => !item.question && !item.questionText);
      if (hasInvalidItems) {
        console.warn('发现不完整的历史记录项，缺少question或questionText字段');
        // 过滤掉不完整的记录
        history = history.filter(item => item.question || item.questionText);
        console.log('过滤后的历史记录:', history);
      }
      
      // 替换历史记录中的科目名称并按时间倒序排序
      const updatedHistory = history
        .map(item => {
          // 确保有bankName字段
          if (!item.bankName && item.bankId) {
            item.bankName = BANK_NAMES[item.bankId] || `题库${item.bankId}`;
          }
          return item;
        })
        .sort((a, b) => {
          // 使用timestamp字段进行时间倒序排序
          return b.timestamp - a.timestamp;
        });
      
      console.log('处理后的历史记录:', updatedHistory);
      
      this.setData({
        historyList: updatedHistory,
        isEmpty: updatedHistory.length === 0
      }, () => {
        console.log('历史记录数据更新成功:', this.data.historyList);
        console.log('isEmpty状态:', this.data.isEmpty);
        console.log('列表项数量:', this.data.historyList.length);
      });
    } catch (error) {
      console.error('加载历史记录出错:', error);
      this.setData({
        historyList: [],
        isEmpty: true
      });
    }
  },

  // 清空历史记录
  clearAllHistory: function() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          setStorageData(STORAGE_KEYS.HISTORY, []);
          this.setData({
            historyList: [],
            isEmpty: true
          });
          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  },

  // 调试函数：检查历史记录数据
  debugHistoryData: function() {
    try {
      // 获取原始历史记录
      const rawHistory = getStorageData(STORAGE_KEYS.HISTORY, []);
      console.log('原始历史记录数据长度:', rawHistory.length);
      console.log('原始历史记录数据:', rawHistory);

      // 检查是否有历史记录项缺少必要字段
      const invalidItems = rawHistory.filter(item => (!item.question && !item.questionText) || !item.id || !item.bankId);
      console.log('无效的历史记录项数量:', invalidItems.length);
      console.log('无效的历史记录项:', invalidItems);

      // 显示调试信息
      wx.showModal({
        title: '调试信息',
        content: `历史记录总数: ${rawHistory.length}\n无效记录数: ${invalidItems.length}\n请查看控制台获取详细信息`,
        showCancel: false
      });
    } catch (error) {
      console.error('调试历史记录数据出错:', error);
      wx.showToast({
        title: '调试失败',
        icon: 'none'
      });
    }
  },

  // 删除单条历史记录
  deleteHistoryItem: function(e) {
    const index = e.currentTarget.dataset.index;
    const history = getStorageData(STORAGE_KEYS.HISTORY, []);
    
    wx.showModal({
      title: '提示',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          history.splice(index, 1);
          setStorageData(STORAGE_KEYS.HISTORY, history);
          this.setData({
            historyList: history,
            isEmpty: history.length === 0
          });
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 跳转到题目详情
  goToQuestionDetail: function(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: `/pages/questionDetail/questionDetail?id=${item.id}&bankId=${item.bankId}`
    });
  }
});