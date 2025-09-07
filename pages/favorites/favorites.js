const common = require('../../utils/common.js');
const { STORAGE_KEYS, BANK_NAMES, getStorageData, setStorageData } = common;

Page({
  data: {
    favorites: [], // 收藏列表
    isEmpty: true // 是否为空
  },

  onLoad() {
    // 初始化收藏Map，用于快速查找
    this.favoritesMap = new Map();
    this.loadFavorites();
  },

  // 加载收藏列表
  loadFavorites() {
    try {
      // 确保favoritesMap已初始化
      if (!this.favoritesMap) {
        this.favoritesMap = new Map();
      }
      
      // 检查本地存储是否可用
      const storageAvailable = typeof wx.getStorageSync === 'function';
      console.log('本地存储是否可用:', storageAvailable);
      
      let favorites = getStorageData(STORAGE_KEYS.FAVORITES, []);
      console.log('加载收藏数据:', favorites);
      console.log('收藏数据数量:', favorites.length);
      
      // 更新收藏Map
      this.favoritesMap.clear();

      // 自动补全question字段，兼容require导出为default的情况，并写回本地缓存
      let hasPatched = false;
      favorites = favorites.map(item => {
        // 添加到Map
        const uniqueKey = `${item.id}-${item.bankId}`;
        this.favoritesMap.set(uniqueKey, true);
        if ((!item.question && !item.questionText) || item.question === '未知题目' || item.questionText === '未知题目') {
          try {
            const bankId = item.bankId || 1;
            let subjectData = [];
            try {
              let mod = require(`../../data/subject${bankId}.js`);
              subjectData = Array.isArray(mod) ? mod : (mod && Array.isArray(mod.default) ? mod.default : []);
            } catch (e) {}
            if (Array.isArray(subjectData)) {
              const found = subjectData.find(q => String(q.id) === String(item.id));
              if (found && found.question) {
                item.question = found.question;
                item.questionText = found.question;
                hasPatched = true;
              }
            }
          } catch (e) {}
        }
        return {
          ...item,
          uniqueKey: `${item.id}-${item.bankId}`
        };
      });
      // 如果有修正，写回本地缓存，保证下次直接显示
      if (hasPatched) {
        setStorageData(STORAGE_KEYS.FAVORITES, favorites.map(({uniqueKey, ...rest}) => rest));
      }

      // 按时间倒序排序
      favorites.sort((a, b) => b.timestamp - a.timestamp);

      // 强制更新数据
      this.setData({
        favorites: [...favorites], // 创建新数组触发更新
        isEmpty: favorites.length === 0
      }, () => {
        console.log('收藏数据更新成功:', this.data.favorites);
        console.log('isEmpty状态:', this.data.isEmpty);
        console.log('列表项数量:', this.data.favorites.length);
      });
    } catch (error) {
      console.error('加载收藏数据出错:', error);
      // 出错时也设置为空状态
      this.setData({
        favorites: [],
        isEmpty: true
      });
    }
  },

  // 跳转到题目详情
  goToQuestionDetail(e) {
    const dataset = e.currentTarget.dataset;
    const questionId = dataset.id;
    const bankIdValue = dataset.bankId || 1;
    
    console.log('收藏页面跳转参数:', dataset);
    
    wx.navigateTo({
      url: `/pages/questionDetail/questionDetail?id=${questionId}&bankId=${bankIdValue}`
    });
  },

  // 取消收藏
  removeFavorite(e) {
    const { index } = e.currentTarget.dataset;
    const { favorites } = this.data;
    
    // 从Map中移除
    if (favorites[index]) {
      const uniqueKey = `${favorites[index].id}-${favorites[index].bankId}`;
      this.favoritesMap.delete(uniqueKey);
    }
    
    // 从收藏列表中移除
    favorites.splice(index, 1);
    setStorageData(STORAGE_KEYS.FAVORITES, favorites);
    
    // 更新UI
    this.setData({
      favorites,
      isEmpty: favorites.length === 0
    });
    
    wx.showToast({
      title: '已取消收藏',
      icon: 'success'
    });
  },

  // 一键清除
  clearAllFavorites() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有收藏吗？',
      success: (res) => {
        if (res.confirm) {
          setStorageData(STORAGE_KEYS.FAVORITES, []);
          this.favoritesMap.clear();
          this.setData({
            favorites: [],
            isEmpty: true
          });
          wx.showToast({
            title: '已清空收藏',
            icon: 'success'
          });
        }
      }
    });
  },

  onShow() {
    console.log('收藏页面显示，重新加载数据');
    this.loadFavorites();
  },

  // 调试函数：检查收藏数据
  debugFavoritesData() {
    try {
      // 获取原始收藏数据
      const rawFavorites = getStorageData(STORAGE_KEYS.FAVORITES, []);
      console.log('原始收藏数据长度:', rawFavorites.length);
      console.log('原始收藏数据:', rawFavorites);
      console.log('收藏Map大小:', this.favoritesMap.size);

      // 检查是否有收藏项缺少必要字段
      const invalidItems = rawFavorites.filter(item => !item.question || !item.id || !item.bankId);
      console.log('无效的收藏项数量:', invalidItems.length);
      console.log('无效的收藏项:', invalidItems);

      // 显示调试信息
      wx.showModal({
        title: '调试信息',
        content: `收藏总数: ${rawFavorites.length}\n无效收藏数: ${invalidItems.length}\n请查看控制台获取详细信息`,
        showCancel: false
      });
    } catch (error) {
      console.error('调试收藏数据出错:', error);
      wx.showToast({
        title: '调试失败',
        icon: 'none'
      });
    }
  },
  
  // 判断题目是否已收藏
  isFavorite(id, bankId) {
    const uniqueKey = `${id}-${bankId}`;
    return this.favoritesMap.has(uniqueKey);
  }
});
