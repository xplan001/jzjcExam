/**
 * 通用工具函数和常量
 */

// 存储键名常量
const STORAGE_KEYS = {
  QUESTION_DATA: 'questionData',
  FAVORITES: 'favorites',
  HISTORY: 'history',
  HISTORY_SEARCHES: 'historySearches',
  COMPLETED_QUESTIONS: 'completedQuestions',
  USER_INFO: 'userInfo',
  LOGS: 'logs',
  ALL_QUESTIONS: 'allQuestions'
};

// 题库名称映射
const BANK_NAMES = {
  1: '科目一',
  2: '科目二',
  3: '科目三',
  4: '科目四'
};

// 题库名称别名映射（用于显示）
const BANK_ALIASES = {
  '科目一': '主',
  '科目二': '基',
  '科目三': '钢',
  '科目四': '桥'
};

// 数据版本控制
const DATA_VERSION = 1;

// 日志级别
const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// 当前日志级别
let currentLogLevel = LOG_LEVEL.INFO;

/**
 * 格式化当前时间
 * @returns {Object} 包含格式化的时间字符串
 */
function formatCurrentTime() {
  const now = new Date();
  const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`;
  return {
    timeStr: `${dateStr} ${timeStr}`,
    dateStr,
    timestamp: now.getTime()
  };
}

/**
 * 安全获取存储数据
 * @param {string} key 存储键名
 * @param {any} defaultValue 默认值
 * @returns {any} 存储数据或默认值
 */
function getStorageData(key, defaultValue = null) {
  try {
    const data = wx.getStorageSync(key);
    if (data === undefined || data === null || data === '') {
      return defaultValue;
    }
    return data;
  } catch (error) {
    console.error(`获取存储数据失败: ${key}`, error);
    return defaultValue;
  }
}

/**
 * 安全设置存储数据
 * @param {string} key 存储键名
 * @param {any} data 要存储的数据
 * @returns {boolean} 是否成功
 */
function setStorageData(key, data) {
  try {
    wx.setStorageSync(key, data);
    return true;
  } catch (error) {
    console.error(`设置存储数据失败: ${key}`, error);
    return false;
  }
}

/**
 * 防抖函数
 * @param {Function} func 要执行的函数
 * @param {number} wait 等待时间(ms)
 * @returns {Function} 防抖处理后的函数
 */
function debounce(func, wait = 300) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * 加载所有题库数据
 * @returns {Object} 合并后的题库数据
 */
function loadAllQuestionData() {
  try {
    // 先尝试从本地存储获取
    let questionData = getStorageData(STORAGE_KEYS.QUESTION_DATA);
    if (!questionData || Object.keys(questionData).length === 0) {
      try {
        const s1 = require('../data/subject1.js');
        const s2 = require('../data/subject2.js');
        const s3 = require('../data/subject3.js');
        const s4 = require('../data/subject4.js');
        questionData = { subject1: s1, subject2: s2, subject3: s3, subject4: s4 };
        setStorageData(STORAGE_KEYS.QUESTION_DATA, questionData);
        console.log('题库数据加载成功（JS模块）');
      } catch (moduleErr) {
        console.error('加载题库模块失败，尝试使用默认数据', moduleErr);
        // 使用默认数据
        questionData = {
          "subject1": [
            {
              "id": 1,
              "type": "single",
              "question": "作为检验填土压实质量控制指标的是？",
              "options": ["土的可松性","土的密度","土的压缩比","土的干密度"],
              "answer": "D",
              "analysis": ""
            },
            {
              "id": 2,
              "type": "multiple",
              "question": "影响低应变桩身阻抗的因素有？",
              "options": ["桩身截面","桩材料密度","力锤和锤垫组合的激振频率","桩材料中波速","桩身长度"],
              "answer": ["A","B","C","D"],
              "analysis": ""
            },
            {
              "id": 3,
              "type": "single",
              "question": "低应变反射波法检测桩身完整性时，当桩身截面突变时，反射波的特征是？",
              "options": ["截面增大，反射波为正波","截面增大，反射波为负波","截面减小，反射波为正波","截面减小，反射波为负波"],
              "answer": "C",
              "analysis": ""
            }
          ],
          "subject2": [],
          "subject3": []
        };
        setStorageData(STORAGE_KEYS.QUESTION_DATA, questionData);
      }
    }
    return questionData;
  } catch (err) {
    console.error('题库数据加载失败', err);
    return {};
  }
}

/**
 * 创建搜索索引
 * @param {Object} questionData 题库数据
 * @returns {Array} 扁平化的题目数组，仅包含搜索需要的字段
 */
function createSearchIndex(questionData) {
  const searchIndex = [];
  let globalId = 1; // 使用全局递增ID，与initStorageData保持一致
  
  // 遍历所有题库，收集所有题目
  for (const bankKey in questionData) {
    if (Array.isArray(questionData[bankKey])) {
      const bankId = parseInt(bankKey.replace('subject', ''));
      questionData[bankKey].forEach(question => {
        if (question && question.question) {
          searchIndex.push({
            id: globalId++, // 使用递增的全局ID
            bankId: bankId,
            question: question.question,
            type: question.type === 'single' ? '单选题' : question.type === 'multiple' ? '多选题' : question.type === 'judgment' ? '判断题' : '简答题'
          });
        }
      });
    }
  }
  
  return searchIndex;
}

/**
 * 简单事件总线，用于跨页面通信
 */
const eventBus = {
  events: {},
  
  // 注册事件监听
  on: function(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  },
  
  // 触发事件
  emit: function(eventName, data) {
    const callbacks = this.events[eventName];
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in eventBus callback for ${eventName}:`, error);
        }
      });
    }
  },
  
  // 移除事件监听
  off: function(eventName, callback) {
    const callbacks = this.events[eventName];
    if (callbacks) {
      if (callback) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      } else {
        // 如果没有提供回调函数，则移除所有该事件的监听
        delete this.events[eventName];
      }
    }
  }
};

