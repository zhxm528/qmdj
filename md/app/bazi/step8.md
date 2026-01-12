# 验盘（病药自洽）模块设计（规则引擎 + 落库设计）
用途：把前面步骤（旺衰/格局/用神喜忌/调候等）的产物做一致性校验，输出风险提示与证据归档，作为可落库的质检模块。
## 程序调用流程
`/app/bazi/page.tsx` -> `/app/api/bazi/step8.ts` -> `/app/api/bazi/check.ts`

## 1) 验盘目标
### A. 盘面校验（硬校验）
- 历法与时间：公历/农历换算、时区、DST、真太阳时（如支持）
- 四柱合法性：干支是否在60甲子内、月柱是否与节令月一致
- 数据完整性：四柱、藏干、十神、五行阴阳、月支等字段齐全

### B. 病药自洽（软校验）
- 病：失衡点、气候偏枯、结构阻塞、过旺过弱、通关缺失等
- 药：用神/调候/通关/扶抑是否对症
- 自洽：药是否能缓解病、证据链是否闭合、矛盾点是否标记

## 2) 计算所需输入
### A. 基础排盘（必须）
- 出生时间（含时区/经纬度/DST如支持）
- 四柱干支（年/月/日/时）

### B. 固定字典（必须）
- 天干/地支 -> 五行/阴阳
- 地支藏干（主/中/余 + 权重）
- 十神规则（相对日主）
- 合冲刑害破/三合三会六合/天干五合
- 月令/季节字典（节令月）

### C. 中间结果（强烈建议）
- 得令/得地/得助
- 旺衰结论（强/弱/偏强/偏弱/从格可能性 + 证据）
- 格局/成局/清纯破格（含证据）
- 用神/喜神/忌神（含版本/证据）
- 调候要素（寒热燥湿）

## 3) 计算框架（规则引擎 + 打分）
### Step 1：生成“病（disease）标签”
示例标签：
- 扶抑类：`dm_too_strong` / `dm_too_weak` / `borderline`
- 调候类：`cold_need_fire` / `hot_need_water` / `dry_need_moist` / `damp_need_dry`
- 结构阻塞类：`blocked_by_clash` / `no_bridge_element` / `stuck_in_guan_sha`
- 五行偏枯：`element_missing_x` / `element_excess_x`
- 运行风险：`from_pattern_uncertain` / `pattern_conflict`

依据来源：
- 得令/得地/得助汇总强弱
- 月令季节与寒热燥湿
- 合冲刑害破密度与作用点
- 五行分布（含藏干加权）

### Step 2：生成“药（remedy）候选”
- `primary_yongshen`：第一用神方向（扶/抑/通关/泄/化）
- `tiao_hou`：调候方向（先火暖/先水润）
- `bridge_element`：通关五行（如金木交战需水通关）
- `avoid_elements`：忌神方向

### Step 3：自洽评分（consistency_score）
输出：
- `consistency_score`（0~1）
- `issues[]`：不一致点
- `evidence_json`：问题证据链

例：
- 病为 `cold_need_fire`，但用神喜水/喜金且无火可用证据 → 扣分
- 病为 `dm_too_weak`，用神却是泄耗日主 → 标记“扶抑矛盾”
- 从格可能性高，但用神仍按普通扶抑 → 标记冲突

## 4) 输出结构（建议）
```json
{
  "hard_check": {
    "is_valid": true,
    "issues": []
  },
  "disease_tags": ["dm_too_weak", "cold_need_fire"],
  "remedy_candidates": {
    "primary_yongshen": "火",
    "tiao_hou": "火暖",
    "bridge_element": "土",
    "avoid_elements": ["水"]
  },
  "consistency_score": 0.68,
  "issues": [
    {
      "type": "remedy_mismatch",
      "message": "寒病需火，但用神偏水且无火根证据",
      "evidence": {
        "climate": "cold_need_fire",
        "yongshen": "水",
        "rootqi": "火弱"
      }
    }
  ]
}
```

## 5) 数据库设计（建议 2~3 表）
### 1) 验盘结果主表
表：`public.bazi_check_result_tbl`
- `chart_id`
- `calc_version`
- `is_valid`（硬校验）
- `consistency_score`（0~1）
- `disease_tags_json`
- `remedy_json`
- `issues_json`
- `evidence_json`
- `created_at`

### 2) 验盘问题明细表（可选）
表：`public.bazi_check_issue_tbl`
- `chart_id`
- `issue_type`
- `severity`
- `message`
- `evidence_json`
- `created_at`

### 3) 规则/权重配置表（可选）
表：`public.bazi_check_rule_config_tbl`
- `calc_version`
- `weights_json`
- `effective_from`
- `note`

## 6) 推荐实现流程
1) 硬校验：历法/时区/DST/四柱合法性/字段完整性  
2) 生成病标签  
3) 生成药候选  
4) 自洽评分 + issues  
5) 汇总输出 -> 落库  
