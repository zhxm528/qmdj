# 用神/喜神/忌神（规则引擎 + 落库设计）
用途：基于旺衰、格局、调候、冲合破坏等信息，计算用神/喜神/忌神，并输出可追溯的证据与置信度，便于算法实现与数据库落库。

## 程序调用流程
`/app/bazi/page.tsx` -> `/app/api/bazi/step7.ts` -> `/app/api/bazi/yongshen.ts`

## 需要的输入信息
### A. 最小必需信息
1) 四柱原盘（年/月/日/时干支、日主）  
2) 五行阴阳字典（天干/地支 -> 五行/阴阳）  
3) 藏干字典（主/中/余及层级或权重）  
4) 十神规则（相对日主）  
5) 月令/季节强弱（旺相休囚死或系数）  

### B. 强烈建议信息
6) 旺衰/身强弱结论 + 证据  
7) 格局/成局/清纯/破格（结构倾向）  
8) 合冲刑害破 + 合化判定  
9) 调候信息（寒暖燥湿）  

### C. 可选但很有价值
10) 大运流年（区分本命用神与运用神）  

## 可计算性说明
用神可以计算，但属于“规则系统 + 派别差异 + 证据权重”的综合判断。工程上必须输出：
- `rule_version / school_code`
- `score / confidence`
- `evidence_json`

## 计算框架（推荐四层）
### 第 1 层：旺衰层
输入：得令、得地(根)、得助(印比)、泄耗(食伤)、克制(官杀财)  
输出：`dm_strength_score` + `dm_strength_level`
- 身弱：优先生扶（印/比）为喜，忌克泄耗  
- 身强：优先泄耗制（食伤/财/官杀）为喜，忌再生扶  

### 第 2 层：格局/结构层
输入：月令主气十神、透干、成局、清纯破格  
输出：结构倾向与用神类型  
- 成格：用神偏向护格/通关/制化  
- 不成格：回到旺衰平衡  

### 第 3 层：病药/平衡层
识别主要矛盾为“病”，对应“药”的五行加分  
例：
- 太燥 -> 水润  
- 寒湿 -> 火暖土燥  
- 财多身弱 -> 印比  
- 官杀混杂攻身 -> 印化杀/食伤制杀/通关  

### 第 4 层：冲合破坏修正层
输入：合化是否成立、冲破用神根、争合夺合、刑害破坏  
输出：加减分 + 风险提示  

## 输出结构（建议）
- 用神（primary，1~2 个）  
- 喜神（Top N）  
- 忌神（Top N）  
- 每个五行输出：`score` / `confidence` / `reasons[]`  

## 数据库设计（推荐 2~3 表）
### 1) 用神结果主表
表：`public.bazi_yongshen_result_tbl`
- `chart_id`
- `calc_version`
- `school_code`
- `dm_strength_level`
- `dm_strength_score`
- `primary_yongshen_element`
- `secondary_yongshen_element`
- `xishen_elements`（jsonb 或 text[]）
- `jishen_elements`（jsonb 或 text[]）
- `confidence`
- `evidence_json`
- `created_at`

### 2) 五行评分明细表（可选）
表：`public.bazi_element_score_tbl`
- `chart_id`
- `element`（木火土金水）
- `score_total`
- `score_by_layer`（旺衰/结构/病药/修正）
- `reason_json`
- `created_at`

### 3) 规则/权重配置表
表：`public.bazi_yongshen_rule_config_tbl`
- `calc_version`
- `weights_json`
- `effective_from`
- `note`

## 推荐实现流程
1) 汇总中间结果：得令/得地/得助/十神/合冲刑害/合化  
2) 计算旺衰层 `dm_strength_score`  
3) 计算结构倾向  
4) 计算病药/调候层  
5) 冲合破坏修正  
6) 汇总五行总分 -> 用/喜/忌 + 证据 -> 落库（带版本）  

## 输出示例（JSON）
```json
{
  "primary": { "element": "木", "score": 0.86, "confidence": 0.72 },
  "secondary": { "element": "水", "score": 0.78, "confidence": 0.66 },
  "favorable": [
    { "element": "木", "score": 0.86, "reasons": ["身弱需生扶", "结构偏印"] },
    { "element": "水", "score": 0.78, "reasons": ["调候润燥"] }
  ],
  "unfavorable": [
    { "element": "金", "score": 0.22, "reasons": ["官杀混杂攻身"] }
  ],
  "evidence": {
    "dm_strength_level": "弱",
    "layers": {
      "strength": 0.40,
      "structure": 0.25,
      "balance": 0.20,
      "correction": 0.15
    }
  }
}
```
