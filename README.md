# 校园帮帮 (Campus BangBang)

校园跑腿撮合微信小程序：发单人发布跑腿订单，接单人免费申请接单，发单人确认后双方交换联系方式，报酬线下结算。含加急置顶、双向评价、举报、信誉分体系。

> 当前处于**模式验证阶段**（个人主体）：接单信息费已临时下线（`infoFee` 字段保留、落 0，个体户升级后可恢复 5% 抽成），唯一收费点为「加急卡」。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Taro 4.1.9 + React 18 + TypeScript + Sass + Zustand |
| 后端 | 腾讯云开发 CloudBase（PostgreSQL 模式）+ 云函数（Node.js, CommonJS） |
| 数据访问 | 云函数经 exec-pgsql HTTP API 参数化访问 PG，业务表开启 RLS，小程序端不直连数据库 |
| 内容安全 | `cloud.openapi.security.msgSecCheck`（发布/举报/评价三入口，异常 fail-open） |

## 核心流程

```
发单人发布订单 ──▶ 待接单(pending)
                     │  接单人「免费申请」（其联系方式对发单人可见）
                     ▼
                  申请中(applied) ──▶ 发单人「确认选择该接单人」
                     │                      │ 接单人此时可见发单人联系方式
                     ▼                      ▼
                  已确认(claimed) ──▶ 接单人完成并提交(submitted)
                     │                      │ 发单人确认完成 → 写入日流水
                     ▼                      ▼
                       已完成(completed) ─▶ 双方互评
```

终态：`cancelled`（可取消：pending / applied / claimed）/ `disputed`（举报）。

**加急卡**：发单人可为自己处于 pending / applied 的订单购买加急置顶（¥1 / 24 小时），订单大厅按置顶优先排序，卡片带 🔥 标识。验证期通过 `ENABLE_DEMO_PAY=1` 直接到账；正式收费将接入微信虚拟支付 `wx.requestVirtualPayment`（代码已预留 `payParams` 分支）。

## 目录结构

```
├── src/
│   ├── app.config.ts            # 页面与 tabBar 配置
│   ├── pages/                   # 首页大厅 / 发布 / 订单 / 订单详情 / 我的 / 协议 等
│   ├── components/              # OrderCard / StatusTag 等
│   ├── services/                # api 层（云调用封装）+ demo 层（H5 mock 分发）
│   ├── data/                    # H5 演示用 mock 数据（orderService / propService / mockDb）
│   ├── types/                   # 领域类型（订单状态机等）
│   └── utils/                   # 格式化、常量
├── cloudfunctions/              # 云函数
│   ├── orderService/            # 订单：发布/列表/详情/申请/确认/取消/完成/举报
│   ├── propService/             # 加急卡购买
│   ├── reviewService/           # 双向评价 + 信誉统计重算
│   ├── userService/             # 用户资料
│   ├── login/                   # 微信登录建档
│   ├── payCallback/             # 支付回调（信息费时代遗留，保留）
│   └── sharedHelper/            # 公共工具真源（部署前复制到各函数目录）
├── cloudbase/migrations/        # PG 迁移 SQL（手动在云开发控制台执行）
└── config/                      # Taro 构建配置
```

## 数据库要点

- `orders`：订单主表，含 `topUntil`（置顶到期）、`infoFee`/`infoFeeRate`（验证期落 0）
- `prop_orders`：加急卡购买流水（buyerOpenid / orderId / amount / status / topUntil）
- `daily_stats`：日流水统计（stat_date 主键），订单完成时 `INSERT ... ON CONFLICT` 按天累加金额与笔数
- `users` / `reviews` / `reports` / `payments`：用户（信誉分）、评价、举报、支付流水
- 全部业务表开启 RLS 且无策略 → 仅云函数（`cloudbase_postgres` role）可读写

## 快速开始

```bash
npm install

# H5 本地预览（走 mock 数据，无需云环境）
npm run dev:h5

# 微信小程序构建（产物在 dist/，用微信开发者工具导入 dist 目录）
npm run build:weapp
```

### 部署后端

1. 在 CloudBase PG 控制台按序执行 `cloudbase/migrations/` 下的 SQL；
2. 将 `cloudfunctions/sharedHelper/helper.js` 复制到每个云函数目录；
3. 用微信开发者工具右键「上传并部署：云端安装依赖」各云函数；
4. 云函数环境变量：`ENV_ID`、`CLOUDBASE_API_KEY`、（可选）`ENABLE_DEMO_PAY=1`。

### 上传体验版

```bash
npx miniprogram-ci upload --appid <AppID> --project-path ./dist -k <上传私钥路径> -v <版本号>
```

## 安全约定

- SQL 一律参数化（`$1, $2...`），禁止拼接；
- 用户身份只信云网关注入的 openid（`getOpenid`），不信前端传参；
- 可更新字段走白名单；联系方式在确认前互相隐藏。

## License

仅供学习与校内使用。
