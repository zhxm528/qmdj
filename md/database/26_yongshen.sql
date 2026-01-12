-- =========================================================
-- Yongshen / Xishen / Jishen: result + element score + ruleset
-- Schema: public
-- =========================================================

BEGIN;

-- -----------------------------
-- 1) Yongshen result
-- -----------------------------
DROP TABLE IF EXISTS public.bazi_yongshen_result_tbl CASCADE;

CREATE TABLE public.bazi_yongshen_result_tbl (
  id                         BIGSERIAL PRIMARY KEY,
  chart_id                   UUID NOT NULL,
  calc_version               TEXT NOT NULL DEFAULT 'v1',
  school_code                TEXT NULL,
  dm_strength_level          TEXT NOT NULL,
  dm_strength_score          NUMERIC(12,4) NOT NULL DEFAULT 0,
  primary_yongshen_element   TEXT NOT NULL
                             CHECK (primary_yongshen_element IN ('木','火','土','金','水')),
  secondary_yongshen_element TEXT NULL
                             CHECK (secondary_yongshen_element IN ('木','火','土','金','水')),
  xishen_elements            JSONB NOT NULL DEFAULT '[]'::jsonb,
  jishen_elements            JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence                 NUMERIC(12,4) NOT NULL DEFAULT 0,
  evidence_json              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_yongshen_result UNIQUE (chart_id, calc_version)
);

COMMENT ON TABLE public.bazi_yongshen_result_tbl IS
'Yongshen result: primary/secondary + xishen/jishen + evidence.';

COMMENT ON COLUMN public.bazi_yongshen_result_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_yongshen_result_tbl.calc_version IS 'Rule version';
COMMENT ON COLUMN public.bazi_yongshen_result_tbl.school_code IS 'School code (optional)';
COMMENT ON COLUMN public.bazi_yongshen_result_tbl.dm_strength_level IS 'DM strength level';
COMMENT ON COLUMN public.bazi_yongshen_result_tbl.dm_strength_score IS 'DM strength score';
COMMENT ON COLUMN public.bazi_yongshen_result_tbl.primary_yongshen_element IS 'Primary element';
COMMENT ON COLUMN public.bazi_yongshen_result_tbl.secondary_yongshen_element IS 'Secondary element';
COMMENT ON COLUMN public.bazi_yongshen_result_tbl.xishen_elements IS 'Favorable elements list (json)';
COMMENT ON COLUMN public.bazi_yongshen_result_tbl.jishen_elements IS 'Unfavorable elements list (json)';
COMMENT ON COLUMN public.bazi_yongshen_result_tbl.confidence IS 'Confidence 0-1';
COMMENT ON COLUMN public.bazi_yongshen_result_tbl.evidence_json IS 'Evidence JSON';

CREATE INDEX IF NOT EXISTS idx_yongshen_result_chart
  ON public.bazi_yongshen_result_tbl(chart_id);


-- -----------------------------
-- 2) Element score detail (optional)
-- -----------------------------
DROP TABLE IF EXISTS public.bazi_element_score_tbl CASCADE;

CREATE TABLE public.bazi_element_score_tbl (
  id            BIGSERIAL PRIMARY KEY,
  chart_id      UUID NOT NULL,
  element       TEXT NOT NULL
               CHECK (element IN ('木','火','土','金','水')),
  score_total   NUMERIC(12,4) NOT NULL DEFAULT 0,
  score_by_layer JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_element_score UNIQUE (chart_id, element)
);

COMMENT ON TABLE public.bazi_element_score_tbl IS
'Element score detail for Yongshen calculation.';

COMMENT ON COLUMN public.bazi_element_score_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_element_score_tbl.element IS 'Element (木火土金水)';
COMMENT ON COLUMN public.bazi_element_score_tbl.score_total IS 'Total score';
COMMENT ON COLUMN public.bazi_element_score_tbl.score_by_layer IS 'Layer scores JSON';
COMMENT ON COLUMN public.bazi_element_score_tbl.reason_json IS 'Reason JSON';

CREATE INDEX IF NOT EXISTS idx_element_score_chart
  ON public.bazi_element_score_tbl(chart_id);


-- -----------------------------
-- 3) Rule config / weights
-- -----------------------------
DROP TABLE IF EXISTS public.bazi_yongshen_rule_config_tbl CASCADE;

CREATE TABLE public.bazi_yongshen_rule_config_tbl (
  calc_version   TEXT PRIMARY KEY,
  weights_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ NULL,
  note           TEXT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bazi_yongshen_rule_config_tbl IS
'Yongshen rule config with weights and thresholds.';

COMMENT ON COLUMN public.bazi_yongshen_rule_config_tbl.calc_version IS 'Rule version';
COMMENT ON COLUMN public.bazi_yongshen_rule_config_tbl.weights_json IS 'Weights JSON';
COMMENT ON COLUMN public.bazi_yongshen_rule_config_tbl.effective_from IS 'Effective from timestamp';
COMMENT ON COLUMN public.bazi_yongshen_rule_config_tbl.note IS 'Note';

COMMIT;
