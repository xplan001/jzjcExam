// 题目详情页面逻辑
Page({
  // 验证选项格式是否有效
  validateOptions: function(options) {
    if (!Array.isArray(options) || options.length === 0) {
      console.error('选项数据无效，必须是非空数组');
      return false;
    }
    // 检查每个选项是否有效
    return options.every(option => typeof option === 'string' && option.trim().length > 0);
  },

  // 解析多选题答案
  parseMultipleChoiceAnswer: function(answer, options) {
    if (!answer || !this.validateOptions(options)) return [];
    console.log(`解析多选题答案: answer=${JSON.stringify(answer)}, options=${JSON.stringify(options)}`);

    // 处理answer为数组的情况
    if (Array.isArray(answer)) {
      console.log('答案为数组格式');
      return answer.map(item => {
        // 处理字符串格式（如'A'、'B'）
        if (typeof item === 'string' && item.length === 1) {
          const index = item.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
          console.log(`数组项为字母${item}，转换为索引${index}`);
          return index >= 0 && index < options.length ? index : null;
        }
        // 处理数字索引
        if (typeof item === 'number' && item >= 0 && item < options.length) {
          console.log(`数组项为数字索引${item}`);
          return item;
        }
        console.warn(`数组项${item}格式无效，忽略`);
        return null;
      }).filter(val => val !== null);
    }

    // 处理answer为字符串的情况
    if (typeof answer === 'string') {
      console.log('答案为字符串格式');
      // 去除所有空格
      const cleanAnswer = answer.replace(/\s+/g, '');
      console.log(`清理后答案: ${cleanAnswer}`);

      // 支持多种格式：'1010'格式、'A,B,C'格式、'ABC'格式
      if (/^[01]+$/.test(cleanAnswer)) {
        // '1010'格式：1表示选中，0表示未选中
        console.log('答案为1010格式');
        return cleanAnswer.split('').map((char, index) => {
          return char === '1' && index < options.length ? index : null;
        }).filter(val => val !== null);
      } else if (cleanAnswer.includes(',')) {
        // 'A,B,C'格式：按逗号分割
        console.log('答案为逗号分隔格式');
        return cleanAnswer.split(',').map(item => {
          item = item.toUpperCase();
          if (item.length === 1 && item >= 'A' && item <= 'Z') {
            const index = item.charCodeAt(0) - 'A'.charCodeAt(0);
            console.log(`逗号项${item}转换为索引${index}`);
            return index < options.length ? index : null;
          }
          console.warn(`逗号项${item}格式无效，忽略`);
          return null;
        }).filter(val => val !== null);
      } else if (/^[A-Za-z]+$/.test(cleanAnswer)) {
        // 'ABC'格式：直接转换每个字符
        console.log('答案为连续字母格式');
        return cleanAnswer.toUpperCase().split('').map(char => {
          const index = char.charCodeAt(0) - 'A'.charCodeAt(0);
          console.log(`字母${char}转换为索引${index}`);
          return index >= 0 && index < options.length ? index : null;
        }).filter(val => val !== null);
      } else {
        console.error(`无法解析答案格式: ${answer}`);
        return [];
      }
    }
    console.error(`答案类型无效: ${typeof answer}`);
    return [];
  },

  // 解析判断题答案
  parseJudgmentAnswer: function(answer, options) {
    if (!answer || !this.validateOptions(options) || options.length < 2) {
      console.error('判断题选项数据无效，必须至少包含两个选项');
      return 0; // 默认返回第一个选项
    }

    // 确保答案是字符串类型
    const answerStr = String(answer || '').trim();
    console.log(`解析判断题答案: 原始答案=${answer}, 转换后=${answerStr}`);
    
    if (!answerStr) {
      console.warn('判断题答案为空，使用默认索引0');
      return 0;
    }

    const answerLetter = answerStr.toUpperCase();
    let answerIndex = -1;

    // 直接匹配A或B，这是最可靠的来源
    if (answerLetter === 'A') {
      answerIndex = 0;
    } else if (answerLetter === 'B') {
      answerIndex = 1;
    } else {
      console.warn(`判断题答案字母${answerLetter}无效，使用默认索引0`);
      answerIndex = 0;
    }

    console.log(`判断题答案解析完成: ${answerStr} -> 索引${answerIndex}`);
    return answerIndex;
  },


  data: {
    question: {},
    isFavorite: false,
    isMultipleChoice: false,
    isJudgment: false,
    selectedOption: -1,
    selectedOptions: [],
    selectedOptionsMap: {},
    answered: false,
    showAnalysis: false,
    correctOptions: [],
    formattedAnswer: '',
    bankId: null,
    currentQuestionIndex: 1,
    totalQuestions: 0
  },

  onLoad: function(options) {
    const questionId = parseInt(options.id);
    let bankId = parseInt(options.bankId);
    
    // 确保bankId是有效数字
    if (isNaN(bankId)) {
      console.error('bankId无效，使用默认值1');
      bankId = 1; // 设置默认值
    }
    
    console.log(`页面加载: questionId=${questionId}, bankId=${bankId}`);
    this.setData({ bankId: bankId });
    this.loadQuestionData(questionId, bankId);
    this.checkFavoriteStatus(questionId);
  },

  onReady: function() {
    // 页面渲染完成后检查数据状态
    console.log(`页面渲染完成，当前数据状态: currentQuestionIndex=${this.data.currentQuestionIndex}, totalQuestions=${this.data.totalQuestions}`);
    
    // 如果totalQuestions为0，尝试重新设置
    if (this.data.totalQuestions === 0 && this.bankQuestions && this.bankQuestions.length > 0) {
      console.log('检测到totalQuestions为0，重新设置数据');
      this.setData({
        totalQuestions: this.bankQuestions.length
      });
    }
  },

  // 加载题目数据（重构后）
  loadQuestionData: function(id, bankId) {
    console.log(`[Refactored] 加载题目数据，ID: ${id}, bankId: ${bankId}`);
    
    // 始终从原始JS模块加载，以绕过所有缓存问题
    try {
      if (isNaN(bankId)) {
        console.warn(`bankId无效 (${bankId})，使用默认值1`);
        bankId = 1;
      }
      const subjectData = require(`../../data/subject${bankId}.js`);
      this.continueLoadQuestionData(id, bankId, subjectData);
    } catch (err) {
      console.error(`[Refactored] 从JS模块加载题库数据失败 (bankId: ${bankId})`, err);
      let errorMsg = '加载题库数据失败';
      if (err.message.includes('MODULE_NOT_FOUND')) {
        errorMsg = '题库文件不存在';
      }
      wx.showToast({ title: errorMsg, icon: 'none', duration: 2000 });
    }
  },

  // 数据处理主流程（重构后）
  continueLoadQuestionData: function(id, bankId, currentBankData) {
    if (!Array.isArray(currentBankData)) {
      console.error(`[Refactored] 题库${bankId}数据无效`);
      return;
    }

    // 查找题目，优先使用索引（id-1），因为这通常是列表点击的来源
    const questionIndex = id - 1;
    let question = (questionIndex >= 0 && questionIndex < currentBankData.length) ? currentBankData[questionIndex] : null;

    // 如果索引查找失败，回退到按ID查找
    if (!question) {
      console.warn(`[Refactored] 索引查找失败 (index: ${questionIndex})，回退到ID查找`);
      question = currentBankData.find(q => q.id === id);
    }

    // 如果仍然找不到，显示错误并使用默认题目
    if (!question) {
      console.error(`[Refactored] 最终未找到题目: ID=${id}`);
      wx.showToast({ title: '题目加载失败', icon: 'none' });
      question = { id: id, type: 'single', question: '题目加载失败', options: [], answer: '', analysis: '请返回重试' };
    }

    // 保存当前题库数据用于导航
    this.bankQuestions = currentBankData;

    // 更新题目进度
    const currentIndex = this.bankQuestions.findIndex(q => q.id === question.id);
    this.setData({
      currentQuestionIndex: currentIndex >= 0 ? currentIndex + 1 : 1,
      totalQuestions: this.bankQuestions.length
    });

    // 检查收藏状态
    this.checkFavoriteStatus(question.id);

    // 将原始题目数据送入核心处理函数
    this.processQuestionData(question);
  },

  // 核心题目处理与标准化函数（最终重构）
  processQuestionData: function(question) {
    console.log(`[Final-Refactor] Processing ID=${question.id}`, question);

    // 验证和清理选项数据
    if (question.options && Array.isArray(question.options)) {
      console.log('原始选项数据:', question.options);
      
      // 检查选项是否被污染（包含题目内容或过长文本）
      const cleanOptions = question.options.filter(option => {
        const optionStr = String(option || '').trim();
        // 过滤掉明显是题目内容的选项，但保留正常的专业术语
        const isValid = optionStr.length > 0 && 
                       optionStr.length < 300 && 
                       !optionStr.includes('？') && 
                       !optionStr.includes('?') &&
                       !optionStr.includes('单选题') &&
                       !optionStr.includes('多选题') &&
                       !optionStr.includes('判断题') &&
                       // 只过滤明显包含完整题目描述的选项
                       !(optionStr.includes('作为') && optionStr.includes('检验') && optionStr.includes('控制指标'));
        
        if (!isValid) {
          console.warn('发现无效选项:', optionStr);
        }
        return isValid;
      });
      
      if (cleanOptions.length !== question.options.length) {
        console.warn(`选项数据被污染，原始${question.options.length}个，清理后${cleanOptions.length}个`);
        question.options = cleanOptions;
      }
      
      console.log('清理后选项数据:', question.options);
    }

    // 步骤1：根据最可靠的数据源确定题型标志
    const isMultipleChoice = Array.isArray(question.answer);
    const isJudgment = question.type === 'judgment';

    // 步骤2：根据标志确定用于显示的题型字符串
    let displayType = '单选题';
    if (isMultipleChoice) {
      displayType = '多选题';
    } else if (isJudgment) {
      displayType = '判断题';
    }
    
    const processedQuestion = { ...question, type: displayType };
    console.log(`[Final-Refactor] Determined type: ${displayType}`);

    // 步骤3：根据可靠的标志计算正确答案和格式化文本
    let formattedAnswer = '';
    let correctOptions = [];

    if (isMultipleChoice) {
      if (this.validateOptions(processedQuestion.options)) {
        correctOptions = this.parseMultipleChoiceAnswer(processedQuestion.answer, processedQuestion.options);
        formattedAnswer = correctOptions.map(opt => String.fromCharCode(65 + opt)).join('、');
      }
    } else if (isJudgment) {
      if (this.validateOptions(processedQuestion.options) && processedQuestion.options.length >= 2) {
        const answerIndex = this.parseJudgmentAnswer(processedQuestion.answer, processedQuestion.options);
        correctOptions = [answerIndex];
        formattedAnswer = answerIndex === 0 ? '对' : '错';
      }
    } else { // 单选题
      if (this.validateOptions(processedQuestion.options)) {
        const answerLetter = String(processedQuestion.answer || 'A').trim().toUpperCase();
        let answerIndex = answerLetter.charCodeAt(0) - 'A'.charCodeAt(0);
        if (answerIndex < 0 || answerIndex >= processedQuestion.options.length) {
          answerIndex = 0;
        }
        correctOptions = [answerIndex];
        formattedAnswer = String.fromCharCode(65 + answerIndex);
      }
    }

    console.log('最终处理结果:', {
      题型: displayType,
      选项数量: processedQuestion.options ? processedQuestion.options.length : 0,
      正确选项索引: correctOptions,
      格式化答案: formattedAnswer
    });

    // 步骤4：一次性设置所有数据，并重置状态
    this.setData({
      question: processedQuestion,
      isMultipleChoice: isMultipleChoice,
      isJudgment: isJudgment,
      formattedAnswer: formattedAnswer,
      correctOptions: correctOptions,
      answered: false,
      showAnalysis: false,
      selectedOption: -1,
      selectedOptions: [],
      selectedOptionsMap: {}
    });
  },

  // 检查收藏状态
  // 检查收藏状态
  checkFavoriteStatus: function(id) {
    // 初始化收藏Map缓存
    if (!this.favoritesMap) {
      this.initFavoritesMap();
    }

    // 使用Map快速查找
    const key = `${id}_${this.data.bankId}`;
    const isFavorite = this.favoritesMap.has(key);

    this.setData({
      isFavorite: isFavorite
    });
  },

  // 初始化收藏Map缓存
  initFavoritesMap: function() {
    const favorites = wx.getStorageSync('favorites') || [];
    this.favoritesMap = new Map();

    // 将收藏数据加载到Map
    favorites.forEach(f => {
      const key = `${f.id}_${f.bankId}`;
      this.favoritesMap.set(key, true);
    });
  },

  // 切换答案解析显示状态
  toggleAnalysis: function() {
    this.setData({
      showAnalysis: !this.data.showAnalysis
    });
  },

  // 切换收藏状态
  toggleFavorite: function() {
    const favorites = wx.getStorageSync('favorites') || [];
    const question = this.data.question;
    const isFavorite = this.data.isFavorite;
    const key = `${question.id}_${this.data.bankId}`;

    if (isFavorite) {
      // 取消收藏
      const newFavorites = favorites.filter(f => 
        !(f.id === question.id && f.bankId === this.data.bankId)
      );
      wx.setStorageSync('favorites', newFavorites);
      
      // 更新Map缓存
      if (this.favoritesMap) {
        this.favoritesMap.delete(key);
      }
      
      this.setData({ isFavorite: false });
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      // 添加收藏
      const newFavorite = {
        id: question.id,
        bankId: this.data.bankId,
        question: question.question,
        type: question.type,
        timestamp: new Date().getTime()
      };
      favorites.push(newFavorite);
      wx.setStorageSync('favorites', favorites);
      
      // 更新Map缓存
      if (this.favoritesMap) {
        this.favoritesMap.set(key, true);
      }
      
      this.setData({ isFavorite: true });
      wx.showToast({ title: '收藏成功', icon: 'success' });
    }
  },

  // 选择选项
  // 触摸事件 - 开始
  touchStart: function(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartTime = Date.now();
  },

  // 触摸事件 - 移动
  touchMove: function(e) {
    if (e.touches.length > 0) {
      this.touchMoveX = e.touches[0].clientX;
    }
  },

  // 触摸事件 - 结束
  touchEnd: function() {
    const touchStartX = this.touchStartX;
    const touchMoveX = this.touchMoveX;
    const touchStartTime = this.touchStartTime;
    
    if (touchStartX !== undefined && touchMoveX !== undefined) {
      const diffX = touchMoveX - touchStartX;
      const diffTime = Date.now() - touchStartTime;
      const threshold = 50; // 滑动阈值
      
      // 判断是否为有效滑动手势
      if (Math.abs(diffX) > threshold && diffTime < 500) {
        if (diffX > 0) {
          // 向右滑动，上一题
          this.goToPrevQuestion();
        } else if (diffX < -threshold) {
          // 向左滑动，下一题
          this.goToNextQuestion();
        }
      }
    }
    
    // 重置触摸数据
    this.touchStartX = undefined;
    this.touchMoveX = undefined;
    this.touchStartTime = undefined;
  },

  // 修复判断题答案处理

  selectOption: function(e) {
    if (this.data.answered) return;
    const index = parseInt(e.currentTarget.dataset.index);
    const { isMultipleChoice } = this.data;

    if (isMultipleChoice) {
      const selectedOptions = [...this.data.selectedOptions];
      const selectedOptionsMap = { ...this.data.selectedOptionsMap };
      const optionIndex = selectedOptions.indexOf(index);

      if (optionIndex > -1) {
        selectedOptions.splice(optionIndex, 1);
        delete selectedOptionsMap[index];
      } else {
        selectedOptions.push(index);
        selectedOptionsMap[index] = true;
      }
      selectedOptions.sort((a, b) => a - b);
      this.setData({
        selectedOptions: selectedOptions,
        selectedOptionsMap: selectedOptionsMap
      });
    } else { // 单选题和判断题的逻辑相同
      this.setData({
        selectedOption: index
      });
    }
  },


  // 提交答案
  submitAnswer: function() {
    // 检查是否选择了答案
    const questionType = this.data.question.type;
    let isAnswered = false;

    if (questionType === '单选题' || questionType === '判断题') {
      isAnswered = this.data.selectedOption !== -1;
    } else if (questionType === '多选题') {
      isAnswered = this.data.selectedOptions.length > 0;
    }

    if (!isAnswered) {
      wx.showToast({
        title: '请先回答问题',
        icon: 'none'
      });
      return;
    }

    // 记录答题历史
    this.recordHistory();

    this.setData({
      answered: true
    });
  },

  // 记录答题历史
  recordHistory: function() {
    const history = wx.getStorageSync('history') || [];
    const question = this.data.question;
    
    // 获取题库名称
    const bankNames = {
      1: '科目一',
      2: '科目二',
      3: '科目三',
      4: '科目四'
    };
    const bankName = bankNames[this.data.bankId] || '未知题库';
    
    // 判断是否正确
    let isCorrect = false;
    let userAnswer = '';
    
    if (question.type === '多选题') {
      // 重新解析正确选项，确保使用最新逻辑
      const parsedCorrectOptions = this.parseMultipleChoiceAnswer(question.answer, question.options);
      console.log(`重新解析多选题正确选项: ${JSON.stringify(parsedCorrectOptions)}`);
      const formattedAnswer = parsedCorrectOptions.map(opt => String.fromCharCode(65 + opt)).join('、');
      console.log(`格式化正确答案: ${formattedAnswer}`);
      // 多选题需要检查所有选项是否匹配
      const selectedOptions = this.data.selectedOptions || [];
      console.log(`用户选择选项索引: ${JSON.stringify(selectedOptions)}`);
      // 确保两个数组都是有效的
      if (!Array.isArray(selectedOptions) || !Array.isArray(parsedCorrectOptions)) {
        console.error('多选题选项数据格式错误');
        isCorrect = false;
      } else {
        // 排序后比较
        const sortedSelected = [...selectedOptions].sort((a, b) => a - b);
        const sortedCorrect = [...parsedCorrectOptions].sort((a, b) => a - b);
        // 增加详细调试日志
        console.log(`多选题判断: 正确选项索引=${JSON.stringify(parsedCorrectOptions)}, 用户选择索引=${JSON.stringify(selectedOptions)}`);
        console.log(`排序后正确选项=${JSON.stringify(sortedCorrect)}, 排序后用户选择=${JSON.stringify(sortedSelected)}`);
        // 使用数组长度和每个元素比较
        isCorrect = sortedSelected.length === sortedCorrect.length &&
                    sortedSelected.every((value, index) => value === sortedCorrect[index]);
        console.log(`多选题判断结果: ${isCorrect}`);
        // 显示正确答案提示
        if (!isCorrect) {
          const correctAnswersText = parsedCorrectOptions.map(index => question.options[index]).join('、');
          console.log(`正确答案: ${correctAnswersText}`);
        }
      }
      userAnswer = selectedOptions.map(index => question.options[index]).join('、');
      // 显示正确答案提示
      if (!isCorrect) {
        const correctAnswers = parsedCorrectOptions.map(index => question.options[index]).join('、');
        console.log(`正确答案: ${correctAnswers}`);
      }
    } else if (question.type === '单选题') {
      // 单选题判断逻辑
      const correctOptions = this.data.correctOptions || [];
      let correctOption = -1;
      if (correctOptions.length > 0) {
        correctOption = correctOptions[0]; // 单选题只有一个正确选项
      } else {
        // 如果correctOptions为空，尝试重新解析答案
        console.warn('correctOptions为空，尝试重新解析答案');
        const answerStr = String(question.answer || 'A').trim();
        const answerLetter = answerStr.toUpperCase();
        correctOption = answerLetter.charCodeAt(0) - 'A'.charCodeAt(0);
        // 确保索引在有效范围内
        if (correctOption < 0 || correctOption >= question.options.length) {
          console.error(`答案字母${answerLetter}超出选项范围，使用默认索引0`);
          correctOption = 0;
        }
      }
      const selectedOption = this.data.selectedOption;
      isCorrect = selectedOption === correctOption;
      
      // 详细调试信息
      console.log(`单选题判断: 正确选项索引=${correctOption}, 正确选项=${question.options[correctOption] || '无效选项'}`);
      console.log(`单选题判断: 用户选择索引=${selectedOption}, 用户选择=${question.options[selectedOption] || '无效选项'}`);
      console.log(`单选题判断结果: ${isCorrect}`);
      
      userAnswer = question.options[selectedOption];
    } else if (question.type === '判断题') {
      // 判断题判断逻辑
      const correctOptions = this.data.correctOptions || [];
      const correctOption = correctOptions.length > 0 ? correctOptions[0] : -1;
      const selectedOption = this.data.selectedOption;
      isCorrect = selectedOption === correctOption;
      
      // 详细调试信息
      console.log(`判断题判断: 正确选项索引=${correctOption}`);
      console.log(`判断题判断: 用户选择索引=${selectedOption}`);
      console.log(`判断题判断结果: ${isCorrect}`);
      
      userAnswer = selectedOption === 0 ? '对' : '错';
    }
    
    // 格式化时间
    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`;
    
    // 添加到历史记录
    history.unshift({
      id: question.id,
      bankId: this.data.bankId,
      bankName: bankName,
      questionText: question.question,
      type: question.type,
      userAnswer: userAnswer,
      isCorrect: isCorrect,
      timestamp: now.getTime(),
      timeStr: `${dateStr} ${timeStr}`
    });
    
    // 只保留最近100条记录
    const maxHistory = 100;
    const trimmedHistory = history.slice(0, maxHistory);
    wx.setStorageSync('history', trimmedHistory);
    
    // 显示答题结果
    wx.showToast({
      title: isCorrect ? '回答正确' : '回答错误',
      icon: isCorrect ? 'success' : 'none'
    });
  },

  // 更新题目位置信息
  updateQuestionPosition: function() {
    const bankQuestions = this.bankQuestions || [];
    const totalCount = bankQuestions.length;
    
    // 如果没有题库数据，尝试重新获取
    if (totalCount === 0) {
      console.warn('题库数据为空，无法更新题目位置信息');
      return;
    }
    
    // 获取当前题目在页面数据中的位置信息
    let currentIndex = this.data.currentQuestionIndex - 1; // 转换为从0开始的索引
    
    // 如果当前索引无效，尝试重新计算
    if (currentIndex < 0 || currentIndex >= totalCount) {
      const currentId = this.data.question.id;
      currentIndex = bankQuestions.findIndex(q => q.id === currentId);
      if (currentIndex === -1) {
        currentIndex = 0; // 默认为第一题
      }
    }
    
    console.log(`更新题目进度: 当前索引=${currentIndex}, 题目位置=${currentIndex + 1}, 总题数=${totalCount}`);
    
    this.setData({
      currentQuestionIndex: currentIndex + 1, // 题目位置从1开始
      totalQuestions: totalCount
    }, () => {
      console.log(`题目进度更新完成: 第${this.data.currentQuestionIndex}题/共${this.data.totalQuestions}题`);
    });
  },

  // 上一题
  goToPrevQuestion: function() {
    const currentIndex = this.data.currentQuestionIndex - 1; // 当前显示的题目位置（从1开始）
    const prevIndex = currentIndex - 1; // 上一题的位置（从0开始）
    const prevOriginalId = prevIndex + 1; // 上一题的原始ID（从1开始）

    console.log(`上一题导航: 当前位置=${currentIndex + 1}, 上一题位置=${prevIndex + 1}, 上一题原始ID=${prevOriginalId}`);

    if (prevIndex >= 0) {
      this.resetQuestionState();
      this.loadQuestionData(prevOriginalId, this.data.bankId);
      this.checkFavoriteStatus(prevOriginalId);
    } else {
      wx.showToast({
        title: '已经是第一题了',
        icon: 'none'
      });
    }
  },

  // 下一题
  goToNextQuestion: function() {
    const currentIndex = this.data.currentQuestionIndex - 1; // 当前显示的题目位置（从1开始转为从0开始）
    const nextIndex = currentIndex + 1; // 下一题的位置（从0开始）
    const nextOriginalId = nextIndex + 1; // 下一题的原始ID（从1开始）
    const totalQuestions = this.data.totalQuestions;

    console.log(`下一题导航: 当前位置=${currentIndex + 1}, 下一题位置=${nextIndex + 1}, 下一题原始ID=${nextOriginalId}, 题库总数=${totalQuestions}`);

    if (nextIndex < totalQuestions) {
      this.resetQuestionState();
      this.loadQuestionData(nextOriginalId, this.data.bankId);
      this.checkFavoriteStatus(nextOriginalId);
    } else {
      wx.showToast({
        title: '已经是最后一题了',
        icon: 'none'
      });
    }
  },

  // 重置题目相关状态
  resetQuestionState: function() {
    this.setData({
      selectedOption: -1,
      selectedOptions: [],
      selectedOptionsMap: {},
      answered: false,
      showAnalysis: false
    });
  }
});
