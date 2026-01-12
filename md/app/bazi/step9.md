# 十神专题画像（静态）（规则引擎 + 落库设计）
用途：以日主为参照，对盘中十神做结构化统计与强弱权重，形成可落库的画像快照（不依赖大运流年）。

## 程序调用流程
`/app/bazi/page.tsx` -> `/app/api/bazi/step9.ts` -> `/app/api/bazi/tenshen_profile.ts`

## 1) 输入信息
### A. 盘面基础（必需）
- 四柱：年/月/日/时干支
- 日主（日干）
- 历法校验结果（可选但建议落库：时区/DST/真太阳时规则）

### B. 固定字典（必需）
- 天干 -> 五行/阴阳
- 地支 -> 藏干列表（主/中/余）
- 十神判定规则（相对日主）
- 五行生克关系

### C. 中间结果（建议）
- 藏干透出/根气/通根
- 得令（旺相休囚死）
- 得助（同类与生扶）
- 合冲刑害破（修正权重）
- （可选）格局/用神结果（用于解释层，不影响十神本体）

## 2) 输出指标（静态画像四层）
### 层1：出现情况
- 是否出现（0/1）
- 次数（天干/藏干/合计）
- 位置分布（年干/月干/日支/时支…）

### 层2：力度评分
- raw_score（来源权重）
- season_boost（得令修正）
- root_boost（根气修正）
- relation_adjust（合冲刑害修正）
- effective_score（归一化 0~100）

### 层3：结构特征
- Top-N 主导十神
- 六大类占比（财/官/印/食伤/比劫）
- 偏/正失衡（偏财>>正财等）
- 常见结构倾向（杀印相生、食伤生财等，仅作倾向）

### 层4：证据链
- 每个十神证据条目（来源、强度、通根、得令、冲合影响）

## 3) 计算方法概要
### Step 1：枚举候选干
- 明透天干：年干/月干/日干/时干
- 藏干：主/中/余

### Step 2：基础权重 raw_score（建议）
- 明透天干：1.00
- 藏干主气：0.70
- 藏干中气：0.40
- 藏干余气：0.20

### Step 3：得令修正 season_boost
- 旺=1.20，相=1.10，休=0.90，囚=0.80，死=0.70

### Step 4：根气修正 root_boost
- 无根=1.00，弱根=1.05，中根=1.10，强根=1.20

### Step 5：关系修正 relation_adjust
- 被强冲破：×0.85
- 逢合不化：×0.95
- 合化成功：原五行减权，化后五行加权

最终：
`effective_score = raw_score * season_boost * root_boost * relation_adjust`

## 4) 数据库设计（推荐 1主 + 1明细 + 1证据）
### 4.1 主表：画像汇总
`public.bazi_tenshen_profile_static_tbl`
- chart_id
- version
- generated_at
- profile_json
- confidence
- notes

### 4.2 明细表：十神聚合结果（10行/盘）
`public.bazi_tenshen_profile_static_item_tbl`
- chart_id
- tenshen_code
- count_stem / count_hidden / count_total
- score_stem / score_hidden / score_total
- rank_no
- is_present
- evidence_json

### 4.3 证据表（可选但推荐）
`public.bazi_tenshen_evidence_tbl`
- chart_id
- tenshen_code
- pillar（年/月/日/时）
- source_type（STEM / HIDDEN_MAIN / HIDDEN_MID / HIDDEN_TAIL）
- stem_code
- element / yinyang
- base_weight
- season_factor
- root_factor
- relation_factor
- effective_weight
- tags
- meta_json

## 5) 输出示例（JSON）
```json
{
  "top_tenshen": ["正官", "偏印", "食神"],
  "category_ratio": {
    "财": 0.18,
    "官杀": 0.22,
    "印": 0.20,
    "食伤": 0.16,
    "比劫": 0.24
  },
  "items": [
    {
      "tenshen": "正官",
      "count_total": 3,
      "score_total": 78.5,
      "rank": 1
    }
  ]
}
```
