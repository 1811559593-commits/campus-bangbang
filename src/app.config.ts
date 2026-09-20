export default defineAppConfig({
  pages: [
    'pages/hall/index',
    'pages/find/index',
    'pages/publish/index',
    'pages/orders/index',
    'pages/mine/index',
    'pages/orderDetail/index',
    'pages/review/index',
    'pages/profile/index',
    'pages/verify/index',
    'pages/report/index',
    'pages/agreement/index',
    'pages/admin/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '校园帮帮',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#86909c',
    selectedColor: '#2f6bff',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/hall/index',
        text: '大厅',
        iconPath: 'assets/tabbar/hall.png',
        selectedIconPath: 'assets/tabbar/hall-selected.png'
      },
      {
        pagePath: 'pages/find/index',
        text: '找帮手',
        selectedIconPath: 'assets/tabbar/find-selected.png',
        iconPath: 'assets/tabbar/find.png'
      },
      {
        pagePath: 'pages/publish/index',
        text: '发布',
        iconPath: 'assets/tabbar/publish.png',
        selectedIconPath: 'assets/tabbar/publish-selected.png'
      },
      {
        pagePath: 'pages/orders/index',
        text: '订单',
        iconPath: 'assets/tabbar/orders.png',
        selectedIconPath: 'assets/tabbar/orders-selected.png'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tabbar/mine.png',
        selectedIconPath: 'assets/tabbar/mine-selected.png'
      }
    ]
  }
})
