-- =========================
-- 0) 若存在则先删除（先删明细，再删汇总）
-- =========================
DROP TABLE IF EXISTS public.bazi_tenshen_detail_tbl CASCADE;
DROP TABLE IF EXISTS public.bazi_tenshen_summary_tbl CASCADE;

-- =========================
-- 1) 汇总表：bazi_tenshen_summary_tbl
-- =========================
CREATE TABLE public.bazi_tenshen_summary_tbl (
  id              BIGSERIAL PRIMARY KEY,
  chart_id        TEXT NOT NULL,  -- 改为TEXT以兼容UUID格式的chart_id

  -- 日主信息（冗余保存，便于审计/查询）
  day_master_stem TEXT NOT NULL,     -- 日柱天干：甲乙丙丁...
  dm_element      TEXT NOT NULL,     -- 木火土金水
  dm_yinyang      TEXT NOT NULL,     -- 阴/阳

  calc_version    TEXT NOT NULL DEFAULT 'v1',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (chart_id, calc_version)
);

CREATE INDEX idx_bazi_tenshen_summary_chart
  ON public.bazi_tenshen_summary_tbl(chart_id);

-- =========================
-- 2) 明细表：bazi_tenshen_detail_tbl
-- =========================
CREATE TABLE public.bazi_tenshen_detail_tbl (
  id                BIGSERIAL PRIMARY KEY,
  summary_id        BIGINT NOT NULL
                    REFERENCES public.bazi_tenshen_summary_tbl(id) ON DELETE CASCADE,
  chart_id          TEXT NOT NULL,  -- 冗余：方便按 chart_id 直接查，改为TEXT以兼容UUID格式

  pillar            TEXT NOT NULL CHECK (pillar IN ('year','month','day','hour')),

  -- 目标类型：柱天干 / 地支藏干
  item_type         TEXT NOT NULL CHECK (item_type IN ('stem','hidden_stem')),

  -- 目标干信息
  target_stem       TEXT NOT NULL,   -- 甲乙丙丁...
  target_element    TEXT NOT NULL,   -- 木火土金水
  target_yinyang    TEXT NOT NULL,   -- 阴/阳

  -- 若为藏干，描述来源
  source_branch     TEXT NULL,       -- 子丑寅卯...
  hidden_role       TEXT NULL CHECK (hidden_role IN ('main','middle','residual')),
  hidden_weight     NUMERIC(6,4) NULL,

  -- 相对日主五类关系（用于可回放/审计）
  rel_to_dm         TEXT NOT NULL CHECK (
                      rel_to_dm IN ('same','dm_sheng_x','dm_ke_x','x_sheng_dm','x_ke_dm')
                    ),

  -- 原始十神输出
  tenshen           TEXT NOT NULL CHECK (
                      tenshen IN ('日主','比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印')
                    ),

  same_yinyang      BOOLEAN NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- hidden_stem 必须带 branch/role；stem 不允许带
  CONSTRAINT ck_hidden_fields
    CHECK (
      (item_type = 'stem' AND source_branch IS NULL AND hidden_role IS NULL AND hidden_weight IS NULL)
      OR
      (item_type = 'hidden_stem' AND source_branch IS NOT NULL AND hidden_role IS NOT NULL)
    )
);

CREATE INDEX idx_bazi_tenshen_detail_chart
  ON public.bazi_tenshen_detail_tbl(chart_id);

CREATE INDEX idx_bazi_tenshen_detail_summary
  ON public.bazi_tenshen_detail_tbl(summary_id);

CREATE INDEX idx_bazi_tenshen_detail_pillar_type
  ON public.bazi_tenshen_detail_tbl(pillar, item_type);
