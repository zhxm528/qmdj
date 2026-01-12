-- =========================================================
-- Dayun (10-year fortune cycles): meta + result tables
-- Schema: public
-- =========================================================

BEGIN;

-- -----------------------------
-- Drop existing tables (if any)
-- -----------------------------
DROP TABLE IF EXISTS public.bazi_dayun_result_tbl CASCADE;
DROP TABLE IF EXISTS public.bazi_dayun_meta_tbl CASCADE;

-- -----------------------------
-- 1) Meta: direction + start time
-- -----------------------------
CREATE TABLE public.bazi_dayun_meta_tbl (
  id                    BIGSERIAL PRIMARY KEY,
  chart_id              UUID NOT NULL,
  direction             TEXT NOT NULL
                        CHECK (direction IN ('FORWARD','BACKWARD')),
  start_age             NUMERIC(12,4) NOT NULL DEFAULT 0,
  start_datetime        TIMESTAMPTZ NULL,
  start_year            INT NULL,
  start_month           INT NULL,
  year_stem_yinyang     TEXT NOT NULL
                        CHECK (year_stem_yinyang IN ('YIN','YANG')),
  gender                TEXT NOT NULL
                        CHECK (gender IN ('MALE','FEMALE')),
  rule_version          TEXT NOT NULL DEFAULT 'main_v1',
  diff_days             NUMERIC(12,4) NOT NULL DEFAULT 0,
  target_jieqi_name     TEXT NULL,
  target_jieqi_datetime TIMESTAMPTZ NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_dayun_meta UNIQUE (chart_id, rule_version)
);

COMMENT ON TABLE public.bazi_dayun_meta_tbl IS
'Dayun meta: direction, start age, target jieqi, rule version.';

COMMENT ON COLUMN public.bazi_dayun_meta_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_dayun_meta_tbl.direction IS 'FORWARD/BACKWARD';
COMMENT ON COLUMN public.bazi_dayun_meta_tbl.start_age IS 'Start age (years)';
COMMENT ON COLUMN public.bazi_dayun_meta_tbl.start_datetime IS 'Start datetime';
COMMENT ON COLUMN public.bazi_dayun_meta_tbl.start_year IS 'Start year (Gregorian)';
COMMENT ON COLUMN public.bazi_dayun_meta_tbl.start_month IS 'Start month (Gregorian)';
COMMENT ON COLUMN public.bazi_dayun_meta_tbl.year_stem_yinyang IS 'Year stem yinyang';
COMMENT ON COLUMN public.bazi_dayun_meta_tbl.gender IS 'Gender';
COMMENT ON COLUMN public.bazi_dayun_meta_tbl.rule_version IS 'Rule version';
COMMENT ON COLUMN public.bazi_dayun_meta_tbl.diff_days IS 'Days between birth and target jieqi';
COMMENT ON COLUMN public.bazi_dayun_meta_tbl.target_jieqi_name IS 'Target jieqi name';
COMMENT ON COLUMN public.bazi_dayun_meta_tbl.target_jieqi_datetime IS 'Target jieqi datetime';

CREATE INDEX IF NOT EXISTS idx_dayun_meta_chart
  ON public.bazi_dayun_meta_tbl(chart_id);


-- -----------------------------
-- 2) Dayun result list
-- -----------------------------
CREATE TABLE public.bazi_dayun_result_tbl (
  id                  BIGSERIAL PRIMARY KEY,
  chart_id            UUID NOT NULL,
  seq                INT NOT NULL,
  dayun_gan           TEXT NOT NULL,
  dayun_zhi           TEXT NOT NULL,
  dayun_pillar        TEXT NOT NULL,
  start_age           NUMERIC(12,4) NOT NULL DEFAULT 0,
  start_year          INT NOT NULL,
  start_month         INT NOT NULL,
  end_year            INT NOT NULL,
  end_month           INT NOT NULL,
  direction           TEXT NOT NULL
                      CHECK (direction IN ('FORWARD','BACKWARD')),
  source_month_pillar TEXT NOT NULL,
  evidence_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_dayun_result UNIQUE (chart_id, seq)
);

COMMENT ON TABLE public.bazi_dayun_result_tbl IS
'Dayun result list: 10-year cycles based on month pillar.';

COMMENT ON COLUMN public.bazi_dayun_result_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_dayun_result_tbl.seq IS 'Sequence number';
COMMENT ON COLUMN public.bazi_dayun_result_tbl.dayun_gan IS 'Dayun stem';
COMMENT ON COLUMN public.bazi_dayun_result_tbl.dayun_zhi IS 'Dayun branch';
COMMENT ON COLUMN public.bazi_dayun_result_tbl.dayun_pillar IS 'Dayun pillar';
COMMENT ON COLUMN public.bazi_dayun_result_tbl.start_age IS 'Start age (years)';
COMMENT ON COLUMN public.bazi_dayun_result_tbl.start_year IS 'Start year (Gregorian)';
COMMENT ON COLUMN public.bazi_dayun_result_tbl.start_month IS 'Start month (Gregorian)';
COMMENT ON COLUMN public.bazi_dayun_result_tbl.end_year IS 'End year (Gregorian)';
COMMENT ON COLUMN public.bazi_dayun_result_tbl.end_month IS 'End month (Gregorian)';
COMMENT ON COLUMN public.bazi_dayun_result_tbl.direction IS 'FORWARD/BACKWARD';
COMMENT ON COLUMN public.bazi_dayun_result_tbl.source_month_pillar IS 'Source month pillar';
COMMENT ON COLUMN public.bazi_dayun_result_tbl.evidence_json IS 'Evidence JSON';

CREATE INDEX IF NOT EXISTS idx_dayun_result_chart
  ON public.bazi_dayun_result_tbl(chart_id);

CREATE INDEX IF NOT EXISTS idx_dayun_result_chart_seq
  ON public.bazi_dayun_result_tbl(chart_id, seq);

COMMIT;
