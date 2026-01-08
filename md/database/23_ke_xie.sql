-- =========================================================
-- 受克泄耗（制化）证据与规则表
-- Schema: public
-- 说明：用于“旺衰：日主强弱与身态”中的证据条目化判定
-- =========================================================

DROP TABLE IF EXISTS public.bazi_ke_xie_detail_tbl;
DROP TABLE IF EXISTS public.bazi_ke_xie_summary_tbl;
DROP TABLE IF EXISTS public.dict_ke_xie_ruleset;

BEGIN;

-- -----------------------------
-- 1) 明细表：证据条目
-- -----------------------------
CREATE TABLE public.bazi_ke_xie_detail_tbl (
  id                BIGSERIAL PRIMARY KEY,
  chart_id          UUID NOT NULL,                      -- 排盘ID（UUID）

  -- 日主信息（便于追溯）
  day_master_stem   TEXT NOT NULL,
  day_master_element TEXT NOT NULL,

  -- 证据类型：泄/耗/克/制化
  evidence_type     TEXT NOT NULL
                    CHECK (evidence_type IN ('XIE','HAO','KE','ZHIHUA')),

  -- 证据来源：食伤/财/官杀/合化
  source_type       TEXT NOT NULL
                    CHECK (source_type IN ('SHISHANG','CAI','GUANSHA','HEHUA')),

  -- 证据强弱（旺/相/休/囚/死 或 UNKNOWN）
  strength_state    TEXT NOT NULL DEFAULT 'UNKNOWN'
                    CHECK (strength_state IN ('旺','相','休','囚','死','UNKNOWN')),

  -- 证据标记：是否透/有根/成势/合化等
  flags_json        JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 分值与权重细节
  score             NUMERIC(12,4) NOT NULL DEFAULT 0,
  weight_json       JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 解释说明
  reason            TEXT NULL,
  evidence_json     JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bazi_ke_xie_detail_tbl IS
'受克泄耗（制化）证据明细：每条记录代表一次泄/耗/克/制化的证据条目';

COMMENT ON COLUMN public.bazi_ke_xie_detail_tbl.chart_id IS '排盘ID（UUID）';
COMMENT ON COLUMN public.bazi_ke_xie_detail_tbl.day_master_stem IS '日主天干';
COMMENT ON COLUMN public.bazi_ke_xie_detail_tbl.day_master_element IS '日主五行';
COMMENT ON COLUMN public.bazi_ke_xie_detail_tbl.evidence_type IS '证据类型：XIE/HAO/KE/ZHIHUA';
COMMENT ON COLUMN public.bazi_ke_xie_detail_tbl.source_type IS '证据来源：SHISHANG/CAI/GUANSHA/HEHUA';
COMMENT ON COLUMN public.bazi_ke_xie_detail_tbl.strength_state IS '证据强弱：旺/相/休/囚/死/UNKNOWN';
COMMENT ON COLUMN public.bazi_ke_xie_detail_tbl.flags_json IS '证据标记：透/有根/成势/合化等';
COMMENT ON COLUMN public.bazi_ke_xie_detail_tbl.score IS '该条证据分值';
COMMENT ON COLUMN public.bazi_ke_xie_detail_tbl.weight_json IS '权重细节';
COMMENT ON COLUMN public.bazi_ke_xie_detail_tbl.reason IS '人类可读说明';
COMMENT ON COLUMN public.bazi_ke_xie_detail_tbl.evidence_json IS '证据补充JSON';

CREATE INDEX IF NOT EXISTS idx_ke_xie_detail_chart
  ON public.bazi_ke_xie_detail_tbl(chart_id);

CREATE INDEX IF NOT EXISTS idx_ke_xie_detail_type
  ON public.bazi_ke_xie_detail_tbl(chart_id, evidence_type, source_type);


-- -----------------------------
-- 2) 汇总表：证据总分
-- -----------------------------
CREATE TABLE public.bazi_ke_xie_summary_tbl (
  id                BIGSERIAL PRIMARY KEY,
  chart_id          UUID NOT NULL,                      -- 排盘ID（UUID）

  total_score       NUMERIC(14,4) NOT NULL DEFAULT 0,
  xie_score         NUMERIC(14,4) NOT NULL DEFAULT 0,
  hao_score         NUMERIC(14,4) NOT NULL DEFAULT 0,
  ke_score          NUMERIC(14,4) NOT NULL DEFAULT 0,
  zhihua_score      NUMERIC(14,4) NOT NULL DEFAULT 0,

  ruleset_id        TEXT NOT NULL DEFAULT 'default',
  evidence_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_ke_xie_summary UNIQUE (chart_id)
);

