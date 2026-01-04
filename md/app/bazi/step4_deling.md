# 获得“得令”的计算结果
- ~~得令的数据库文件 `/md/database/20_deling.sql`~~ ✅ 已完成
- ~~`/app/api/bazi/yueling/route.ts` 提供了得令计算的基础数据（日主状态和强弱值），但没有进行得令判定。得令判定需要在 `/app/api/bazi/deling/route.ts` 中实现，它会：~~ ✅ 已完成
  - ~~使用 yueling/route.ts 获取的数据~~ ✅ 已完成
  - ~~查询 dict_deling_ruleset 获取判定规则~~ ✅ 已完成
  - ~~根据规则判定是否得令~~ ✅ 已完成
- ~~日志打印得令结果~~ ✅ 已完成
- ~~得令结果保存到数据库~~ ✅ 已完成

## 实现细节

### 函数签名
```typescript
calculateAndSaveDeling(chartId: string, rulesetId?: string)
```
- `chartId`: 排盘ID（UUID格式）
- `rulesetId`: 规则集ID（可选，默认 'default'）

### 数据转换
- `yueling/route.ts` 返回的是 `state_rank`（1-5），需要转换为 `score`（0-1）
- 转换公式：`score = state_rank / 5.0`
  - 旺=5 → 1.0
  - 相=4 → 0.8
  - 休=3 → 0.6
  - 囚=2 → 0.4
  - 死=1 → 0.2

### 快照表保存
- 保存到 `bazi_season_element_state_snapshot_tbl` 表
- 保存所有五行（木、火、土、金、水）的状态和分数
- 每个五行一条记录，包含：element, state, score, is_override, evidence_json

### 判定逻辑
- **状态阈值优先**：如果 `dict_deling_ruleset` 中设置了 `state_thresholds`，优先使用状态阈值判定
  - 检查 `day_master_state` 是否在 `state_thresholds` 数组中
  - 例如：`state_thresholds = ['旺']` → 只有"旺"算得令
  - 例如：`state_thresholds = ['旺','相']` → "旺"或"相"都算得令
- **分数阈值作为备选**：如果 `state_thresholds` 为空，使用 `score_min` 判定
  - 检查 `day_master_score` 是否 >= `score_min`
  - 例如：`score_min = 0.8` → 分数 >= 0.8 算得令

### 证据 JSON
- 保存到 `evidence_json` 字段，包含：
  - `ruleset_id`: 使用的规则集ID
  - `state_thresholds`: 状态阈值列表（如果有）
  - `score_min`: 分数阈值（如果有）
  - `day_master_state`: 日主状态
  - `day_master_score`: 日主分数
  - `is_override`: 是否使用了覆盖规则
  - `override_note`: 覆盖规则说明（如果有）
  - `snapshot_source`: 快照来源说明

### 输入数据获取
- 从 `chart_id` 查询 `bazi_pillar_tbl` 获取四柱数据
- 从四柱中提取：月支（month_branch）、日干（day_stem）
- 从 `step1` 或 `rizhuwuxing/route.ts` 获取日主五行（day_master_element）
- 调用 `yueling/route.ts` 的 `getYuelingStrengthFromDB()` 获取月令强弱信息