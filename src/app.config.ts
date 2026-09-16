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
        iconPath: 'assets/tabbar/hall.svg',
        selectedIconPath: 'assets/tabbar/hall-selected.svg'
      },
      {
        pagePath: 'pages/find/index',
        text: '找帮手',
        selectedIconPath: 'assets/tabbar/find-selected.svg',
        iconPath: 'assets/tabbar/find.svg'
      },
      {
        pagePath: 'pages/publish/index',
        text: '发布',
        iconPath: 'assets/tabbar/publish.svg',
        selectedIconPath: 'assets/tabbar/publish-selected.svg'
      },
      {
        pagePath: 'pages/orders/index',
        text: '订单',
        iconPath: 'assets/tabbar/orders.svg',
        selectedIconPath: 'assets/tabbar/orders-selected.svg'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tabbar/mine.svg',
        selectedIconPath: 'assets/tabbar/mine-selected.svg'
      }
    ]
  }
})