COMMENT ON TABLE public.bazi_ke_xie_summary_tbl IS
'受克泄耗（制化）汇总：各类分项与总分';

COMMENT ON COLUMN public.bazi_ke_xie_summary_tbl.chart_id IS '排盘ID（UUID）';
COMMENT ON COLUMN public.bazi_ke_xie_summary_tbl.total_score IS '受克泄耗总分';
COMMENT ON COLUMN public.bazi_ke_xie_summary_tbl.xie_score IS '食伤泄分';
COMMENT ON COLUMN public.bazi_ke_xie_summary_tbl.hao_score IS '财耗分';
COMMENT ON COLUMN public.bazi_ke_xie_summary_tbl.ke_score IS '官杀克分';
COMMENT ON COLUMN public.bazi_ke_xie_summary_tbl.zhihua_score IS '制化抵消分（负值为抵消）';
COMMENT ON COLUMN public.bazi_ke_xie_summary_tbl.ruleset_id IS '规则集ID';
COMMENT ON COLUMN public.bazi_ke_xie_summary_tbl.evidence_json IS '汇总证据JSON';

CREATE INDEX IF NOT EXISTS idx_ke_xie_summary_chart
  ON public.bazi_ke_xie_summary_tbl(chart_id);


-- -----------------------------
-- 3) 规则集：权重配置
-- -----------------------------
CREATE TABLE public.dict_ke_xie_ruleset (
  ruleset_id            TEXT PRIMARY KEY,

  -- 季节强弱映射（旺/相/休/囚/死）
  season_state_weights  JSONB NOT NULL,

  -- 透干/通根/成势/合化权重
  tougan_weight         NUMERIC(10,4) NOT NULL DEFAULT 0,
  tonggen_weight        NUMERIC(10,4) NOT NULL DEFAULT 0,
  chengshi_weight       NUMERIC(10,4) NOT NULL DEFAULT 0,
  hehua_weight          NUMERIC(10,4) NOT NULL DEFAULT 0,

  -- 类型权重（泄/耗/克/制化）
  type_weights          JSONB NOT NULL,

  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.dict_ke_xie_ruleset IS
'受克泄耗（制化）规则集：季节强弱与证据权重配置';

COMMENT ON COLUMN public.dict_ke_xie_ruleset.ruleset_id IS '规则集ID';
COMMENT ON COLUMN public.dict_ke_xie_ruleset.season_state_weights IS '旺相休囚死权重映射';
COMMENT ON COLUMN public.dict_ke_xie_ruleset.tougan_weight IS '透干权重';
COMMENT ON COLUMN public.dict_ke_xie_ruleset.tonggen_weight IS '通根权重';
COMMENT ON COLUMN public.dict_ke_xie_ruleset.chengshi_weight IS '成势权重';
COMMENT ON COLUMN public.dict_ke_xie_ruleset.hehua_weight IS '合化抵消权重';
COMMENT ON COLUMN public.dict_ke_xie_ruleset.type_weights IS '证据类型权重';
COMMENT ON COLUMN public.dict_ke_xie_ruleset.note IS '备注';

-- 默认规则集
INSERT INTO public.dict_ke_xie_ruleset (
  ruleset_id,
  season_state_weights,
  tougan_weight,
  tonggen_weight,
  chengshi_weight,
  hehua_weight,
  type_weights,
  note
) VALUES (
  'default',
  '{"旺": 1.2, "相": 1.0, "休": 0.7, "囚": 0.5, "死": 0.3, "UNKNOWN": 1.0}'::jsonb,
  0.30,
  0.30,
  0.40,
  -0.40,
  '{"XIE": 1.0, "HAO": 1.0, "KE": 1.0, "ZHIHUA": 1.0}'::jsonb,
  '默认规则集：季节强弱 + 透干/通根/成势/合化权重'
)
ON CONFLICT (ruleset_id) DO NOTHING;

COMMIT;
