-- =========================================================
-- 得令（deling）落库：三张表方案
-- 约定：
--   五行 element：'木','火','土','金','水'
--   旺相休囚死 state：'旺','相','休','囚','死'
-- 表名/字段名全英文（包含 deling），注释与取值用中文
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 0) 清理：先删结果表，再删快照表，再删规则表
-- ---------------------------------------------------------
DROP TABLE IF EXISTS public.bazi_deling_result_tbl CASCADE;
DROP TABLE IF EXISTS public.bazi_season_element_state_snapshot_tbl CASCADE;
DROP TABLE IF EXISTS public.dict_deling_ruleset CASCADE;

-- =========================================================
-- 1) 得令判定规则集（可选但强烈推荐）
--    - state_thresholds：用 '旺','相','休','囚','死' 作为阈值列表
--    - score_min：用分数阈值（0~1），可选
-- =========================================================
CREATE TABLE public.dict_deling_ruleset (
  ruleset_id        TEXT PRIMARY KEY,                 -- 规则集ID：如 default / school_a
  ruleset_name      TEXT NOT NULL,                    -- 规则集名称（中文描述）

  -- 判定阈值：可以用“状态阈值”或“分数阈值”
  -- 两者都填时，优先使用 state_thresholds
  state_thresholds  TEXT[] NULL,                      -- 例：ARRAY['旺'] 或 ARRAY['旺','相']
  score_min         NUMERIC(4,2) NULL CHECK (score_min BETWEEN 0 AND 1), -- 例：0.80

  note              TEXT,                             -- 备注（门派、口径说明等）
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 至少要提供一种阈值
  CONSTRAINT ck_deling_ruleset_threshold
    CHECK (state_thresholds IS NOT NULL OR score_min IS NOT NULL),

  -- 如果给了状态阈值，限制只能使用旺相休囚死
  CONSTRAINT ck_deling_ruleset_states
    CHECK (
      state_thresholds IS NULL OR
      state_thresholds <@ ARRAY['旺','相','休','囚','死']::text[]
    )
);

COMMENT ON TABLE  public.dict_deling_ruleset IS '得令判定规则集（支持不同门派口径：按状态阈值或按分数阈值判定）';
COMMENT ON COLUMN public.dict_deling_ruleset.ruleset_id IS '规则集ID（稳定、可引用，如default）';
COMMENT ON COLUMN public.dict_deling_ruleset.ruleset_name IS '规则集名称（中文）';
COMMENT ON COLUMN public.dict_deling_ruleset.state_thresholds IS '状态阈值列表：日主状态落在列表内 => 判定得令（旺/相/休/囚/死）';
COMMENT ON COLUMN public.dict_deling_ruleset.score_min IS '分数阈值：日主分数>=该值 => 判定得令（0~1）';
COMMENT ON COLUMN public.dict_deling_ruleset.note IS '备注：门派差异、口径解释等';
COMMENT ON COLUMN public.dict_deling_ruleset.created_at IS '创建时间';

-- 默认规则：仅“旺”算得令（最保守、最少争议）
INSERT INTO public.dict_deling_ruleset(ruleset_id, ruleset_name, state_thresholds, score_min, note)
VALUES
('default', '默认：仅旺为得令', ARRAY['旺'], NULL, '保守口径：日主在月令季节为“旺”则得令');

-- =========================================================
-- 2) 当令季节下五行状态快照（可选但非常实用）
--    这张表存“已经应用你现有字典/override后的最终态”
-- =========================================================
CREATE TABLE public.bazi_season_element_state_snapshot_tbl (
  chart_id      TEXT NOT NULL,                       -- 排盘ID（UUID格式，对齐你的chart主表）
  ruleset_id    TEXT   NOT NULL DEFAULT 'default',     -- 使用的规则集

  month_branch  VARCHAR(1) NOT NULL,                  -- 月支（用于追溯）
  season_code   TEXT NOT NULL,                         -- 当令季节编码（与你现有字典保持一致即可）

  element       TEXT NOT NULL CHECK (element IN ('木','火','土','金','水')),  -- 五行（中文）
  state         TEXT NOT NULL CHECK (state IN ('旺','相','休','囚','死')),     -- 旺相休囚死（中文）
  score         NUMERIC(4,2) NOT NULL CHECK (score BETWEEN 0 AND 1),          -- 0~1 分数

  is_override   BOOLEAN NOT NULL DEFAULT FALSE,         -- 是否被override覆盖（如“辰戌丑未土旺”等门派差异）
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,     -- 证据：来自哪条字典/覆盖、口径说明等
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 同一张盘 + 同一规则集：每个五行只保留一条快照
  PRIMARY KEY (chart_id, ruleset_id, element),

  CONSTRAINT fk_snapshot_ruleset
    FOREIGN KEY (ruleset_id) REFERENCES public.dict_deling_ruleset(ruleset_id)
);

