-- =========================================================
-- 得地 / 根气（通根）计算结果落库（仅两张结果表）
-- Schema: public
-- 要求：DROP TABLE 语句置顶
-- =========================================================

-- 先删表（注意顺序：先明细后汇总 或 直接 CASCADE）
DROP TABLE IF EXISTS public.bazi_root_qi_detail_tbl;
DROP TABLE IF EXISTS public.bazi_root_qi_summary_tbl;
DROP TABLE IF EXISTS public.bazi_root_qi_level_threshold_dict;

BEGIN;


-- -----------------------------
-- 1) 明细表：每条“目标天干 × 落根地支命中”一行
-- -----------------------------
CREATE TABLE public.bazi_root_qi_detail_tbl (
  id                BIGSERIAL PRIMARY KEY,
  chart_id          TEXT NOT NULL,                       -- 排盘ID（UUID格式，对齐你的chart主表）

  -- 目标：哪个天干在找根（通常为年干/月干/日干/时干）
  target_pillar     TEXT NOT NULL
                    CHECK (target_pillar IN ('Y','M','D','H')), -- 年/月/日/时
  target_stem       TEXT NOT NULL,                               -- 甲乙丙丁戊己庚辛壬癸

  -- 根落在：哪个地支（年支/月支/日支/时支）
  root_pillar       TEXT NOT NULL
                    CHECK (root_pillar IN ('Y','M','D','H')),
  root_branch       TEXT NOT NULL,                               -- 子丑寅卯辰巳午未申酉戌亥

  -- 命中的藏干信息
  hit_hidden_stem   TEXT NOT NULL,                               -- 命中的藏干：甲/乙/丙...
  hidden_rank       TEXT NOT NULL
                    CHECK (hidden_rank IN ('MAIN','MID','RES')), -- 主/中/余气

  -- 根类型（你可按门派扩展）
  root_type         TEXT NOT NULL DEFAULT 'SAME_ELEMENT'
                    CHECK (root_type IN ('SAME_STEM','SAME_ELEMENT','KU_GRAVE')),

  -- 评分组件（计算时写入，便于解释/调参）
  w_hidden_rank     NUMERIC(6,3) NOT NULL DEFAULT 0,             -- 主/中/余气权重
  w_pillar_pos      NUMERIC(6,3) NOT NULL DEFAULT 0,             -- 年/月/日/时支位权重
  w_season_element  NUMERIC(6,3) NOT NULL DEFAULT 0,             -- 月令/季节对五行修正

  root_score        NUMERIC(12,4) NOT NULL DEFAULT 0,            -- 本条根气综合分
  is_root           BOOLEAN NOT NULL DEFAULT TRUE,               -- 可用于记录“根被冲破后无效”

  evidence_json     JSONB NOT NULL DEFAULT '{}'::jsonb,          -- 证据：得令状态、冲合刑害破、墓库规则等
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.bazi_root_qi_detail_tbl IS
'得地/根气（通根）明细：每条记录表示“某目标天干”在“某柱地支”的藏干中找到根，并记录主/中/余气与评分证据。';

COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.chart_id         IS '排盘ID（关联你已有 chart 主表；此处不加外键以避免表名不一致）';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.target_pillar    IS '目标天干所在柱：Y年 / M月 / D日 / H时';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.target_stem      IS '目标天干（被判定是否通根的天干）';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.root_pillar      IS '根落地支所在柱：Y年 / M月 / D日 / H时';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.root_branch      IS '根所在的地支';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.hit_hidden_stem  IS '命中的藏干';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.hidden_rank      IS '藏干层级：MAIN主气 / MID中气 / RES余气';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.root_type        IS '根类型：SAME_STEM同干根 / SAME_ELEMENT同气根 / KU_GRAVE墓库根';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.w_hidden_rank    IS '藏干层级权重（用于解释与调参）';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.w_pillar_pos     IS '支位权重（用于解释与调参）';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.w_season_element IS '月令/季节修正权重（用于解释与调参）';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.root_score       IS '该条根的综合分数（用于强弱）';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.is_root          IS '是否最终判定为根（可用于记录“根被冲破后无效”）';
COMMENT ON COLUMN public.bazi_root_qi_detail_tbl.evidence_json    IS '证据JSON：权重来源、得令旺衰、是否受冲合刑害破、墓库规则等';

-- 常用索引
CREATE INDEX IF NOT EXISTS idx_root_qi_detail_chart
  ON public.bazi_root_qi_detail_tbl(chart_id);

CREATE INDEX IF NOT EXISTS idx_root_qi_detail_target
  ON public.bazi_root_qi_detail_tbl(chart_id, target_pillar, target_stem);

CREATE INDEX IF NOT EXISTS idx_root_qi_detail_rootloc
  ON public.bazi_root_qi_detail_tbl(chart_id, root_pillar, root_branch);

-- 可选：避免重复写入
CREATE UNIQUE INDEX IF NOT EXISTS uq_root_qi_detail_nodup
  ON public.bazi_root_qi_detail_tbl(
    chart_id, target_pillar, target_stem,
    root_pillar, root_branch,
    hit_hidden_stem, hidden_rank, root_type
  );


-- -----------------------------
-- 2) 汇总表：每个“目标天干”一行
-- -----------------------------
CREATE TABLE public.bazi_root_qi_summary_tbl (
  id                BIGSERIAL PRIMARY KEY,
  chart_id          TEXT NOT NULL,                       -- 排盘ID（UUID格式，对齐你的chart主表）

  target_pillar     TEXT NOT NULL
                    CHECK (target_pillar IN ('Y','M','D','H')),
  target_stem       TEXT NOT NULL,

  total_root_score  NUMERIC(14,4) NOT NULL DEFAULT 0,            -- 四支加总
  root_level        TEXT NOT NULL DEFAULT 'UNKNOWN'
                    CHECK (root_level IN ('NONE','WEAK','MEDIUM','STRONG','UNKNOWN')),

  root_count        INT NOT NULL DEFAULT 0,                      -- 明细条数（is_root=true）
  best_root_pillar  TEXT NULL
                    CHECK (best_root_pillar IN ('Y','M','D','H')),
  best_root_branch  TEXT NULL,                                   -- 最佳根所在支

  evidence_json     JSONB NOT NULL DEFAULT '{}'::jsonb,          -- 汇总证据：阈值、最佳根明细ID等
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_root_qi_summary UNIQUE (chart_id, target_pillar, target_stem)
);

