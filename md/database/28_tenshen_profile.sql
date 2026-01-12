-- =========================================================
-- Tenshen static profile (summary + items + evidence)
-- Schema: public
-- =========================================================

BEGIN;

-- -----------------------------
-- 1) Profile summary
-- -----------------------------
DROP TABLE IF EXISTS public.bazi_tenshen_profile_static_tbl CASCADE;

CREATE TABLE public.bazi_tenshen_profile_static_tbl (
  id            BIGSERIAL PRIMARY KEY,
  chart_id      UUID NOT NULL,
  version       TEXT NOT NULL DEFAULT 'v1',
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  profile_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence    NUMERIC(12,4) NOT NULL DEFAULT 0,
  notes         TEXT NULL,

  CONSTRAINT uq_tenshen_profile UNIQUE (chart_id, version)
);

COMMENT ON TABLE public.bazi_tenshen_profile_static_tbl IS
'Static tenshen profile summary.';

COMMENT ON COLUMN public.bazi_tenshen_profile_static_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_tbl.version IS 'Algorithm version';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_tbl.generated_at IS 'Generated at';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_tbl.profile_json IS 'Profile JSON';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_tbl.confidence IS 'Confidence 0-1';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_tbl.notes IS 'Notes / warnings';

CREATE INDEX IF NOT EXISTS idx_tenshen_profile_chart
  ON public.bazi_tenshen_profile_static_tbl(chart_id);


-- -----------------------------
-- 2) Profile items (10 rows per chart)
-- -----------------------------
DROP TABLE IF EXISTS public.bazi_tenshen_profile_static_item_tbl CASCADE;

CREATE TABLE public.bazi_tenshen_profile_static_item_tbl (
  id           BIGSERIAL PRIMARY KEY,
  chart_id     UUID NOT NULL,
  tenshen_code TEXT NOT NULL,
  count_stem   INTEGER NOT NULL DEFAULT 0,
  count_hidden INTEGER NOT NULL DEFAULT 0,
  count_total  INTEGER NOT NULL DEFAULT 0,
  score_stem   NUMERIC(12,4) NOT NULL DEFAULT 0,
  score_hidden NUMERIC(12,4) NOT NULL DEFAULT 0,
  score_total  NUMERIC(12,4) NOT NULL DEFAULT 0,
  rank_no      INTEGER NOT NULL DEFAULT 0,
  is_present   BOOLEAN NOT NULL DEFAULT false,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_tenshen_profile_item UNIQUE (chart_id, tenshen_code)
);

COMMENT ON TABLE public.bazi_tenshen_profile_static_item_tbl IS
'Static tenshen profile items (aggregated by tenshen).';

COMMENT ON COLUMN public.bazi_tenshen_profile_static_item_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_item_tbl.tenshen_code IS 'Tenshen code';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_item_tbl.count_stem IS 'Count from stems';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_item_tbl.count_hidden IS 'Count from hidden stems';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_item_tbl.count_total IS 'Total count';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_item_tbl.score_stem IS 'Stem score';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_item_tbl.score_hidden IS 'Hidden score';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_item_tbl.score_total IS 'Total score';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_item_tbl.rank_no IS 'Rank';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_item_tbl.is_present IS 'Presence flag';
COMMENT ON COLUMN public.bazi_tenshen_profile_static_item_tbl.evidence_json IS 'Evidence summary JSON';

CREATE INDEX IF NOT EXISTS idx_tenshen_profile_item_chart
  ON public.bazi_tenshen_profile_static_item_tbl(chart_id);


-- -----------------------------
-- 3) Evidence (optional)
-- -----------------------------
DROP TABLE IF EXISTS public.bazi_tenshen_evidence_tbl CASCADE;

CREATE TABLE public.bazi_tenshen_evidence_tbl (
  id               BIGSERIAL PRIMARY KEY,
  chart_id         UUID NOT NULL,
  tenshen_code     TEXT NOT NULL,
  pillar           TEXT NOT NULL
                   CHECK (pillar IN ('YEAR','MONTH','DAY','HOUR')),
  source_type      TEXT NOT NULL
                   CHECK (source_type IN ('STEM','HIDDEN_MAIN','HIDDEN_MID','HIDDEN_TAIL')),
  stem_code        TEXT NOT NULL,
  element          TEXT NOT NULL
                   CHECK (element IN ('木','火','土','金','水')),
  yinyang          TEXT NOT NULL
                   CHECK (yinyang IN ('阴','阳')),
  base_weight      NUMERIC(12,4) NOT NULL DEFAULT 0,
  season_factor    NUMERIC(12,4) NOT NULL DEFAULT 1,
  root_factor      NUMERIC(12,4) NOT NULL DEFAULT 1,
  relation_factor  NUMERIC(12,4) NOT NULL DEFAULT 1,
  effective_weight NUMERIC(12,4) NOT NULL DEFAULT 0,
  tags             JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bazi_tenshen_evidence_tbl IS
'Evidence rows for tenshen profile.';

COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.chart_id IS 'Chart UUID';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.tenshen_code IS 'Tenshen code';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.pillar IS 'Pillar';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.source_type IS 'Source type';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.stem_code IS 'Stem code';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.element IS 'Element';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.yinyang IS 'Yin/Yang';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.base_weight IS 'Base weight';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.season_factor IS 'Season factor';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.root_factor IS 'Root factor';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.relation_factor IS 'Relation factor';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.effective_weight IS 'Effective weight';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.tags IS 'Tags';
COMMENT ON COLUMN public.bazi_tenshen_evidence_tbl.meta_json IS 'Meta JSON';

CREATE INDEX IF NOT EXISTS idx_tenshen_evidence_chart
  ON public.bazi_tenshen_evidence_tbl(chart_id);

COMMIT;