COMMENT ON TABLE public.bazi_season_element_state_snapshot_tbl IS '当令季节下五行旺相休囚死快照（已应用门派override后的最终态），供后续旺衰/用神等步骤复用';
COMMENT ON COLUMN public.bazi_season_element_state_snapshot_tbl.chart_id IS '排盘ID（建议外键到你的chart主表）';
COMMENT ON COLUMN public.bazi_season_element_state_snapshot_tbl.ruleset_id IS '规则集ID（对应dict_deling_ruleset）';
COMMENT ON COLUMN public.bazi_season_element_state_snapshot_tbl.month_branch IS '月支（用于追溯月令）';
COMMENT ON COLUMN public.bazi_season_element_state_snapshot_tbl.season_code IS '季节编码（与你现有季节字典一致）';
COMMENT ON COLUMN public.bazi_season_element_state_snapshot_tbl.element IS '五行（中文）：木火土金水';
COMMENT ON COLUMN public.bazi_season_element_state_snapshot_tbl.state IS '旺相休囚死（中文）：旺相休囚死';
COMMENT ON COLUMN public.bazi_season_element_state_snapshot_tbl.score IS '状态分数（0~1），用于综合权重计算';
COMMENT ON COLUMN public.bazi_season_element_state_snapshot_tbl.is_override IS '是否被覆盖（门派差异/特殊规则）';
COMMENT ON COLUMN public.bazi_season_element_state_snapshot_tbl.evidence_json IS '证据JSON：字典行ID/override来源/计算口径等';
COMMENT ON COLUMN public.bazi_season_element_state_snapshot_tbl.created_at IS '生成时间';

CREATE INDEX idx_snapshot_chart   ON public.bazi_season_element_state_snapshot_tbl(chart_id);
CREATE INDEX idx_snapshot_ruleset ON public.bazi_season_element_state_snapshot_tbl(ruleset_id);
CREATE INDEX idx_snapshot_season  ON public.bazi_season_element_state_snapshot_tbl(season_code);

-- =========================================================
-- 3) 日主得令最终结论表（核心：后续步骤直接查这张）
-- =========================================================
CREATE TABLE public.bazi_deling_result_tbl (
  chart_id           TEXT NOT NULL,                    -- 排盘ID（UUID格式）
  ruleset_id         TEXT   NOT NULL DEFAULT 'default', -- 规则集ID

  month_branch       VARCHAR(1) NOT NULL,              -- 月支
  season_code        TEXT NOT NULL,                     -- 季节编码

  day_stem           VARCHAR(1) NOT NULL,              -- 日干（甲乙丙丁...）
  day_master_element TEXT NOT NULL CHECK (day_master_element IN ('木','火','土','金','水')), -- 日主五行（中文）

  day_master_state   TEXT NOT NULL CHECK (day_master_state IN ('旺','相','休','囚','死')),   -- 日主在当令季节的状态（中文）
  day_master_score   NUMERIC(4,2) NOT NULL CHECK (day_master_score BETWEEN 0 AND 1),         -- 日主状态分数

  is_deling          BOOLEAN NOT NULL,                 -- 是否得令（最终判定）

  rule_text          TEXT NOT NULL DEFAULT '按状态/分数阈值判定', -- 口径描述（建议写清）
  evidence_json      JSONB NOT NULL DEFAULT '{}'::jsonb,          -- 证据：阈值、快照来源、override等
  computed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),          -- 计算时间

  -- 允许一盘多规则集：主键(chart_id, ruleset_id)
  PRIMARY KEY (chart_id, ruleset_id),

  CONSTRAINT fk_result_ruleset
    FOREIGN KEY (ruleset_id) REFERENCES public.dict_deling_ruleset(ruleset_id)
);

COMMENT ON TABLE public.bazi_deling_result_tbl IS '日主得令最终结论（按盘+规则集存储），后续旺衰/格局/用神直接复用';
COMMENT ON COLUMN public.bazi_deling_result_tbl.chart_id IS '排盘ID（建议外键到你的chart主表）';
COMMENT ON COLUMN public.bazi_deling_result_tbl.ruleset_id IS '规则集ID（对应dict_deling_ruleset）';
COMMENT ON COLUMN public.bazi_deling_result_tbl.month_branch IS '月支（用于追溯月令）';
COMMENT ON COLUMN public.bazi_deling_result_tbl.season_code IS '当令季节编码（与你现有季节字典一致）';
COMMENT ON COLUMN public.bazi_deling_result_tbl.day_stem IS '日干（=日主天干）';
COMMENT ON COLUMN public.bazi_deling_result_tbl.day_master_element IS '日主五行（中文）：木火土金水';
COMMENT ON COLUMN public.bazi_deling_result_tbl.day_master_state IS '日主在当令季节的旺相休囚死状态（中文）';
COMMENT ON COLUMN public.bazi_deling_result_tbl.day_master_score IS '日主状态分数（0~1）';
COMMENT ON COLUMN public.bazi_deling_result_tbl.is_deling IS '最终判定：是否得令';
COMMENT ON COLUMN public.bazi_deling_result_tbl.rule_text IS '判定口径说明（建议写清：旺为得令/旺相为得令/分数阈值等）';
COMMENT ON COLUMN public.bazi_deling_result_tbl.evidence_json IS '证据JSON（建议含：阈值、快照来源、override来源等）';
COMMENT ON COLUMN public.bazi_deling_result_tbl.computed_at IS '计算落库时间';

CREATE INDEX idx_result_ruleset ON public.bazi_deling_result_tbl(ruleset_id);
CREATE INDEX idx_result_isdel   ON public.bazi_deling_result_tbl(is_deling);

COMMIT;
