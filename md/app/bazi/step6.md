# 格局/成局/清纯与破格（规则引擎 + 落库设计）
用途：在“月令主气 + 透干十神 + 根气/旺衰 + 合冲刑害”的信息上跑规则引擎，输出“候选格局 + 证据 + 破格点 + 置信度”，用于可计算、可追溯、可落库的结构判断。

## 程序调用流程
`/app/bazi/page.tsx` -> `/app/api/bazi/step6.ts` -> `/app/api/bazi/ge_ju.ts`

## 需要的输入信息（必须）
1) 四柱原始数据：年/月/日/时干支  
2) 日主：日干五行阴阳  
3) 十神：天干（含月干）与地支藏干相对日主的十神  
4) 藏干结构：每支藏干（主/中/余）与透出情况（透干表）  
5) 月令信息：月支主气 + 月令旺相休囚死  
6) 旺衰/身强弱结论 + 证据  
7) 通根/得地：日主与关键十神（官杀、财、食伤、印、比劫）根气强度  
8) 得助（同类/生扶）  
9) 合冲刑害与成化判定  

## 计算拆解（规则引擎四步）
### 1) 格局候选识别（月令优先）
- 取月令主气对应十神  
- 判断月令之神是否透干  
- 判断得令/根气/旺衰是否成势  
- 输出：`candidate_patterns[]`（含证据）

### 2) 成局判定（地支气势）
- 三合/三会/六合化等：条件齐、得令、引化、冲破  
- 输出：`formation = formed/partial/broken` + 证据

### 3) 清纯度评分（混杂量化）
- 定义格局核心十神与忌神集合  
- 统计核心十神透干/位置/数量/强度  
- 统计忌神透出数量与强度  
- 输出：`purity_score (0~100)` + `mixing_flags[]`

### 4) 破格点识别（可扩展字典）
- 冲破月令/格神根  
- 伤官见官、枭印夺食、比劫夺财、财坏印、印坏财  
- 官杀混杂无制、财多身弱、身强无制  
- 合去用神、争合不化  
- 输出：`break_reasons[]`（类型/位置/强度/证据）

## 输出结构（建议）
- 候选格局列表（排序）  
- 每个候选：证据、破格点、分数、置信度  
- 可选：选出主格局（或保留待定）

## 数据库设计（建议三表）
### 1) 候选格局结果
表：`public.bazi_geju_candidate_result_tbl`
- `chart_id`
- `candidate_id`
- `pattern_code`（正官格/七杀格/食神格/伤官格/财格/印格…）
- `core_tenshen`
- `core_pillar`（月/年/日/时）
- `is_primary`
- `score`（0~100）
- `confidence`（0~1）
- `evidence_json`（月令主气、透干、根气、得令、旺衰、合冲刑害影响）
- `created_at`

### 2) 成局结果
表：`public.bazi_chengju_result_tbl`
- `chart_id`
- `formation_type`（三合/三会/六合化/半合/方局…）
- `formation_code`（申子辰水局、寅午戌火局…）
- `members`（json：参与地支/缺失地支）
- `status`（formed/partial/broken）
- `score`（0~100）
- `confidence`（0~1）
- `break_reasons_json`
- `evidence_json`
- `created_at`

### 3) 清纯与破格汇总
表：`public.bazi_poqing_summary_tbl`
- `chart_id`
- `primary_pattern_code`
- `purity_score`（0~100）
- `purity_level`（清/较清/偏杂/杂）
- `break_level`（无破/轻破/中破/重破）
- `break_reasons_json`
- `mixing_flags_json`
- `confidence`（0~1）
- `evidence_json`
- `created_at`

## 推荐计算流程（衔接现有步骤）
1) 读取：四柱、十神、藏干、透干、得令/得地/得助、合冲刑害、旺衰结论  
2) 运行：
   - `detect_pattern_candidates(chart)` → 写候选表  
   - `detect_formations(chart)` → 写成局表  
   - `score_purity_and_break(chart, selected_pattern)` → 写汇总表  

## 配置与工程建议
- 门派差异做成字典/配置表（主气取法、辰戌丑未规则、合化阈值、清纯评分权重）  
- 一律输出证据，避免只给“正官格”这种结论  
- 用“候选 + 证据 + 评分 + 置信度”替代绝对断语  

## 输出示例（JSON）
```json
{
  "candidates": [
    {
      "pattern_code": "正官格",
      "score": 86,
      "confidence": 0.78,
      "evidence": [
        "月令主气为正官",
        "正官透于月干",
        "正官在月支有根"
      ],
      "break_reasons": [
        "伤官透出，需评估是否见官"
      ]
    }
  ],
  "formations": [
    {
      "formation_code": "寅午戌火局",
      "status": "partial",
      "score": 58
    }
  ],
  "summary": {
    "primary_pattern_code": "正官格",
    "purity_score": 72,
    "purity_level": "较清",
    "break_level": "轻破"
  }
}
```
