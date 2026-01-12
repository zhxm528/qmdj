-- =========================================================
-- Check / Consistency (disease-remedy validation)
-- Schema: public
-- =========================================================

BEGIN;

-- -----------------------------
-- 1) Main check result
-- -----------------------------
DROP TABLE IF EXISTS public.bazi_check_result_tbl CASCADE;

CREATE TABLE public.bazi_check_result_tbl (
  id                 BIGSERIAL PRIMARY KEY,
  chart_id           UUID NOT NULL,
  calc_version       TEXT NOT NULL DEFAULT 'v1',
  is_valid           BOOLEAN NOT NULL DEFAULT true,
  consistency_score  NUMERIC(12,4) NOT NULL DEFAULT 0,
  disease_tags_json  JSONB NOT NULL DEFAULT '[]'::jsonb,
  remedy_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  issues_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_check_result UNIQUE (chart_id, calc_version)
);

COMMENT ON TABLE public.bazi_check_result_tbl IS
'Consistency check result: hard validation + disease/remedy alignment.';

COMMENT ON COLUMN public.bazi_check_result_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_check_result_tbl.calc_version IS 'Rule version';
COMMENT ON COLUMN public.bazi_check_result_tbl.is_valid IS 'Hard validation result';
COMMENT ON COLUMN public.bazi_check_result_tbl.consistency_score IS 'Consistency score 0-1';
COMMENT ON COLUMN public.bazi_check_result_tbl.disease_tags_json IS 'Disease tags JSON';
COMMENT ON COLUMN public.bazi_check_result_tbl.remedy_json IS 'Remedy candidates JSON';
COMMENT ON COLUMN public.bazi_check_result_tbl.issues_json IS 'Issues JSON';
COMMENT ON COLUMN public.bazi_check_result_tbl.evidence_json IS 'Evidence JSON';

CREATE INDEX IF NOT EXISTS idx_check_result_chart
  ON public.bazi_check_result_tbl(chart_id);


-- -----------------------------
-- 2) Check issues detail (optional)
-- -----------------------------
DROP TABLE IF EXISTS public.bazi_check_issue_tbl CASCADE;

CREATE TABLE public.bazi_check_issue_tbl (
  id            BIGSERIAL PRIMARY KEY,
  chart_id      UUID NOT NULL,
  issue_type    TEXT NOT NULL,
  severity      TEXT NOT NULL
               CHECK (severity IN ('LOW','MEDIUM','HIGH')),
  message       TEXT NOT NULL,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bazi_check_issue_tbl IS
'Consistency issues detail: each row is a detected issue.';

COMMENT ON COLUMN public.bazi_check_issue_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_check_issue_tbl.issue_type IS 'Issue type';
COMMENT ON COLUMN public.bazi_check_issue_tbl.severity IS 'Severity LOW/MEDIUM/HIGH';
COMMENT ON COLUMN public.bazi_check_issue_tbl.message IS 'Issue message';
COMMENT ON COLUMN public.bazi_check_issue_tbl.evidence_json IS 'Evidence JSON';

CREATE INDEX IF NOT EXISTS idx_check_issue_chart
  ON public.bazi_check_issue_tbl(chart_id);


-- -----------------------------
-- 3) Rule config (optional)
-- -----------------------------
DROP TABLE IF EXISTS public.bazi_check_rule_config_tbl CASCADE;

CREATE TABLE public.bazi_check_rule_config_tbl (
  calc_version   TEXT PRIMARY KEY,
  weights_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ NULL,
  note           TEXT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bazi_check_rule_config_tbl IS
'Check rule config with weights and thresholds.';

COMMENT ON COLUMN public.bazi_check_rule_config_tbl.calc_version IS 'Rule version';
COMMENT ON COLUMN public.bazi_check_rule_config_tbl.weights_json IS 'Weights JSON';
COMMENT ON COLUMN public.bazi_check_rule_config_tbl.effective_from IS 'Effective from timestamp';
COMMENT ON COLUMN public.bazi_check_rule_config_tbl.note IS 'Note';

COMMIT;
