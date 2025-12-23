# 核心功能
- 前端页面：`/app/bazi/page.tsx`
- 后台程序：`/app/api/bazi/route.ts`
- 步骤1程序：`/app/api/bazi/step1.ts`
- 步骤2程序：`/app/api/bazi/step2.ts`
- 步骤3程序：`/app/api/bazi/step3.ts`
- 步骤4程序：`/app/api/bazi/step4.ts`
- 步骤5程序：`/app/api/bazi/step5.ts`
- 步骤6程序：`/app/api/bazi/step6.ts`
- 步骤7程序：`/app/api/bazi/step7.ts`
- 步骤8程序：`/app/api/bazi/step8.ts`
- 步骤9程序：`/app/api/bazi/step9.ts`
- 步骤10程序：`/app/api/bazi/step10.ts`
- 步骤11程序：`/app/api/bazi/step11.ts`
- 步骤12程序：`/app/api/bazi/step12.ts`
- 步骤13程序：`/app/api/bazi/step13.ts`
- 数据库：`/md/database/2_qimen_pan.sql`
- 配置文件： `/lib/config.ts`
## 需要执行的操作
- 步骤2中，json格式有调整，需要调整相应的程序

## 已执行完毕、忽略不执行的操作

- 功能说明
在 app/bazi/page.tsx 新增完整页面组件 BaziPage，使用：
DateSelector 选择年/月/日
HourSelector 选择时辰（带必填标记）
MinuteSelector 选择分钟
默认值与首页 /app/page.tsx 一致：当前日期、当前小时、当前分钟。

实现页面结构：
使用 Layout 和 ConfigProvider (zhCN)，保持全站风格一致。
白底卡片中左侧为日期选择，右侧为时辰（时+分）选择，布局与首页相同。
下方提供一个“生辰（待接入）”按钮，目前仅做占位（禁用条件同首页排盘按钮：未选日期或时辰时禁用）。


-功能说明
修改了生辰八字页面的宽度。
调整内容：
在 app/bazi/page.tsx 中，将外层容器从：
max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8
修改为与首页一致的：
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8
这样 /bazi 页面的内容宽度和左右留白与首页 / 保持一致，整体观感统一。