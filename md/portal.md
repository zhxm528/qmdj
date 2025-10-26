##奇门遁甲 网站产品说明

##目标：
- 构建一个支持 PC 与手机（含 iOS Safari）访问的站点
- 含首页（Agent 排盘）、产品、价格、加入社群与会员体系（注册 / 登录 / 退出）

##产品概览

###核心价值：
- 在简洁界面中输入「标题：奇门遁甲」、日期时刻与查询条件
- 一键生成九宫格排盘结果
- 并提供产品功能展示、明确价格方案和社群入口

###平台：
- 桌面端与移动端（含 iOS Safari）；响应式布局

###会员体系：
- 注册 / 登录 / 退出
- 后续可接入订阅（包月 / 包年）解锁高级功能

##信息架构与路由
页面	路由	说明
首页（Agent 排盘）	/	标题、输入框+查询按钮、日期/时间条件、九宫格结果
产品	/products	每行 3 个 Panel，当前为演示标题（如 “Coming soon”）与功能清单
价格	/pricing	三档：免费 / 包月（¥19/月）/ 包年（¥199/年）
加入社群	/community	跳转/嵌入类似 X.com 的交流社区入口
登录 / 注册 / 账户	/login /register /account	会员认证与个人资料/订阅管理
其他	/logout	退出并重定向首页

##页面详规
###首页（Agent 排盘） /

####布局（自上而下）：
- 标题行：居中大号标题：奇门遁甲
- 输入行：文本输入框（placeholder：请输入问题或对象（可选））+ 右侧“查询”按钮
- 条件行：
 - 日期选择（年-月-日）：分别显示年选择框、月选择框、日选择框，年选择框下拉框中同时要显示阳历年和干支年，月选择下拉框中同时显示阳历月和干支月；
 - 时间选择（时-分）
 - 二者并排（桌面）/ 分两行（移动）
- 结果行：九宫格表格（3×3），用于显示排盘结果（先用占位数据）

####交互：
- 填写任意项后点击“查询”→ 校验 → 调接口 → 渲染九宫格；
- Loading 态：按钮旋转/禁用；结果区域显示骨架屏；
- 错误态：顶部/表单下方 toast 或 inline 错误提示；
- 移动端：输入框与按钮占满行宽，条件行自动换行。

####可选扩展：
- 历史记录（最近 5 次查询）
- 一键复制排盘
- 导出图片/分享

###产品页 /products
####网格布局：
- 每行展示 3 个 Panel（移动端 1 列、平板 2 列、桌面 3 列）
- 每个 Panel：演示标题（如 “Coming soon”）、简短功能清单占位、icon/插图占位、按钮（“了解更多”禁用或即将开放）
####示例面板：
- Panel A：基础排盘（已支持）
- Panel B：高级断局（Coming soon）
- Panel C：流月/流日趋势（Coming soon）
- Panel D：个性化报告 PDF（Coming soon）
- Panel E：历史对比与标注（Coming soon）
- Panel F：API 接口（Coming soon）

###价格页 /pricing
####价格卡片（3 列布局，移动端纵向）：
#####免费
- 价格：¥0
- 功能：基础排盘、每日限额 X 次、社区只读
- CTA：注册并使用（主按钮）
#####包月
- 价格：¥19 / 月
- 功能：不限次数排盘、优先队列、社区发言、基础报告导出
CTA：立即开通
#####包年
- 价格：¥199 / 年
- 功能：含包月全部 + 高级报告、历史对比、专属徽章
- CTA：立即开通

###加入社群 /community
- 目标：进入类似 X.com 的交流聊天社群。
- 实现方式（任选其一或组合）：
- 外链至官方 X 社群（新页面打开）；
- 站内嵌入时间线（需遵循平台嵌入政策与隐私条款）；
- 预留登录后发帖/评论能力（后期与自建论坛或 Discord/Telegram 集成）。

###认证相关 /login /register /account
- 注册：邮箱 + 密码（或第三方登录：Apple / Google）；同意条款与隐私政策；
- 登录：邮箱/第三方；支持记住我；
- 退出：清除会话并回首页；
- 账户页：展示用户信息、订阅状态、账单与发票下载、取消自动续费入口。

##组件清单
- Layout：顶栏（Logo、导航、登录态）、页脚（版权、条款、隐私、社媒）
- Form：文本输入、日期选择器（YYYY-MM-DD）、时间选择器（HH:mm）、校验提示
- Button：主按钮（查询/购买）、次按钮（了解更多）
- Card：产品 Panel、价格卡
- Table/Grid：九宫格（3×3），单元格内含：宫名、符号/门/星/神占位
- Toast/Alert：成功/失败反馈
- Skeleton：结果加载骨架屏
- AuthModal（可选）：浮层登录注册
- Pagination/History（可选）：查询历史

##接口API（REST 示例）
| 方法   | 路径                         | 说明                                 | 鉴权             |
| ------ | ---------------------------- | ------------------------------------| ---------------- |
| `POST` | `/api/auth/register`         | 注册                                | 否               |
| `POST` | `/api/auth/login`            | 登录，返回 JWT/Session              | 否               |
| `POST` | `/api/auth/logout`           | 退出                                | 是               |
| `POST` | `/api/qimen/query`           | 生成排盘（输入：subject/date/time） | 可选（游客限额） |
| `GET`  | `/api/qimen/history?limit=5` | 最近查询                            | 是               |
| `GET`  | `/api/user/me`               | 账户信息                            | 是               |
| `POST` | `/api/billing/checkout`      | 发起订阅订单（plan: monthly/yearly）| 是               |
| `POST` | `/api/billing/webhook`       | 支付回调                            | 否（签名校验）   |


##交互与状态流
###首页查询流：
- 用户输入 subject（可空）+ 日期 + 时间
- 点击“查询” → 前端校验（日期/时间必填）
- 置为 Loading，调用 /api/qimen/query
- 成功：渲染九宫格；失败：Toast 显示错误
- 记录历史（已登录用户保存到服务端）

###认证流：
- 注册 → 登录 → 重定向回来源页
- 登录态展示用户头像/昵称，导航显示“账户 / 退出”

###订阅流：
- Pricing → 选择方案 → /api/billing/checkout → 支付页 → 回调成功 → 更新订阅 → 账户页可见


##适配与性能
- 响应式：Mobile-first；断点示例：sm、md、lg、xl；
- 移动：单列排版，按钮与输入 100% 宽；
- 桌面：输入与按钮并排、条件双列、九宫格固定宽度居中。
- iOS Safari 注意：input[type="date/time"] 的原生样式、100vh 兼容、触控反馈（-webkit-tap-highlight-color）
- 性能：组件懒加载、SSR/SSG、图片优化、缓存（查询结果可设短期缓存）

##品牌与可访问性
视觉：东方占术氛围 + 极简现代；深色/浅色主题；可选衬线标题字体。
可访问性（a11y）：对比度 ≥ 4.5:1；表单有 label；键盘可达；ARIA 标注；错误信息语义化。

##SEO 与分享
- 语义化标题与描述：<title>奇门遁甲 · 在线排盘</title>
- Open Graph / Twitter Card：分享封面、摘要；
- 结构化数据（Organization、WebSite、Product、Offer）；
- 站点地图与 robots；
- Canonical 链接，避免重复内容。

##技术栈建议
- 框架：Next.js（App Router，SSR/ISR）
- 样式：Tailwind CSS + shadcn/ui 组件
- 认证：NextAuth.js（Email/Google/Apple）
- 后端：Next.js Route Handlers / Server Actions
- 数据库：PostgreSQL
- 支付：支付宝