COMMENT ON TABLE public.bazi_root_qi_summary_tbl IS
'得地/根气（通根）汇总：按目标天干汇总根气总分、强弱分级、根数量、最佳根位置等。';

COMMENT ON COLUMN public.bazi_root_qi_summary_tbl.total_root_score IS '四支根气分数加总';
COMMENT ON COLUMN public.bazi_root_qi_summary_tbl.root_level       IS '根气强弱分级（阈值建议在计算逻辑中配置后写入）';
COMMENT ON COLUMN public.bazi_root_qi_summary_tbl.root_count       IS '有效根条数（建议统计明细 is_root=true）';
COMMENT ON COLUMN public.bazi_root_qi_summary_tbl.best_root_pillar IS '最佳根所在柱（按 root_score 最大的那条明细）';
COMMENT ON COLUMN public.bazi_root_qi_summary_tbl.best_root_branch IS '最佳根所在支（按 root_score 最大的那条明细）';
COMMENT ON COLUMN public.bazi_root_qi_summary_tbl.evidence_json    IS '汇总证据JSON：分级阈值、最佳根明细ID、各支贡献等';

CREATE INDEX IF NOT EXISTS idx_root_qi_summary_chart
  ON public.bazi_root_qi_summary_tbl(chart_id);

CREATE INDEX IF NOT EXISTS idx_root_qi_summary_target
  ON public.bazi_root_qi_summary_tbl(chart_id, target_pillar, target_stem);





