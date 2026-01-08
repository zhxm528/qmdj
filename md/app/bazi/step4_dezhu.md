# 获得“得助（同类与生扶）”的计算结果
- 目标：把“比劫（同类）+ 印星（生扶）”量化成可追踪的分数，并把结果落库
- 输出：`同类得助分`、`生扶得助分`、`总得助分` + 证据明细
- 适用于后续判旺衰与身态（步骤 4 总结）



## 需要哪些信息
1. **八字四柱**：年干/年支、月干/月支、日干/日支、时干/时支
2. **天干五行阴阳表**：stem → element, yin_yang
3. **地支藏干表**：branch → hidden_stems（主/中/余及权重）
4. **五行生克关系表**：用于判定相对日主的“同类/生我”关系
5. **十神结果（可选但更省事）**：`bazi_tenshen_detail_tbl`
   - 如果已算十神，可直接用“比肩/劫财/正印/偏印”来判断
6. **位置权重配置（规则集）**：年/月/日/时干与地支的加权系数



## 数据库建议（可按你已有命名调整）

### 1. 明细表：`bazi_support_detail_tbl`
记录每个“助力来源”的明细证据。
- `chart_id`
- `pillar`（year/month/day/hour）
- `source_type`（stem/hidden_stem）
- `stem`（天干）
- `element`
- `ten_god`（比肩/劫财/正印/偏印）
- `support_type`（same_class / shengfu）
- `hidden_rank`（主/中/余，仅藏干）
- `base_score`
- `position_weight`
- `hidden_weight`
- `final_score`
- `evidence_json`

### 2. 汇总表：`bazi_support_summary_tbl`
按 `chart_id` 汇总总分。
- `chart_id`
- `same_class_score`
- `shengfu_score`
- `total_support_score`
- `ruleset_id`
- `evidence_json`

### 3. 规则集表（可选）：`dict_support_ruleset`
- `ruleset_id`
- `base_score_same_class`（默认 1.0）
- `base_score_shengfu`（默认 1.0）
- `stem_position_weights`（json：年/月/日/时）
- `hidden_position_weights`（json：年/月/日/时）
- `hidden_rank_weights`（json：主/中/余）
- `include_day_stem`（是否计算日干本身，默认 false）



## 计算逻辑（可程序化）

### Step 0：获取日主
- 读取 `bazi_pillar_tbl` 的日干
- 查 `dict_heavenly_stem` 得到日主五行与阴阳

### Step 1：确定“助力来源”
两种方式任选其一：

**方式 A：直接用十神结果（推荐）**
- 从 `bazi_tenshen_detail_tbl` 读取所有“目标干”（四柱天干 + 藏干）
- 过滤 `ten_god ∈ {比肩, 劫财}` → 记为 `same_class`
- 过滤 `ten_god ∈ {正印, 偏印}` → 记为 `shengfu`

**方式 B：用五行关系判定**
- 对每个目标干 X：
  - 若 element_x == element_dm → 同类（比劫）
  - 若 element_x 生 element_dm → 生扶（印）
  - 其他关系忽略

### Step 2：计算单条贡献分
每条助力记录的分数计算：
```
final_score = base_score * position_weight * hidden_weight
```

**默认权重建议**（可放 ruleset 中调整）：
- `base_score_same_class = 1.0`
- `base_score_shengfu = 1.0`
- **天干位置权重**：年干 1.0、月干 1.3、日干 0.0（默认不计）、时干 1.1
- **地支位置权重**：年支 0.8、月支 1.2、日支 1.0、时支 0.9
- **藏干层级权重**：主气 1.0、中气 0.6、余气 0.3

说明：若 `include_day_stem = true`，可给日干设定最小权重（如 0.3）以避免“自我加分”。

### Step 3：汇总
- `same_class_score = sum(final_score where support_type = same_class)`
- `shengfu_score = sum(final_score where support_type = shengfu)`
- `total_support_score = same_class_score + shengfu_score`

### Step 4：证据结构（建议 JSON）
`evidence_json` 中存：
- 规则集 ID
- 所有权重配置
- 每条明细记录的原始信息（来源、十神、位置权重、最终分）



## 落库步骤
1. 计算并插入 `bazi_support_detail_tbl`
2. 汇总并插入 `bazi_support_summary_tbl`
3. 打印日志：
   - `same_class_score`
   - `shengfu_score`
   - `total_support_score`



## 接口与核心功能
- 后台程序（建议）：`/app/api/bazi/dezhu/route.ts`
- 与 step4 聚合接口衔接：`/app/api/bazi/step4.ts`
- 依赖数据：
  - `bazi_pillar_tbl`（四柱）
  - `dict_heavenly_stem`（五行阴阳）
  - `bazi_branch_hidden_stem_dict`（藏干）
  - `bazi_tenshen_detail_tbl`（十神明细，可选）
  - `dict_support_ruleset`（权重规则集，可选）



## 输出示例
```json
{
  "chart_id": "...",
  "same_class_score": 2.6,
  "shengfu_score": 3.1,
  "total_support_score": 5.7,
  "evidence": [
    {
      "pillar": "month",
      "source_type": "stem",
      "stem": "乙",
      "ten_god": "劫财",
      "support_type": "same_class",
      "base_score": 1.0,
      "position_weight": 1.3,
      "hidden_weight": 1.0,
      "final_score": 1.3
    },
    {
      "pillar": "day",
      "source_type": "hidden_stem",
      "stem": "癸",
      "ten_god": "正印",
      "support_type": "shengfu",
      "base_score": 1.0,
      "position_weight": 1.0,
      "hidden_weight": 0.6,
      "final_score": 0.6
    }
  ]
}
```

## PostgreSQL 建表语句（含 DROP 与字段备注）
文件路径：`/md/database/22_dezhu.sql`
