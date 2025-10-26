# 奇门遁甲 · 在线排盘

专业的在线奇门遁甲排盘平台，基于 Next.js 14+ 构建。

## 项目概述

这是一个功能完整的奇门遁甲排盘网站，支持 PC 和移动端访问（含 iOS Safari）。提供九宫格排盘功能、产品展示、价格方案、会员体系和社群入口。

## 核心功能

- 🔮 **九宫格排盘**：输入日期时间，一键生成专业排盘结果
- 👥 **会员体系**：注册/登录/退出，支持订阅升级
- 💰 **订阅服务**：免费、包月（¥19）、包年（¥199）三档方案
- 📱 **响应式设计**：完美适配桌面端和移动端（含 iOS Safari）
- 🎨 **现代 UI**：东方占术氛围 + 极简现代风格
- 🔐 **安全认证**：完整的用户认证和会话管理
- 💳 **支付集成**：预留支付宝支付接口

## 技术栈

- **框架**：Next.js 14+ (App Router)
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **字体**：Noto Serif SC（衬线字体，营造东方氛围）
- **认证**：自定义 Session 管理（预留 NextAuth.js 集成）
- **数据库**：预留 PostgreSQL 集成（当前使用模拟数据）

## 项目结构

```
qmdj/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── auth/                 # 认证相关
│   │   │   ├── register/route.ts
│   │   │   ├── login/route.ts
│   │   │   └── logout/route.ts
│   │   ├── qimen/                # 奇门遁甲相关
│   │   │   ├── query/route.ts
│   │   │   └── history/route.ts
│   │   ├── user/                 # 用户相关
│   │   │   └── me/route.ts
│   │   └── billing/              # 支付相关
│   │       ├── checkout/route.ts
│   │       └── webhook/route.ts
│   ├── page.tsx                  # 首页（排盘）
│   ├── products/page.tsx         # 产品页
│   ├── pricing/page.tsx          # 价格页
│   ├── community/page.tsx        # 社群页
│   ├── login/page.tsx            # 登录页
│   ├── register/page.tsx         # 注册页
│   ├── account/page.tsx          # 账户页
│   ├── layout.tsx                 # 根布局
│   └── globals.css               # 全局样式
├── components/                    # React 组件
│   ├── Layout.tsx               # 页面布局（顶栏、页脚）
│   ├── Button.tsx                # 按钮组件
│   ├── YearPicker.tsx          # 年份选择器（4x4 网格，翻页）
│   ├── MonthPicker.tsx         # 月份选择器（4x3 网格）
│   ├── DateSelector.tsx         # 日期选择器（年/月/日）
│   ├── NineGrid.tsx             # 九宫格组件
│   ├── Toast.tsx                # 消息提示
│   ├── Skeleton.tsx             # 骨架屏
│   ├── ProductCard.tsx          # 产品卡片
│   └── PricingCard.tsx          # 价格卡片
├── lib/                          # 工具库
│   ├── utils.ts                  # 通用工具函数
│   └── ganzhi.ts                # 干支年转换工具
├── types/                        # 类型定义
│   └── index.ts
└── md/                          # 项目文档
    ├── project.md              # 项目配置
    └── portal.md               # 产品规格
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量（可选）

创建 `.env.local` 文件（目前使用模拟数据，无需配置）：

```env
# 数据库配置（预留）
# DATABASE_URL=postgresql://...

# 支付配置（预留）
# ALIPAY_APP_ID=your_app_id
# ALIPAY_PRIVATE_KEY=your_private_key
```

### 3. 运行开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 页面说明

### 首页 (/) - 排盘功能
- 输入标题（可选）
- 选择日期和时间
- 点击查询生成九宫格排盘
- 展示排盘结果

### 产品页 (/products)
- 展示所有功能特性
- 6个功能面板（基础排盘已支持，其他为 Coming soon）
- 响应式网格布局

### 价格页 (/pricing)
- 三档订阅方案
- 免费版：基础功能
- 包月：¥19/月
- 包年：¥199/年（推荐）

### 社群页 (/community)
- 官方社群入口
- 外链到 X.com（可定制）

### 登录/注册页 (/login, /register)
- 邮箱密码登录
- 记住我功能
- 第三方登录（预留）

### 账户页 (/account)
- 个人信息展示
- 订阅状态管理
- 账单和发票下载

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/logout | 用户退出 |
| POST | /api/qimen/query | 生成排盘 |
| GET | /api/qimen/history | 查询历史 |
| GET | /api/user/me | 获取用户信息 |
| POST | /api/billing/checkout | 发起订阅 |
| POST | /api/billing/webhook | 支付回调 |

## 功能特性

### 已实现
✅ 完整页面路由和导航  
✅ 响应式布局（移动端适配）  
✅ **干支日期选择器**：同时显示阳历年和干支年、阳历月和干支月  
✅ **年份选择器**：4x4 网格布局，支持翻页浏览 2000 年范围  
✅ **月份选择器**：4x3 网格布局，显示阳历月和干支月  
✅ 九宫格排盘 UI（占位数据）  
✅ 用户认证流程（UI 完成）  
✅ 订阅管理系统（UI 完成）  
✅ Toast 消息提示  
✅ 加载骨架屏  
✅ iOS Safari 兼容性优化  
✅ SEO 优化（Open Graph）  

### 待实现
- [ ] 奇门遁甲排盘算法实现
- [ ] 数据库集成（用户、订单、历史记录）
- [ ] 支付流程集成（支付宝）
- [ ] 用户认证完善（JWT 或 NextAuth.js）
- [ ] 历史记录功能
- [ ] 导出和分享功能
- [ ] 高级功能（高级断局、趋势分析等）

## 开发说明

### 响应式设计
- Mobile-first 设计
- 断点：sm (640px), md (768px), lg (1024px), xl (1280px)
- iOS Safari 特殊处理

### 可访问性
- 表单 label 关联
- 键盘可达性
- ARIA 标注
- 颜色对比度 ≥ 4.5:1

### 性能优化
- 组件懒加载
- 图片优化
- 缓存策略（待实现）

## 构建和部署

### 开发环境
```bash
npm run dev
```

### 生产构建
```bash
npm run build
npm start
```

### Lint 检查
```bash
npm run lint
```

## 许可证

MIT

## 联系方式

如有问题或建议，请提交 Issue。
