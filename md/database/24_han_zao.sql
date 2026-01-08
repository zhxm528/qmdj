-- =========================================================
-- 寒暖燥湿与调候：证据与规则表
-- Schema: public
-- =========================================================

DROP TABLE IF EXISTS public.bazi_han_zao_detail_tbl;
DROP TABLE IF EXISTS public.bazi_han_zao_summary_tbl;
DROP TABLE IF EXISTS public.dict_han_zao_ruleset;

BEGIN;

-- -----------------------------
-- 1) 明细表：证据条目
-- -----------------------------
CREATE TABLE public.bazi_han_zao_detail_tbl (
  id                BIGSERIAL PRIMARY KEY,
  chart_id          UUID NOT NULL,                      -- 排盘ID（UUID）

  -- 证据类型：季节/五行分布/关键天干地支
  evidence_type     TEXT NOT NULL
                    CHECK (evidence_type IN ('SEASON','DISTRIBUTION','KEY_STEM_BRANCH')),

  -- 偏性：寒/热/燥/湿/中和
  tendency_type     TEXT NOT NULL
                    CHECK (tendency_type IN ('HAN','RE','ZAO','SHI','NEUTRAL')),

  -- 强度与分值
  strength_level    TEXT NOT NULL DEFAULT 'MEDIUM'
                    CHECK (strength_level IN ('LOW','MEDIUM','HIGH')),
  score             NUMERIC(12,4) NOT NULL DEFAULT 0,

  -- 说明
  reason            TEXT NULL,
  evidence_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bazi_han_zao_detail_tbl IS
'寒暖燥湿与调候证据明细：记录季节与五行分布的判定条目';

COMMENT ON COLUMN public.bazi_han_zao_detail_tbl.chart_id IS '排盘ID（UUID）';
COMMENT ON COLUMN public.bazi_han_zao_detail_tbl.evidence_type IS '证据类型：SEASON/DISTRIBUTION/KEY_STEM_BRANCH';
COMMENT ON COLUMN public.bazi_han_zao_detail_tbl.tendency_type IS '偏性：HAN/RE/ZAO/SHI/NEUTRAL';
COMMENT ON COLUMN public.bazi_han_zao_detail_tbl.strength_level IS '强度：LOW/MEDIUM/HIGH';
COMMENT ON COLUMN public.bazi_han_zao_detail_tbl.score IS '该条证据分值';
COMMENT ON COLUMN public.bazi_han_zao_detail_tbl.reason IS '人类可读说明';
COMMENT ON COLUMN public.bazi_han_zao_detail_tbl.evidence_json IS '证据JSON';

CREATE INDEX IF NOT EXISTS idx_han_zao_detail_chart
  ON public.bazi_han_zao_detail_tbl(chart_id);

CREATE INDEX IF NOT EXISTS idx_han_zao_detail_type
  ON public.bazi_han_zao_detail_tbl(chart_id, tendency_type);


-- -----------------------------
-- 2) 汇总表：偏性结论
-- -----------------------------
CREATE TABLE public.bazi_han_zao_summary_tbl (
  id                BIGSERIAL PRIMARY KEY,
  chart_id          UUID NOT NULL,                      -- 排盘ID（UUID）

  -- 偏性得分
  han_score         NUMERIC(14,4) NOT NULL DEFAULT 0,
  re_score          NUMERIC(14,4) NOT NULL DEFAULT 0,
  zao_score         NUMERIC(14,4) NOT NULL DEFAULT 0,
  shi_score         NUMERIC(14,4) NOT NULL DEFAULT 0,

  -- 结论
  final_tendency    TEXT NOT NULL DEFAULT 'NEUTRAL'
                    CHECK (final_tendency IN ('HAN','RE','ZAO','SHI','NEUTRAL')),

  -- 规则集与证据
  ruleset_id        TEXT NOT NULL DEFAULT 'default',
  evidence_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_han_zao_summary UNIQUE (chart_id)
);

