# 核心功能
- 前端页面：`/app/bazi/page.tsx`
- 后台程序：`/app/api/bazi/route.ts`
- 后台程序：`/app/api/bazi/ganhe/route.ts`
- 后台程序：`/app/api/bazi/dizhicanggan/route.ts`
- 步骤1程序：`/app/api/bazi/step1.ts`
- 步骤2程序：`/app/api/bazi/step2.ts`
- 步骤3程序：`/app/api/bazi/step3.ts`
- 后台程序：`/app/api/bazi/tonggen/route.ts`
- 后台程序：`/app/api/bazi/tougan/route.ts`
- 后台程序：`/app/api/bazi/deling/route.ts`
- 后台程序：`/app/api/bazi/rootqi/route.ts`
- 后台程序：`/app/api/bazi/dezhu/route.ts`
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
- 数据库：`/md/database/11_bazi.sql`
- 数据库 藏干表：`/md/database/12_cangganbiao.sql`
- 数据库 天干五行表：`/md/database/13_yinyangwuxing.sql`
- 数据库 干合表：`/md/database/14_ganhe.sql`
- 数据库 合化表：`/md/database/15_hehua.sql`
- 数据库 月令表：`/md/database/16_yueling.sql`
- 数据库 十神表：`/md/database/17_shishen.sql`
- 数据库 通根表：`/md/database/18_tonggen.sql`
- 数据库 透干表：`/md/database/19_tougan.sql`
- 数据库 透干表：`/md/database/20_deling.sql`
- 配置文件： `/lib/config.ts`
## 需要执行的操作
- （无）

## 已完成
- 在步骤3程序：`/app/api/bazi/step3.ts` 中调用 `/app/api/bazi/rootqi/route.ts` 获取 根气 的结果，调用 `/app/api/bazi/dezhu/route.ts` 获取 得助 的结果
- 在“旺衰：日主强弱与身态”中显示 根气 和 得助 的表格

## 已执行完毕、忽略以下不执行的操作

```不执行的操作
- "原始十神"表格需要显示在"地支藏干表"表格上方
- 页面中，"基础盘面信息"中，删除"地支藏干表"表格以上的文字部分
- 在 `/app/bazi/page.tsx` 中的 "基础盘面信息" 板块中展现原始十神
- 修改"天干地支关系规则表"中的布局，"冲（地支六冲）"、"刑（地支刑）"、"害（地支六害）"、"破（地支六破）" 四个部分放在一行显示
- "干克（天干相克）"中的"天干五行映射"和"五行相克规则"放在一行显示
- 修改"天干地支关系规则表"中的布局，"五合（天干五合）"、"六合（地支六合）"、"三合（地支三合局）"、"三会（地支三会局）" 四个表格放在一行显示
- “地支藏干表”在“基础盘面信息”中显示，在“定命主【我】”中不显示
- 把 `/app/api/bazi/dizhicanggan/route.ts` 的藏干表结果 返回在 `/app/bazi/page.tsx` 的"基础盘面信息"中
- 在 `/app/api/bazi/step3.ts` 中调用 API 接口：/app/api/bazi/shishen/route.ts 获取原始十神
- 前端页面，“月令与季节”板块中，“【月令信息】”用表格形式展现
- 前端页面，“月令与季节”板块中，“【月令强弱/得令】”用表格形式展现
- 前端页面，“月令与季节”板块中，月令信息、月令强弱/得令、所有五行旺相休囚死状态 已有表格展现，可以去除重复的文字描述部分，仅保留表格展示即可
- 前端页面，“月令与季节”板块中，调整布局，分左右两列显示，月令信息 和 月令强弱/得令 在一列、所有五行旺相休囚死状态在一列
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

- 点击“生成八字排盘”，需要先判断用户是否登录，如果用户未登录，或者用户的email为空，则“生成八字排盘”置灰不可点击，且鼠标悬停，提示需要先登录才能排盘
- 每次点击“生成八字排盘”，排盘结果应该属于当前用户，需要和当前用户的user_email绑定，此外，每个用户的每个四柱的排盘结果是唯一的，先要通过用户、四柱查询排盘结果，如果是第一次盘排，则创建新的数据存入数据库，如果已经存在盘排结果，则修改即可

- ~~在步骤3程序：`/app/api/bazi/step3.ts` 中调用 `/app/api/bazi/tonggen/route.ts`  获取 通根表结果，调用 `/app/api/bazi/tougan/route.ts` 获取 透干表结果~~ ✅ 已完成
- ~~把 `/app/api/bazi/tonggen/route.ts` 的通根表结果 打印在日志中~~ ✅ 已完成
- ~~把 `/app/api/bazi/tougan/route.ts` 的透干表结果 打印在日志中~~ ✅ 已完成
- ~~前端页面 `/app/bazi/page.tsx` 中，"旺衰：日主强弱与身态"板块中，用表格形式展现"通根表"和"透干表"~~ ✅ 已完成
- ~~页面中删除这段文字："此步骤的分析结果暂未实现，请稍后查看。步骤说明：得令/通根/得助/生克泄耗综合"~~ ✅ 已完成

```
