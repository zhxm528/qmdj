# 获得"得地（根气）"的计算结果
- 得地（根气）的数据库文件 `/md/database/21_rootqi.sql`
- `/app/api/bazi/rootqi/route.ts` 获得得地（根气）计算的基础数据
- 日志打印得地（根气）结果
- 得地（根气）结果保存到数据库
- **在 step4 中调用 rootqi 计算**，用于判断日主强弱
- **只计算同干根（SAME_STEM）**：


## 数据库结构

### 1. 明细表：`bazi_root_qi_detail_tbl`
每条记录表示"某目标天干"在"某柱地支"的藏干中找到根，并记录主/中/余气与评分证据。

### 2. 汇总表：`bazi_root_qi_summary_tbl`
按目标天干汇总根气总分和强弱分级。

### 3. 分级阈值表：`bazi_root_qi_level_threshold_dict`
将 `total_root_score` 映射到 `root_level` 的阈值配置表。

**默认阈值（DEFAULT规则集）**：
- `NONE`：`[0.0000, 0.2500)` - 无根或几乎无根
- `WEAK`：`[0.2500, 1.0000)` - 弱根：有根但力度不足
- `MEDIUM`：`[1.0000, 2.0000)` - 中根：根气可用
- `STRONG`：`[2.0000, 9999.0000)` - 强根：根气充足


## 计算逻辑

### 步骤1：遍历每个天干
对年干、月干、日干、时干分别计算根气。

### 步骤2：检查四个地支的藏干
对每个地支，检查其藏干中是否包含目标天干（**只计算同干根，不计算同五行根**）。
- 如果包含，记录为一条根气明细
- 记录藏干层级（主气/中气/余气）

### 步骤3：计算每条根气的综合分数

根气分数 = `w_hidden_rank` × `w_pillar_pos` × `w_season_element` × 其他修正因子

**权重说明**：

1. **`w_hidden_rank`（藏干层级权重）**：
   - 主气：1.0
   - 中气：0.6
   - 余气：0.3

2. **`w_pillar_pos`（支位权重）**：
   - 月支：1.3（权重最大）
   - 日支：1.2
   - 时支：1.0
   - 年支：0.8

3. **`w_season_element`（月令/季节修正权重）**：
   - 根据得令表，如果该五行在当月旺相，则权重提升（例如：×1.2）
   - 如果休囚死，则权重降低（例如：×0.8）
   - 具体修正系数可根据实际需求调整


### 步骤4：汇总每个天干的根气
- 将四支的根气分数加总得到 `total_root_score`
- 根据 `bazi_root_qi_level_threshold_dict` 表的分级阈值，确定 `root_level`（NONE/WEAK/MEDIUM/STRONG）
- 找出最佳根（`root_score` 最大的那条明细），记录到 `best_root_pillar` 和 `best_root_branch`

## 实现细节

### 函数签名
```typescript
calculateAndSaveRootqi(chartId: string, ruleSet?: string)
getRootqiFromDB(chartId: string, targetPillar?: string, targetStem?: string)
```
- `chartId`: 排盘ID（UUID格式，从 `bazi_chart_tbl` 获取）
- `ruleSet`: 规则集ID（可选，默认 'DEFAULT'，用于选择分级阈值）

### 输入数据获取
- 从 `chart_id` 查询 `bazi_pillar_tbl` 获取四柱盘面数据库表： `/md/database/11_bazi.sql` 
- 从四柱中提取：年干、月干、日干、时干，以及年支、月支、日支、时支
- 从藏干表获取每个地支的藏干信息：藏干表： `/md/database/12_cangganbiao.sql`
- 从得令表获取日主在月令的旺衰状态（用于季节修正）：得令表： `/md/database/20_deling.sql`、月令表： `/md/database/16_yueling.sql`
- 从关系网表获取冲合刑害破关系（用于判断根是否被冲破）：冲合刑害破表： `/md/database/14_ganhe.sql`