COMMENT ON TABLE public.bazi_han_zao_summary_tbl IS
'寒暖燥湿与调候汇总：四类偏性得分与最终结论';

COMMENT ON COLUMN public.bazi_han_zao_summary_tbl.chart_id IS '排盘ID（UUID）';
COMMENT ON COLUMN public.bazi_han_zao_summary_tbl.han_score IS '偏寒得分';
COMMENT ON COLUMN public.bazi_han_zao_summary_tbl.re_score IS '偏热得分';
COMMENT ON COLUMN public.bazi_han_zao_summary_tbl.zao_score IS '偏燥得分';
COMMENT ON COLUMN public.bazi_han_zao_summary_tbl.shi_score IS '偏湿得分';
COMMENT ON COLUMN public.bazi_han_zao_summary_tbl.final_tendency IS '最终结论：HAN/RE/ZAO/SHI/NEUTRAL';
COMMENT ON COLUMN public.bazi_han_zao_summary_tbl.ruleset_id IS '规则集ID';
COMMENT ON COLUMN public.bazi_han_zao_summary_tbl.evidence_json IS '汇总证据JSON';

CREATE INDEX IF NOT EXISTS idx_han_zao_summary_chart
  ON public.bazi_han_zao_summary_tbl(chart_id);


-- -----------------------------
-- 3) 规则集：季节与五行权重
-- -----------------------------
CREATE TABLE public.dict_han_zao_ruleset (
  ruleset_id              TEXT PRIMARY KEY,

  -- 季节权重（春夏秋冬）及其对寒/热/燥/湿的倾向
  season_weights          JSONB NOT NULL,

  -- 五行分布权重（木火土金水对寒/热/燥/湿的倾向）
  element_weights         JSONB NOT NULL,

  -- 强度系数（LOW/MEDIUM/HIGH）
  strength_level_weights  JSONB NOT NULL,

  note                    TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.dict_han_zao_ruleset IS
'寒暖燥湿与调候规则集：季节与五行分布权重';

COMMENT ON COLUMN public.dict_han_zao_ruleset.ruleset_id IS '规则集ID';
COMMENT ON COLUMN public.dict_han_zao_ruleset.season_weights IS '季节权重';
COMMENT ON COLUMN public.dict_han_zao_ruleset.element_weights IS '五行分布权重';
COMMENT ON COLUMN public.dict_han_zao_ruleset.strength_level_weights IS '强度系数';
COMMENT ON COLUMN public.dict_han_zao_ruleset.note IS '备注';

-- 默认规则集
INSERT INTO public.dict_han_zao_ruleset (
  ruleset_id,
  season_weights,
  element_weights,
  strength_level_weights,
  note
) VALUES (
  'default',
  '{
    "spring": {"HAN": 0.3, "RE": 0.6, "ZAO": 0.4, "SHI": 0.5},
    "summer": {"HAN": 0.1, "RE": 0.9, "ZAO": 0.7, "SHI": 0.3},
    "autumn": {"HAN": 0.5, "RE": 0.3, "ZAO": 0.7, "SHI": 0.2},
    "winter": {"HAN": 0.9, "RE": 0.1, "ZAO": 0.2, "SHI": 0.7}
  }'::jsonb,
  '{
    "木": {"HAN": 0.2, "RE": 0.4, "ZAO": 0.2, "SHI": 0.4},
    "火": {"HAN": 0.0, "RE": 0.8, "ZAO": 0.6, "SHI": 0.1},
    "土": {"HAN": 0.2, "RE": 0.3, "ZAO": 0.6, "SHI": 0.2},
    "金": {"HAN": 0.5, "RE": 0.2, "ZAO": 0.5, "SHI": 0.1},
    "水": {"HAN": 0.7, "RE": 0.1, "ZAO": 0.1, "SHI": 0.8}
  }'::jsonb,
  '{"LOW": 0.7, "MEDIUM": 1.0, "HIGH": 1.3}'::jsonb,
  '默认规则集：季节与五行分布权重'
)
ON CONFLICT (ruleset_id) DO NOTHING;

COMMIT;
