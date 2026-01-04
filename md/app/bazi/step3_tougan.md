# 获取透干表

“透干”不是一个固定字典（不像“地支藏干表”那样），而是基于某个具体八字盘计算出来的结果：

透干 = 地支里的某个藏干，在四柱天干（年干/月干/日干/时干）中出现了同一个天干。
例如：支藏“甲”，四柱天干里也有“甲” ⇒ 甲“透干”。

所以“透干表”的获取方式，本质是：藏干展开 + 与四柱天干做等值匹配。

输入表

四柱表（每柱的天干地支）

chart_id, pillar, stem, branch

地支藏干字典表

branch, hidden_stem, level(主/中/余), seq

（你之前已经在做“地支藏干表/通根表”，透干就复用这张藏干字典即可。）

透干计算逻辑（最稳、最通用）

对每个 chart_id：

收集四柱天干集合：S = {年干, 月干, 日干, 时干}

将每个地支展开藏干：得到 (pillar, branch, hidden_stem, level...)

判断 hidden_stem ∈ S

是：is_tougan = true

否：is_tougan = false

记录透出在哪些柱（年/月/日/时）。

## 核心功能
- 前台页面 `/app/bazi/page.tsx`
- 后台程序 `/app/api/bazi/tougan/route.ts`
- 透干表的数据库文件 `/md/database/19_tougan.sql`
- 藏干表的数据库文件 `/md/database/12_cangganbiao.sql`
- 天干五行表的数据库文件 `/md/database/13_yinyangwuxing.sql`
- 计算出“透干表”的结果并存入数据库
- 从数据库中获取透干表的结果，并在前台页面 `/app/bazi/page.tsx` 的 “旺衰：日主强弱与身态” 板块中展示“透干表”