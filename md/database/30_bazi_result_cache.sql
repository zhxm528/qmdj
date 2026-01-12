-- =========================================================
-- Bazi chart cached result (per chart_id)
-- Schema: public
-- =========================================================

BEGIN;

DROP TABLE IF EXISTS public.bazi_chart_result_tbl CASCADE;

CREATE TABLE public.bazi_chart_result_tbl (
  chart_id    UUID PRIMARY KEY
              REFERENCES public.bazi_chart_tbl(chart_id) ON DELETE CASCADE,
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bazi_chart_result_tbl IS
'Cached bazi result JSON for each chart_id.';

COMMENT ON COLUMN public.bazi_chart_result_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_chart_result_tbl.result_json IS 'Cached result JSON';

CREATE INDEX IF NOT EXISTS idx_bazi_chart_result_updated_at
  ON public.bazi_chart_result_tbl(updated_at DESC);

COMMIT;
