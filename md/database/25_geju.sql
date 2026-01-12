-- =========================================================
-- Geju / Chengju / Purity & Break summary
-- Schema: public
-- =========================================================

DROP TABLE IF EXISTS public.bazi_geju_candidate_result_tbl;
DROP TABLE IF EXISTS public.bazi_chengju_result_tbl;
DROP TABLE IF EXISTS public.bazi_poqing_summary_tbl;

BEGIN;

-- -----------------------------
-- 1) Candidate patterns
-- -----------------------------
CREATE TABLE public.bazi_geju_candidate_result_tbl (
  id                BIGSERIAL PRIMARY KEY,
  chart_id          UUID NOT NULL,
  candidate_id      TEXT NULL,
  pattern_code      TEXT NOT NULL,
  core_tenshen      TEXT NULL,
  core_pillar       TEXT NULL
                    CHECK (core_pillar IN ('YEAR','MONTH','DAY','HOUR')),
  is_primary        BOOLEAN NOT NULL DEFAULT false,
  score             NUMERIC(12,4) NOT NULL DEFAULT 0,
  confidence        NUMERIC(12,4) NOT NULL DEFAULT 0,
  evidence_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bazi_geju_candidate_result_tbl IS
'Geju candidate list with evidence and confidence.';

COMMENT ON COLUMN public.bazi_geju_candidate_result_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_geju_candidate_result_tbl.candidate_id IS 'External candidate id (optional)';
COMMENT ON COLUMN public.bazi_geju_candidate_result_tbl.pattern_code IS 'Pattern code, e.g. Zhengguan/ Qisha/ Shishen/ Shangguan/ Cai/ Yin';
COMMENT ON COLUMN public.bazi_geju_candidate_result_tbl.core_tenshen IS 'Core tenshen for this pattern';
COMMENT ON COLUMN public.bazi_geju_candidate_result_tbl.core_pillar IS 'Core pillar: YEAR/MONTH/DAY/HOUR';
COMMENT ON COLUMN public.bazi_geju_candidate_result_tbl.is_primary IS 'Primary candidate flag';
COMMENT ON COLUMN public.bazi_geju_candidate_result_tbl.score IS 'Candidate score 0-100';
COMMENT ON COLUMN public.bazi_geju_candidate_result_tbl.confidence IS 'Confidence 0-1';
COMMENT ON COLUMN public.bazi_geju_candidate_result_tbl.evidence_json IS 'Evidence detail JSON';

CREATE INDEX IF NOT EXISTS idx_geju_candidate_chart
  ON public.bazi_geju_candidate_result_tbl(chart_id);

CREATE INDEX IF NOT EXISTS idx_geju_candidate_score
  ON public.bazi_geju_candidate_result_tbl(chart_id, score DESC);


-- -----------------------------
-- 2) Formation (Chengju)
-- -----------------------------
CREATE TABLE public.bazi_chengju_result_tbl (
  id                BIGSERIAL PRIMARY KEY,
  chart_id          UUID NOT NULL,
  formation_type    TEXT NOT NULL,
  formation_code    TEXT NOT NULL,
  members           JSONB NOT NULL DEFAULT '{}'::jsonb,
  status            TEXT NOT NULL
                    CHECK (status IN ('FORMED','PARTIAL','BROKEN')),
  score             NUMERIC(12,4) NOT NULL DEFAULT 0,
  confidence        NUMERIC(12,4) NOT NULL DEFAULT 0,
  break_reasons_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bazi_chengju_result_tbl IS
'Chengju formation result with evidence and break reasons.';

COMMENT ON COLUMN public.bazi_chengju_result_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_chengju_result_tbl.formation_type IS 'Formation type (sanhe/sanhui/liuhe/banhe/fangju/...)';
COMMENT ON COLUMN public.bazi_chengju_result_tbl.formation_code IS 'Formation code, e.g. ShenZiChen water';
COMMENT ON COLUMN public.bazi_chengju_result_tbl.members IS 'Members and missing branches JSON';
COMMENT ON COLUMN public.bazi_chengju_result_tbl.status IS 'FORMED/PARTIAL/BROKEN';
COMMENT ON COLUMN public.bazi_chengju_result_tbl.score IS 'Formation score 0-100';
COMMENT ON COLUMN public.bazi_chengju_result_tbl.confidence IS 'Confidence 0-1';
COMMENT ON COLUMN public.bazi_chengju_result_tbl.break_reasons_json IS 'Break reasons JSON';
COMMENT ON COLUMN public.bazi_chengju_result_tbl.evidence_json IS 'Evidence JSON';

CREATE INDEX IF NOT EXISTS idx_chengju_chart
  ON public.bazi_chengju_result_tbl(chart_id);

CREATE INDEX IF NOT EXISTS idx_chengju_status
  ON public.bazi_chengju_result_tbl(chart_id, status);


-- -----------------------------
-- 3) Purity & break summary
-- -----------------------------
CREATE TABLE public.bazi_poqing_summary_tbl (
  id                BIGSERIAL PRIMARY KEY,
  chart_id          UUID NOT NULL,
  primary_pattern_code TEXT NULL,
  purity_score      NUMERIC(12,4) NOT NULL DEFAULT 0,
  purity_level      TEXT NOT NULL
                    CHECK (purity_level IN ('CLEAN','RELATIVELY_CLEAN','MIXED','HEAVILY_MIXED')),
  break_level       TEXT NOT NULL
                    CHECK (break_level IN ('NONE','LIGHT','MEDIUM','HEAVY')),
  break_reasons_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  mixing_flags_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence        NUMERIC(12,4) NOT NULL DEFAULT 0,
  evidence_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_poqing_summary UNIQUE (chart_id)
);

COMMENT ON TABLE public.bazi_poqing_summary_tbl IS
'Purity and break summary for the selected pattern.';

COMMENT ON COLUMN public.bazi_poqing_summary_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_poqing_summary_tbl.primary_pattern_code IS 'Primary selected pattern code';
COMMENT ON COLUMN public.bazi_poqing_summary_tbl.purity_score IS 'Purity score 0-100';
COMMENT ON COLUMN public.bazi_poqing_summary_tbl.purity_level IS 'CLEAN/RELATIVELY_CLEAN/MIXED/HEAVILY_MIXED';
COMMENT ON COLUMN public.bazi_poqing_summary_tbl.break_level IS 'NONE/LIGHT/MEDIUM/HEAVY';
COMMENT ON COLUMN public.bazi_poqing_summary_tbl.break_reasons_json IS 'Break reasons JSON';
COMMENT ON COLUMN public.bazi_poqing_summary_tbl.mixing_flags_json IS 'Mixing flags JSON';
COMMENT ON COLUMN public.bazi_poqing_summary_tbl.confidence IS 'Confidence 0-1';
COMMENT ON COLUMN public.bazi_poqing_summary_tbl.evidence_json IS 'Evidence JSON';

CREATE INDEX IF NOT EXISTS idx_poqing_summary_chart
  ON public.bazi_poqing_summary_tbl(chart_id);

COMMIT;
