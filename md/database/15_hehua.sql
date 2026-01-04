-- 若存在则先删除表
DROP TABLE IF EXISTS public.chart_hehua_result CASCADE;

-- 排盘计算结果：合、合化、以及证据明细
CREATE TABLE IF NOT EXISTS public.chart_hehua_result (
  id                  BIGSERIAL PRIMARY KEY,

  -- 你的排盘主表ID（如 public.chart.id）
  chart_id             BIGINT NOT NULL,

  -- 关系类型：干合 / 六合 / 三合 / 三会 / 冲 / 刑 / 害 / 破 / 克 / 其他
  -- 建议用固定字典的 code，例如：GAN_HE, ZHI_LIUHE, ZHI_SANHE, ZHI_SANHUI, CHONG, XING, HAI, PO, KE, OTHER
  relation_type        TEXT NOT NULL,

  -- 关系两端的符号：可能是天干(甲乙丙丁戊己庚辛壬癸) 或地支(子丑寅卯辰巳午未申酉戌亥)
  a                    TEXT NOT NULL,
  b                    TEXT NOT NULL,

  -- 是否在该盘中“出现并成立这对关系”（例如该盘内确实同时出现甲和己）
  is_formed            BOOLEAN NOT NULL DEFAULT FALSE,

  -- “合化候选五行”（仅表达候选方向，不代表一定合化）
  -- 若不是合类关系或无候选方向可为 NULL
  hua_element_candidate TEXT NULL,

  -- 是否判定“合化成立”（你的计算结论）
  is_hehua             BOOLEAN NOT NULL DEFAULT FALSE,

  -- 合化置信度/强度评分：0~1
  hehua_confidence     DOUBLE PRECISION NOT NULL DEFAULT 0.0,

  -- 证据明细：得令/通根/冲破/争合/助力/克制等
  evidence_json        JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- canonical：用于把 (a,b) 规范化，避免同一对被 (a,b) 和 (b,a) 写两次
  a_canon              TEXT GENERATED ALWAYS AS (LEAST(a, b)) STORED,
  b_canon              TEXT GENERATED ALWAYS AS (GREATEST(a, b)) STORED,

  -- 约束：置信度范围
  CONSTRAINT chk_hehua_confidence_range
    CHECK (hehua_confidence >= 0.0 AND hehua_confidence <= 1.0),

  -- 约束：五行候选值（允许 NULL）
  CONSTRAINT chk_hua_element_candidate
    CHECK (
      hua_element_candidate IS NULL
      OR hua_element_candidate IN ('木','火','土','金','水')
    ),

  -- 约束：a / b 必须是天干或地支之一（用文本存，避免 enum type 冲突）
  CONSTRAINT chk_a_is_ganzhi
    CHECK (
      a IN ('甲','乙','丙','丁','戊','己','庚','辛','壬','癸',
            '子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥')
    ),
  CONSTRAINT chk_b_is_ganzhi
    CHECK (
      b IN ('甲','乙','丙','丁','戊','己','庚','辛','壬','癸',
            '子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥')
    ),

  -- 关系类型建议范围（你如果想更开放，可删掉这个约束）
  CONSTRAINT chk_relation_type
    CHECK (
      relation_type IN (
        'GAN_HE',        -- 天干五合
        'ZHI_LIUHE',     -- 地支六合
        'ZHI_SANHE',     -- 地支三合
        'ZHI_SANHUI',    -- 地支三会
        'CHONG',         -- 冲
        'XING',          -- 刑
        'HAI',           -- 害
        'PO',            -- 破
        'KE',            -- 克
        'OTHER'          -- 其他
      )
    )
);

-- 同一 chart + 同一关系类型 + 同一对（忽略顺序）只允许一条
CREATE UNIQUE INDEX IF NOT EXISTS ux_chart_hehua_result_unique_pair
  ON public.chart_hehua_result (chart_id, relation_type, a_canon, b_canon);

-- 常用查询索引
CREATE INDEX IF NOT EXISTS ix_chart_hehua_result_chart_id
  ON public.chart_hehua_result (chart_id);

CREATE INDEX IF NOT EXISTS ix_chart_hehua_result_is_hehua
  ON public.chart_hehua_result (chart_id, is_hehua);

-- evidence_json 常用于按键查询（可选）
CREATE INDEX IF NOT EXISTS gin_chart_hehua_result_evidence
  ON public.chart_hehua_result USING GIN (evidence_json);
