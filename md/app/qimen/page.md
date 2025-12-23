# 核心功能
- 首页 前端页面：`/app/page.tsx`
- 问事 前端页面：`/app/qimen/page.tsx`
- 起局排盘 后台程序：`/app/api/kanpan/route.ts`
- 看盘 后台程序：`/app/api/kanpan/route.ts`
- 后台程序：`/app/api/prompt_context/route.ts`
- 数据库表结构： `/md/database/2_qimen_pan.sql`
- 配置文件： `/lib/config.ts`
## 需要执行的操作
- 在


## 已执行完毕、忽略不执行的操作

- 功能说明：
页面加载时，“问哪方面”的 Radio 组件会默认选中“综合”选项
"flow.qmdj.kanpan.default" 对应 Radio 组件中“综合”选项的 value
- 当“新对话”的时候，点击“看盘”，等待ai分析结果的同时，没有显示轮播语。




- 功能说明
把排盘逻辑抽离到后端 API：
重写 app/api/paipan/route.ts：
实现完整排盘逻辑
通过内部 API 调用依次执行：地盘干、天盘干、地八神、天八神、九星、八门、空亡、驿马、寄宫
返回所有排盘结果，包括 grid 数据和各项排盘信息
简化 app/page.tsx 中的 handlePaipan 函数：
只调用 /api/paipan 一个端点
处理返回结果并设置状态
保留保存排盘结果到数据库的逻辑


- 功能说明
修改保存排盘结果到数据库的逻辑。
修改内容：
category 字段：从 null 改为固定值 "qimendunjia" ✅ 已完成
logic_key 字段：从使用 generateLogicKey 函数改为使用四柱格式 ✅ 已完成
格式："年柱 月柱 日柱 时柱"（空格分隔）
例如："甲子 乙丑 丙寅 丁卯"
实现位置：app/api/qimen_pan/route.ts (第443-444行, 第474行)