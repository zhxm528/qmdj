# "合化"的算法
## 合化判定：工程化算法流程
以"天干五合"为例：对每一对可能的干合，跑下面流程。
## Step 0：找出"出现的干合对"（is_formed）
在命盘四柱的 4 个天干中，枚举两两组合：
- 如果 `(stem_i, stem_j)` 在五合字典里 → `is_formed = true`
- 同时得出 `hua_element_candidate`

这一层只看"有没有这两干"，不判断化不化。

## Step 1：算"合的有效性"（合而不化先别急）

给一个 `form_score`（0~1），主要看这对合有没有被破坏：

### 1.1 争合扣分（competition）

- 如果 A 同时与多个干构成五合关系：对每个额外合对扣分
- 如果 B 也同样争合，继续扣分
- （争合越多，合越不专，越难稳定化）

### 1.2 冲破/合绊扣分（break）

工程上常用的处理：

- 若 A 或 B 所在柱的地支，与对方柱地支形成强冲/刑害破，扣分
- 若 A/B 被强克（例如候选化土但盘里木太旺克土、且土无根），扣分
- 若 A/B 各自坐下地支对其五行极不利，也扣分

这一层你不需要"传统全套细则"，只要把"会导致不稳定"的因素结构化即可。

## Step 2：算"化的条件是否具备"（核心：得令 + 通根 + 气势支持）

给一个 `transform_score`（0~1），看候选五行有没有"成气"：

### 2.1 得令（season / month-branch support）

- 候选五行在当令旺/相：加分
- 休/囚/死：扣分

### 2.2 通根（rooting）

- 候选五行在地支藏干里有根：加分（主气根 > 中气根 > 余气根）
- 合化五行完全无根：强扣分（很多流派这里就直接判"不化"）

### 2.3 生扶（support）

- 盘中能生扶候选五行的元素足：加分
- 候选五行被强克且无制：扣分

工程上你可以把"五行强度"做成一个向量，直接用于打分：

```
support = f(element_strength[candidate], element_strength[producer], element_strength[controller])
```

## Step 3：合并成最终判定与置信度

一个简单、稳定的合并方式：

```
confidence = clamp(0.45 * form_score + 0.55 * transform_score, 0, 1)
```

```
is_hehua = (confidence >= threshold)
```

阈值你可以先用 0.65 或 0.7，后续用真实案例调参。

同时保留：

- `hua_element_candidate`：字典结论
- `final_element`：如果 `is_hehua` 才写，否则为空/NULL

## 输入字段（对应 chart_hehua_result）

你给的表结构很对，算法侧只需要你额外准备/可引用的输入：

### 必需输入

- `chart_id`
- 四柱天干地支（用于枚举干合对 + 冲破判断 + 藏干通根）
- 月令（通常就是月支）
- 五合字典、藏干字典、冲合刑害破字典、五行生克字典

### 强烈建议（为了可解释性与可调参）

- `chart_strength_snapshot`（五行强度、每干通根结果、冲刑害破摘要）
- 或至少能查询到：`stem_rooting_result`（每个天干在四支的根）

## evidence_json：推荐结构（让你的结果"可解释、可回放"）

你表里 `evidence_json`（得令/通根/冲破/争合等明细）建议统一成这样：

```json
{
  "pair": {
    "a": "甲",
    "b": "己"
  },
  "candidate_element": "土",
  "formed": {
    "form_score": 0.72,
    "competition": {
      "a_competes_with": ["甲庚合?"],
      "b_competes_with": [],
      "penalty": 0.10
    },
    "break": {
      "branch_clash": [
        {
          "type": "冲",
          "from": "A坐支",
          "to": "B坐支",
          "penalty": 0.08
        }
      ],
      "penalty_total": 0.08
    }
  },
  "transform": {
    "transform_score": 0.81,
    "season": {
      "month_branch": "寅",
      "candidate_state": "相",
      "bonus": 0.15
    },
    "rooting": {
      "has_root": true,
      "roots": [
        {
          "branch": "辰",
          "hidden_stem": "戊",
          "weight": "主气",
          "bonus": 0.20
        }
      ]
    },
    "support": {
      "element_strength": {
        "土": 0.62,
        "火": 0.55,
        "木": 0.70,
        "金": 0.30,
        "水": 0.25
      },
      "producer": "火",
      "controller": "木",
      "net_bonus": 0.10
    }
  },
  "final": {
    "confidence": 0.77,
    "is_hehua": true,
    "threshold": 0.70
  }
}
```


## 核心功能
- 按照上述逻辑，在后台程序：`/app/api/bazi/hehua/route.ts` 中实现获取合化结果的功能