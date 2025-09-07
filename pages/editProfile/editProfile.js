// 编辑资料页面逻辑
Page({
  data: {
    userInfo: {
      nickname: "默认用户",
      avatarUrl: "/images/avatar-default.png"
    }
  },

  onLoad: function() {
    // 加载用户数据
    const userInfo = wx.getStorageSync('userInfo') || this.data.userInfo;
    this.setData({
      userInfo: userInfo
    });
  },

  // 点击头像
  onAvatarTap: function() {
    wx.showActionSheet({
      itemList: ['使用微信头像', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 使用微信头像
          wx.getUserProfile({
            desc: '获取你的头像用于本地展示',
            success: (res) => {
              const userInfo = this.data.userInfo;
              userInfo.avatarUrl = res.userInfo.avatarUrl;
              this.setData({
                userInfo: userInfo
              });
              // 保存到本地存储
              wx.setStorageSync('userInfo', userInfo);
              // 显示修改成功提示
              wx.showToast({
                title: '头像更新成功',
                icon: 'success',
                duration: 1500
              });
              // 通知其他页面更新数据
              this.notifyDataUpdate();
            }
          });
        } else if (res.tapIndex === 1) {
          // 从相册选择
          wx.chooseImage({
            count: 1,
            sizeType: ['original', 'compressed'],
            sourceType: ['album'],
            success: (res) => {
              const tempFilePaths = res.tempFilePaths;
              // 头像预览
              wx.previewImage({
                current: tempFilePaths[0],
                urls: tempFilePaths,
                success: () => {
                  const userInfo = this.data.userInfo;
                  userInfo.avatarUrl = tempFilePaths[0];
                  this.setData({
                    userInfo: userInfo
                  });
                  // 保存到本地存储
                  wx.setStorageSync('userInfo', userInfo);
                  // 显示修改成功提示
                  wx.showToast({
                    title: '头像更新成功',
                    icon: 'success',
                    duration: 1500
                  });
                  // 通知其他页面更新数据
                  this.notifyDataUpdate();
                }
              });
            }
          });
        }
      }
    });
  },

  // 点击昵称
  onNicknameTap: function() {
    wx.showActionSheet({
      itemList: ['使用微信昵称', '自定义输入'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 使用微信昵称
          wx.getUserProfile({
            desc: '获取你的昵称用于本地展示',
            success: (res) => {
              const userInfo = this.data.userInfo;
              userInfo.nickname = res.userInfo.nickName;
              this.setData({
                userInfo: userInfo
              });
              // 保存到本地存储
              wx.setStorageSync('userInfo', userInfo);
              // 显示修改成功提示
              wx.showToast({
                title: '昵称更新成功',
                icon: 'success',
                duration: 1500
              });
              // 通知其他页面更新数据
              this.notifyDataUpdate();
            }
          });
        } else if (res.tapIndex === 1) {
          // 自定义输入
          wx.showModal({
            title: '输入昵称',
            editable: true,
            placeholderText: '请输入昵称',
            success: (res) => {
              if (res.confirm && res.content.trim()) {
                const userInfo = this.data.userInfo;
                userInfo.nickname = res.content.trim();
                this.setData({
                  userInfo: userInfo
                });
                // 保存到本地存储
                wx.setStorageSync('userInfo', userInfo);
                // 显示修改成功提示
                wx.showToast({
                  title: '昵称更新成功',
                  icon: 'success',
                  duration: 1500
                });
                // 通知其他页面更新数据
                this.notifyDataUpdate();
              }
            }
          });
        }
      }
    });
  },

  // 通知其他页面数据更新
  notifyDataUpdate: function() {
    // 发布全局事件
    const app = getApp();
    app.globalData.userInfo = this.data.userInfo;
    // 也可以使用wx.eventCenter等第三方事件总线库
    // 这里简单实现，其他页面可以在onShow中重新加载数据
  },

  // 返回个人中心
  onBackTap: function() {
    wx.navigateBack();
  }
});