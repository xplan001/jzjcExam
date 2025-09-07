// 题库详情页面逻辑
Page({
  data: {
    bankId: '',
    bankTitle: '',
    bankDescription: '',
    questionCount: 0,
    completedCount: 0,
    progress: 0,
    questions: [],
    loading: false // 添加loading属性，默认为false
  },

    onLoad: function(options) {
    // 获取传递过来的题库ID和标题
    const bankId = options.id;
    const bankTitle = decodeURIComponent(options.title);
    
      this.setData({
      bankId: bankId,
      bankTitle: bankTitle,
      loading: true // 设置加载状态为true
    });
    
    // 不需要存储整个题库数据，已从外部文件加载
    
    // 从JSON文件加载题库数据
    this.loadBankDataFromJson(bankId);
  },

  loadBankDataFromJson: function(bankId) {
    let bankDescription = '';
    
    // 根据bankId设置题库描述
      switch(bankId) {
      case '1':
        bankDescription = '专注于建筑结构检测的题目，包括混凝土、钢筋布置等核心概念。';
        break;
      case '2':
        bankDescription = '包括建筑基桩检测、土力学等相关题目，适合工程检测人员学习。';
        break;
      case '3':
        bankDescription = '包含钢结构检测相关知识，适合钢结构检测相关的工程师。';
        break;
      case '4':
        bankDescription = '包含桥梁检测的题目，适合桥梁检测相关的工程师。';
        break;
      default:
        bankDescription = '这是一个默认题库。';
    }

    // 读取对应的数据文件
    try {
      // 使用require加载JS模块文件
      // 使用静态映射解决动态require限制
      const subjectMap = {
        '1': require('../../data/subject1.js'),
        '2': require('../../data/subject2.js'),
        '3': require('../../data/subject3.js'),
        '4': require('../../data/subject4.js')
      };

      // 检查题库ID是否存在
      if (!subjectMap.hasOwnProperty(bankId)) {
        throw new Error(`题库ID ${bankId} 不存在`);
      }

      const subjectData = subjectMap[bankId];

      // 检查数据是否有效
      if (!Array.isArray(subjectData)) {
        throw new Error(`题库数据格式不正确，期望是数组但得到 ${typeof subjectData}`);
      }

      // 处理题目数据
      // 从本地存储加载已完成的题目和收藏列表（只加载一次）
      const completedQuestions = wx.getStorageSync('completedQuestions') || [];
      const favorites = wx.getStorageSync('favorites') || [];

      // 创建收藏状态哈希表，提高查找效率
      const favoriteMap = {};
      favorites.forEach(f => {
        favoriteMap[`${f.id}_${f.bankId}`] = true;
      });

      // 创建完成状态哈希表
      const completedMap = {};
      completedQuestions.forEach(c => {
        completedMap[`${c.id}_${c.bankId}`] = true;
      });

      const questions = subjectData.map(function(q) {
        // 检查收藏状态（O(1)复杂度）
        const isFavorited = !!favoriteMap[`${q.id}_${bankId}`];

        // 检查完成状态（O(1)复杂度）
        const isCompleted = !!completedMap[`${q.id}_${bankId}`];

        return {
          id: q.id,
          question: q.question,
          type: q.type === 'single' ? '单选题' : q.type === 'multiple' ? '多选题' : q.type === 'judgment' ? '判断题' : '简答题',
          options: q.options,
          answer: q.answer,
          completed: isCompleted,
          isFavorited: isFavorited
        };
      });

      // 计算进度
      const completedCount = questions.filter(q => q.completed).length;
      const progress = questions.length > 0 ? Math.round((completedCount / questions.length) * 100) : 0;

      this.setData({
        bankDescription: bankDescription,
        questions: questions,
        questionCount: questions.length,
        completedCount: completedCount,
        progress: progress,
        loading: false
      });
    } catch (err) {
      console.error('加载题库数据失败', err);
      let errorMsg = '加载题库数据失败';
      if (err.code === 'MODULE_NOT_FOUND') {
        errorMsg = '题库文件不存在，请检查题库ID是否正确';
      } else if (err.message.includes('不存在')) {
        errorMsg = err.message;
      } else if (err.message.includes('格式不正确')) {
        errorMsg = '题库数据格式不正确，请联系管理员';
      } else if (err.message.includes('permission')) {
        errorMsg = '无权限访问题库文件，请确保小程序有文件读取权限';
      } else {
        errorMsg = '加载题库数据失败：' + err.message.substring(0, 20);
      }
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });
      this.setData({
        loading: false
      });
    }
  },

  // 默认模拟数据加载
  loadDefaultBankData: function(bankId) {
    let bankDescription = '';
    let questions = [];

    // 从本地存储加载已完成的题目
    const completedQuestions = wx.getStorageSync('completedQuestions') || [];

    switch(bankId) {
      case '1':
        bankDescription = '专注于建筑结构检测的题目，包括混凝土、钢筋布置等核心概念。';
        questions = [
          { id: 1, question: '作为检验填土压实质量控制指标的是？', type: '单选题' },
          { id: 2, question: '影响低应变桩身阻抗的因素有？', type: '多选题' }
        ];
        break;
      case '2':
        bankDescription = '包括建筑基桩检测、土力学等相关题目，适合工程检测人员学习。';
        questions = [
          { id: 6, question: '混凝土强度等级的划分依据是什么？', type: '单选题' },
          { id: 7, question: '钢筋的屈服强度是指什么？', type: '单选题' }
        ];
        break;
      case '3':
        bankDescription = '包含钢结构检测相关知识，适合钢结构检测相关的工程师。';
        questions = [
          { id: 11, question: '钢结构焊接质量的检验方法有哪些？', type: '多选题' },
          { id: 12, question: '钢结构的锈蚀等级如何划分？', type: '简答题' }
        ];
        break;
      case '4':
        bankDescription = '包含桥梁检测的题目，适合桥梁检测相关的工程师。';
        questions = [
          { id: 16, question: '桥梁承载能力检测的主要方法有哪些？', type: '多选题' },
          { id: 17, question: '桥梁裂缝的成因主要有哪些？', type: '简答题' }
        ];
        break;
      default:
        bankDescription = '这是一个默认题库。';
        questions = [];
    }

    // 设置题目完成状态
    questions = questions.map(function(q) {
      const isCompleted = completedQuestions.some(c => 
        c.id === q.id && c.bankId === bankId
      );
      return Object.assign({}, q, { completed: isCompleted });
    });

    // 计算已完成题目数量和进度
    const completedCount = questions.filter(function(q) { return q.completed; }).length;
    const progress = questions.length > 0 ? Math.round((completedCount / questions.length) * 100) : 0;

    this.setData({
      bankDescription: bankDescription,
      questions: questions,
      questionCount: questions.length,
      completedCount: completedCount,
      progress: progress
    });
  },

  goToQuestionDetail: function(e) {
    const index = e.currentTarget.dataset.index;
    const question = this.data.questions[index];
    
    // 获取原始题目ID和bankId
    const bankId = this.data.bankId;
    const originalId = question.id;
    
    // 跳转到题目详情页，传递原始题目ID
    wx.navigateTo({
      url: `/pages/questionDetail/questionDetail?id=${originalId}&bankId=${bankId}`
    });
  },

  // 收藏/取消收藏题目
  toggleFavorite: function(e) {
    // 阻止事件冒泡，防止触发goToQuestionDetail
    e.stopPropagation();
    
    const index = e.currentTarget.dataset.index;
    const question = this.data.questions[index];
    const bankId = this.data.bankId;
    const questionId = question.id;
    
    // 获取收藏列表
    let favorites = wx.getStorageSync('favorites') || [];
    
    // 检查是否已收藏
    const isFavorited = favorites.some(f => 
      f.questionId === questionId && f.bankId === bankId
    );
    
    // 更新收藏状态
    if (isFavorited) {
      // 取消收藏
      favorites = favorites.filter(f => 
        !(f.questionId === questionId && f.bankId === bankId)
      );
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      // 添加收藏
      favorites.push({
        questionId: questionId,
        bankId: bankId,
        questionText: question.question,
        timestamp: Date.now()
      });
      wx.showToast({ title: '收藏成功', icon: 'success' });
    }
    
    // 保存更新后的收藏列表
    try {
      wx.setStorageSync('favorites', favorites);
      
      // 更新UI
      const questions = [...this.data.questions];
      questions[index].isFavorited = !isFavorited;
      this.setData({ questions });
    } catch (error) {
      console.error('更新收藏状态失败:', error);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

  refreshBankData: function() {
    // 刷新题库数据
    this.setData({
      loading: true
    });
    this.loadBankDataFromJson(this.data.bankId);
  },

  startPractice: function() {
    // 开始刷题，跳转到第一个未完成的题目
    const firstUncompleted = this.data.questions.find(function(q) { 
      return !q.completed; 
    });
    
    if (firstUncompleted) {
      wx.navigateTo({
        url: `/pages/questionDetail/questionDetail?id=${firstUncompleted.id}&bankId=${this.data.bankId}`
      });
    } else {
      // 所有题目都已完成，可以提示用户或重新开始
      wx.showToast({
        title: '所有题目已完成！',
        icon: 'success'
      });
    }
  }
});