-- =========================================================
-- 根气强弱分级阈值配置表（root_level thresholds）
-- Schema: public
-- 用法：
--   给定 total_root_score
--   选择满足: min_score <= score AND score < max_score 的那一档
-- =========================================================


CREATE TABLE public.bazi_root_qi_level_threshold_dict (
  level_code   TEXT PRIMARY KEY
               CHECK (level_code IN ('NONE','WEAK','MEDIUM','STRONG')),
  level_order  SMALLINT NOT NULL UNIQUE
               CHECK (level_order BETWEEN 1 AND 4),

  -- 半开区间：[min_score, max_score)
  min_score    NUMERIC(14,4) NOT NULL,
  max_score    NUMERIC(14,4) NOT NULL,

  -- 可读描述
  level_desc   TEXT NOT NULL,

  -- 版本/流派（可选：后续你要支持不同门派，就靠这个切换）
  rule_set     TEXT NOT NULL DEFAULT 'DEFAULT',

  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_score_range CHECK (min_score < max_score)
);

COMMENT ON TABLE public.bazi_root_qi_level_threshold_dict IS
'根气强弱分级阈值字典：将 total_root_score 映射到 root_level。默认使用半开区间 [min_score, max_score)。可用 rule_set 支持不同门派/版本。';

COMMENT ON COLUMN public.bazi_root_qi_level_threshold_dict.level_code  IS '分级编码：NONE/WEAK/MEDIUM/STRONG';
COMMENT ON COLUMN public.bazi_root_qi_level_threshold_dict.level_order IS '分级顺序（从弱到强）';
COMMENT ON COLUMN public.bazi_root_qi_level_threshold_dict.min_score   IS '该等级分数下界（含）';
COMMENT ON COLUMN public.bazi_root_qi_level_threshold_dict.max_score   IS '该等级分数上界（不含）';
COMMENT ON COLUMN public.bazi_root_qi_level_threshold_dict.rule_set    IS '规则集/流派版本标识（DEFAULT/XXX）';
COMMENT ON COLUMN public.bazi_root_qi_level_threshold_dict.is_active   IS '是否启用';

-- 常用索引：按规则集检索启用阈值
CREATE INDEX IF NOT EXISTS idx_root_qi_threshold_ruleset_active
  ON public.bazi_root_qi_level_threshold_dict(rule_set, is_active, min_score, max_score);

-- ---------------------------------------------------------
-- 预置数据（DEFAULT）
-- 说明：这些阈值假设你 total_root_score 是“四支根气分数求和”，
--      并且每条根分数大致落在 0~1+ 的量级（常见：主气月支≈1.0左右）。
--      你后面如果调了权重体系，只需要改这里，不用改代码。
-- ---------------------------------------------------------
-- 分级建议（经验默认）：
--   NONE   : [0.0000, 0.2500)   近似“无根/几乎无根”
--   WEAK   : [0.2500, 1.0000)   有根但弱（可能只有余气/失令/偏远柱）
--   MEDIUM : [1.0000, 2.0000)   有根可用（常见一处主根或多处中根）
--   STRONG : [2.0000, 9999.0000) 根气很足（多根/当令主根叠加）
--
-- 你也可以把上界做成很大数来表示“无穷大”
INSERT INTO public.bazi_root_qi_level_threshold_dict
(level_code, level_order, min_score, max_score, level_desc, rule_set, is_active)
VALUES
('NONE',   1, 0.0000, 0.2500,  '无根或几乎无根（分数极低）', 'DEFAULT', TRUE),
('WEAK',   2, 0.2500, 1.0000,  '弱根：有根但力度不足',       'DEFAULT', TRUE),
('MEDIUM', 3, 1.0000, 2.0000,  '中根：根气可用',             'DEFAULT', TRUE),
('STRONG', 4, 2.0000, 9999.0000,'强根：根气充足',            'DEFAULT', TRUE);



COMMIT;
