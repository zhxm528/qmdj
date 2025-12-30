下面给你一个可落地的“十神计算”方法：只要你已经有

八字四柱（每柱：天干、地支）

天干五行阴阳表（stem → element, yin_yang）

地支藏干表（branch → hidden_stems(干/主中余/权重)）

五行生克表（elementA 对 elementB：生/克/同类…）
-（可选）干合、地支合冲刑害破等规则表

就能把每个天干、每个藏干的十神算出来。

1）十神的本质：相对“日主”的五行关系 + 阴阳同异

十神永远是“相对日柱天干（日主）”来定的。

你只需要确定两件事：

五行关系（相对日主）属于哪一类

同我（同五行）

我生（我→对方：生）

我克（我→对方：克）

生我（对方→我：生）

克我（对方→我：克）

阴阳是否相同（同阴阳 / 异阴阳）

然后就能映射到十神。

2）十神映射表（核心固定字典）

设：日主 = DM（element_dm, yy_dm），目标干 = X（element_x, yy_x）

A. 同我（同五行）

阴阳同：比肩

阴阳异：劫财

B. 我生（我生对方：输出/食伤）

阴阳同：食神

阴阳异：伤官

C. 我克（我克对方：财）

阴阳同：偏财

阴阳异：正财

D. 克我（对方克我：官杀）

阴阳同：七杀（偏官）

阴阳异：正官

E. 生我（对方生我：印）

阴阳同：偏印（枭神）

阴阳异：正印

记忆窍门：

同类：比/劫

我生：食/伤

我克：财（偏/正）

克我：官杀（七杀/正官）

生我：印（偏/正）
同阴阳一般是“偏/七/比/食”，异阴阳一般是“正/官/劫/伤”（这是常见规律）

3）计算流程（你在数据库里怎么跑）
Step 0：拿到“日主”的五行阴阳

从你的 stem_element_yinyang（或类似表）查到日柱天干的 element + yin_yang。

Step 1：对每个“目标天干”计算十神

目标天干包括：年干、月干、时干（以及日干自己标“日主”）

做法：

查目标天干的 element + yin_yang

用 五行生克表判断：目标干相对日主属于哪类（同我/我生/我克/生我/克我）

再按“阴阳同异”映射到十神

Step 2：对每个“地支藏干”计算十神

地支本身不是十神主体；十神通常算在藏干上（主气/中气/余气分别一条十神）。

做法：

用 branch_hidden_stems 查出该支藏干列表（含主/中/余或权重）

对每个藏干重复 Step 1 的逻辑，得出十神

最终你就能得到你之前说的结构：
hidden_stems = [{干, 主中余, 五行阴阳, 十神, 是否通根...}, ...]

4）五行关系怎么判断（用你已有的“五行生克表”最省事）

假设你有表：wuxing_relation(from_element, to_element, relation)
其中 relation ∈ { 'same','sheng','ke' }（或更细）

那么“目标干 X 相对日主 DM”的关系分类可以这样算：

若 element_x = element_dm → 同我

若 element_dm sheng element_x → 我生

若 element_dm ke element_x → 我克

若 element_x sheng element_dm → 生我

若 element_x ke element_dm → 克我


#核心功能
根据上述逻辑实现功能，后台程序为 `/app/api/bazi/shishen/route.ts`
数据库文件：`/md/database/17_shishen.sql`、`/md/database/11_bazi.sql`、`/md/database/12_cangganbiao.sql`、`/md/database/13_yinyangwuxing.sql`、`/md/database/16_yueling.sql`、`/md/database/14_ganhe.sql`、`/md/database/12_cangganbiao.sql`
把原始十神的结果保存到数据库表中 "bazi_tenshen_detail_tbl"、"bazi_tenshen_summary_tbl"