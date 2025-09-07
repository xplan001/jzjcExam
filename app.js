// app.js
const common = require('./utils/common.js');
const { STORAGE_KEYS, BANK_ALIASES, initStorageData, getStorageData, setStorageData, log, LOG_LEVEL } = common;

App({
  config: {
    bankNameMap: BANK_ALIASES
  },
  /**
   * 当小程序初始化完成时，会触发 onLaunch（全局只触发一次）
   */
  onLaunch: function() {
    // 初始化本地存储数据
    initStorageData();

    // 展示本地存储能力
    const logs = getStorageData(STORAGE_KEYS.LOGS, []);
    logs.unshift(Date.now());
    setStorageData(STORAGE_KEYS.LOGS, logs);

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        log('登录成功，code: ' + res.code, LOG_LEVEL.INFO);
      }
    });

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              // 可以将 res 发送给后台解码出 unionId
              this.globalData.userInfo = res.userInfo;

              // 存储用户信息到本地
              setStorageData(STORAGE_KEYS.USER_INFO, res.userInfo);

              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res);
              }
              
              // 触发用户信息更新事件
              common.eventBus.emit('userInfoUpdated', res.userInfo);
            }
          });
        }
      }
    });
  },

  /**
   * 当小程序启动，或从后台进入前台显示，会触发 onShow
   */
  onShow: function(options) {

  },

  /**
   * 当小程序从前台进入后台，会触发 onHide
   */
  onHide: function() {

  },

  /**
   * 当小程序发生脚本错误，或者 api 调用失败时，会触发 onError 并带上错误信息
   */
  onError: function(msg) {

  },

  globalData: {
    userInfo: null,
    hasLogin: false,
    allQuestions: getStorageData(STORAGE_KEYS.ALL_QUESTIONS, [])
  }
})