/**
 * 设置日志级别
 * @param {number} level 日志级别
 */
function setLogLevel(level) {
  if (level >= LOG_LEVEL.DEBUG && level <= LOG_LEVEL.ERROR) {
    currentLogLevel = level;
  }
}

/**
 * 日志函数
 * @param {string} message 日志消息
 * @param {number} level 日志级别
 */
function log(message, level = LOG_LEVEL.INFO) {
  if (level >= currentLogLevel) {
    switch (level) {
      case LOG_LEVEL.DEBUG:
        console.debug(message);
        break;
      case LOG_LEVEL.INFO:
        console.log(message);
        break;
      case LOG_LEVEL.WARN:
        console.warn(message);
        break;
      case LOG_LEVEL.ERROR:
        console.error(message);
        break;
    }
  }
}

/**
 * 清除缓存数据（用于修复数据问题）
 */
function clearCacheData() {
  try {
    wx.removeStorageSync(STORAGE_KEYS.ALL_QUESTIONS);
    wx.removeStorageSync(STORAGE_KEYS.QUESTION_DATA);
    console.log('缓存数据已清除');
    return true;
  } catch (error) {
    console.error('清除缓存数据失败:', error);
    return false;
  }
}

/**
 * 初始化本地存储数据
 */
function initStorageData() {
  try {
    // 清除旧的缓存数据以确保使用最新的题型转换逻辑
    clearCacheData();
    
    // 初始化题目数据
    if (!getStorageData(STORAGE_KEYS.ALL_QUESTIONS)) {
      // 加载题库数据
      const questionData = loadAllQuestionData();
      
      // 转换数据格式为统一格式
      const allQuestions = [];
      let id = 1;
      
      // 遍历所有题库
      for (const subjectKey in questionData) {
        if (questionData.hasOwnProperty(subjectKey)) {
          const subjectQuestions = questionData[subjectKey];
          const subjectId = parseInt(subjectKey.replace('subject', ''));
          
          // 遍历题库中的题目
          subjectQuestions.forEach(q => {
            // 添加统一格式的题目数据
            allQuestions.push({
              id: id++,
              subjectId: subjectId,
              question: q.question,
              type: q.type, // 保持原始类型，让题目详情页面进行标准化
              options: q.options,
              answer: q.answer,
              analysis: q.analysis || ''
            });
          });
        }
      }
      
      // 存储到本地缓存
      setStorageData(STORAGE_KEYS.ALL_QUESTIONS, allQuestions);
      log('题库数据初始化成功，共加载 ' + allQuestions.length + ' 道题目', LOG_LEVEL.INFO);
    }

    // 初始化收藏数据
    if (!getStorageData(STORAGE_KEYS.FAVORITES)) {
      setStorageData(STORAGE_KEYS.FAVORITES, []);
    }

    // 初始化历史记录
    if (!getStorageData(STORAGE_KEYS.HISTORY)) {
      setStorageData(STORAGE_KEYS.HISTORY, []);
    }
    
    // 初始化搜索历史
    if (!getStorageData(STORAGE_KEYS.HISTORY_SEARCHES)) {
      setStorageData(STORAGE_KEYS.HISTORY_SEARCHES, []);
    }
  } catch (err) {
    log('初始化本地存储数据失败: ' + err.message, LOG_LEVEL.ERROR);
    let errorMsg = '初始化数据失败';
    if (err.message.includes('storage')) {
      errorMsg = '本地存储初始化失败，请检查存储空间是否充足';
    } else if (err.message.includes('permission')) {
      errorMsg = '无权限访问本地存储，请确保小程序有存储权限';
    } else {
      errorMsg = '初始化数据失败：' + err.message.substring(0, 20);
    }
    wx.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 2000
    });
  }
}

module.exports = {
  STORAGE_KEYS,
  BANK_NAMES,
  BANK_ALIASES,
  DATA_VERSION,
  LOG_LEVEL,
  eventBus,
  formatCurrentTime,
  getStorageData,
  setStorageData,
  debounce,
  loadAllQuestionData,
  createSearchIndex,
  setLogLevel,
  log,
  initStorageData,
  clearCacheData
};
