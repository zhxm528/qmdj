“通根表”本质上是一个**固定字典**：描述“某天干（或五行）在某地支是否有根、根的强弱/层级、根来自哪一个藏干、属于主气/中气/余气”。你要做的是把“地支藏干表”加工成一个更好用的“通根查表”。

下面给你两种常用的落库方式：**最稳的字典表**（推荐） + **计算视图**（可选）。

---

## 1）先明确：通根怎么判定（你表里要存什么）

一个最通用的规则：

* **天干 X 在地支 Z 通根** ⇔ **Z 的藏干里包含 X**
* **根的层级/强弱**可以用藏干位置表示：

  * 主气（最强）> 中气 > 余气（最弱）
* 还可以扩展：根的“同五行”也算（只看五行，不看同一干），但这属于**门派差异**，建议做成可选字段/开关，而不是写死。

因此“通根表”至少能回答：

1. 甲 在 寅/卯/辰 有没有根？根来自哪个藏干？
2. 根是主/中/余哪一层？强度权重是多少？
3. （可选）按五行算根：甲木在亥（藏壬甲）算“木根”吗？——可以

---

## 2）推荐做法：把“地支藏干表”派生出“通根字典表”

假设你已经有（或会有）固定字典表：

* `dict_branch_hidden_stem`：地支 → 藏干（含主/中/余、权重）

  * 字段示例：`branch, hidden_stem, level(主/中/余), weight`
* `dict_stem_element`：天干 → 五行/阴阳（你前面已经做过类似表）

那么“通根表”就可以是一个**纯字典**：

### 表结构建议：`dict_stem_root_in_branch`

每一行：**stem 在 branch 的一个根来源**（来自某个藏干）

字段建议：

* `stem`：天干（甲乙丙丁…）
* `branch`：地支（子丑寅…）
* `root_from_hidden_stem`：根来自哪个藏干（=stem，或只是同五行时可不同）
* `root_level`：主/中/余
* `weight`：建议 1.0 / 0.6 / 0.3（你也可以自定）
* `is_same_stem`：是否“同一天干通根”（甲根=甲）
* `is_same_element`：是否“同五行根”（木根=甲/乙）
* `note`：可选，记录门派说明

这样你查询“某柱天干是否在某支通根”就变成一条简单 SQL。

---

## 3）怎么“获取”这张通根表（从藏干表自动生成）

### 生成逻辑（固定且可重复）

* 对每个地支 Z
* 取它所有藏干 H（主/中/余）
* 生成记录：`stem = H`、`branch = Z`、`root_from_hidden_stem = H`、`root_level = H.level`、`weight = H.weight`、`is_same_stem = true`

如果你还想支持“同五行也算根”（可选）：

* 再把“同五行的其他天干”也展开插入，并标 `is_same_element=true, is_same_stem=false`

> 实务上我更建议：**先只做“同一干通根”**，因为门派争议少；“同五行根”用视图或开关扩展。

---

## 4）你可以直接用“视图”而不落一张新表（更省事）

如果你已经有 `dict_branch_hidden_stem`，那“同干通根”其实就是：

* stem 在 branch 通根 ⇔ `exists(dict_branch_hidden_stem where hidden_stem = stem and branch = branch)`

你可以建一个视图：

* `vw_stem_root_in_branch` = 直接把 `dict_branch_hidden_stem` 重命名字段即可
  （hidden_stem 当作 stem，同时保留 level/weight）

优点：不冗余、不需要维护两份数据。
缺点：如果你后面还要做“同五行根”“根气强弱换算”等，会更想落一张派生表。

---

## 5）最终你在排盘计算里怎么用

给你一个最常用的计算点：

* 判断某个十神/某个天干是否“通根”：

  * 看它在 **年支/月支/日支/时支** 是否有根（主/中/余分别加分）
* 例如你在 `chart_strength_evidence` 里存：

  * `stem=甲, root_in_month_branch=true, root_level=主, score=+1.0`

---

## 核心功能
- 前台页面 `/app/bazi/page.tsx`
- 后台程序 `/app/api/bazi/tonggen/route.ts`
- 通根表的数据库文件 `/md/database/18_tonggen.sql`
- 藏干表的数据库文件 `/md/database/12_cangganbiao.sql`
- 天干五行表的数据库文件 `/md/database/13_yinyangwuxing.sql`
- 计算出“通根表”的结果并存入数据库
- 从数据库中获取通根表的结果，并在前台页面 `` 的 “旺衰：日主强弱与身态” 板块中展示“通根表”
