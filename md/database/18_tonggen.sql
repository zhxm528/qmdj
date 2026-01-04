-- =========================================================
-- 通根字典（由 bazi_branch_hidden_stem_dict 自动生成）
-- 依赖已存在：
--   public.bazi_branch_hidden_stem_dict
--   public.bazi_earthly_branch_dim
--   public.bazi_heavenly_stem_dim
-- =========================================================

BEGIN;

-- 先删视图再删表（避免依赖错误）
DROP VIEW  IF EXISTS public.vw_stem_root_best_in_branch CASCADE;
DROP TABLE IF EXISTS public.bazi_stem_root_dict CASCADE;

-- =========================================================
-- 1) 通根字典表：public.bazi_stem_root_dict
-- =========================================================
CREATE TABLE public.bazi_stem_root_dict (
  stem_code   VARCHAR(1) NOT NULL
    REFERENCES public.bazi_heavenly_stem_dim(stem_code)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  branch_code VARCHAR(1) NOT NULL
    REFERENCES public.bazi_earthly_branch_dim(branch_code)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- 根来源藏干（同干通根时等于 stem_code；为未来扩展“同五行根”等保留）
  root_from_hidden_stem_code VARCHAR(1) NOT NULL
    REFERENCES public.bazi_heavenly_stem_dim(stem_code)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- 来自藏干表的层级/顺序信息
  root_position SMALLINT NOT NULL CHECK (root_position BETWEEN 1 AND 3),      -- 1主气 2中气 3余气
  root_role     TEXT NOT NULL CHECK (root_role IN ('主气','中气','余气')),     -- 主气/中气/余气

  -- 根气权重：优先取藏干 weight；若为空按 role 自动补默认值
  weight NUMERIC(6,4) NOT NULL CHECK (weight > 0),

  -- 标识位：默认只生成“同干通根”
  is_same_stem    BOOLEAN NOT NULL DEFAULT TRUE,
  is_same_element BOOLEAN NOT NULL DEFAULT FALSE,

  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 说明：
  -- 当前“同干通根”下 (stem_code, branch_code) 只有一条记录；
  -- 但为了未来支持“同五行根/多来源根”，主键保留 root_from_hidden_stem_code + 标识位。
  CONSTRAINT bazi_stem_root_pk
    PRIMARY KEY (stem_code, branch_code, root_from_hidden_stem_code, is_same_stem, is_same_element)
);

COMMENT ON TABLE public.bazi_stem_root_dict IS
'通根字典（派生表）：描述“某天干在某地支是否得根，以及根来自哪个藏干、主/中/余层级、权重”。默认仅生成同干通根（藏干包含该天干）。';

COMMENT ON COLUMN public.bazi_stem_root_dict.stem_code IS '被判定通根的天干（例如日主/任一柱天干）。';
COMMENT ON COLUMN public.bazi_stem_root_dict.branch_code IS '提供根气的地支（例如年支/月支/日支/时支）。';
COMMENT ON COLUMN public.bazi_stem_root_dict.root_from_hidden_stem_code IS '根来源藏干（同干通根时=stem_code；扩展时可不同）。';
COMMENT ON COLUMN public.bazi_stem_root_dict.root_position IS '根层级位置：1主气 2中气 3余气（继承藏干表 position）。';
COMMENT ON COLUMN public.bazi_stem_root_dict.root_role IS '根层级角色：主气/中气/余气（继承藏干表 role）。';
COMMENT ON COLUMN public.bazi_stem_root_dict.weight IS '根气权重：优先取藏干表 weight；为空时按 role 自动补默认值（主1.0/中0.6/余0.3）。';
COMMENT ON COLUMN public.bazi_stem_root_dict.is_same_stem IS '是否同干通根：TRUE 表示 stem_code=根来源藏干（默认生成）。';
COMMENT ON COLUMN public.bazi_stem_root_dict.is_same_element IS '是否同五行根（可扩展项）：默认 FALSE（本脚本不生成）。';
COMMENT ON COLUMN public.bazi_stem_root_dict.note IS '备注：记录生成口径/门派差异/说明。';

-- 常用索引：按（天干, 地支）判断通根；或按地支列出可通根天干
CREATE INDEX idx_bazi_stem_root_stem_branch
  ON public.bazi_stem_root_dict(stem_code, branch_code);

CREATE INDEX idx_bazi_stem_root_branch_stem
  ON public.bazi_stem_root_dict(branch_code, stem_code);

COMMENT ON INDEX public.idx_bazi_stem_root_stem_branch IS
'索引：按（stem_code, branch_code）快速判断某天干在某地支是否通根并取权重/层级。';

COMMENT ON INDEX public.idx_bazi_stem_root_branch_stem IS
'索引：按（branch_code, stem_code）快速列出某地支可通根的天干集合。';

-- =========================================================
-- 2) 由藏干表派生生成数据（同干通根）
--    可重复执行：先清空再重灌（通根是派生结果，建议保持与藏干表一致）
-- =========================================================
TRUNCATE TABLE public.bazi_stem_root_dict;

INSERT INTO public.bazi_stem_root_dict (
  stem_code, branch_code, root_from_hidden_stem_code,
  root_position, root_role, weight,
  is_same_stem, is_same_element, note
)
SELECT
  h.stem_code  AS stem_code,
  h.branch_code,
  h.stem_code  AS root_from_hidden_stem_code,
  h.position   AS root_position,
  h.role       AS root_role,
  COALESCE(
    h.weight,
    CASE h.role
      WHEN '主气' THEN 1.0000
      WHEN '中气' THEN 0.6000
      WHEN '余气' THEN 0.3000
    END
  )            AS weight,
  TRUE         AS is_same_stem,
  FALSE        AS is_same_element,
  '同干通根：由 bazi_branch_hidden_stem_dict 派生生成（藏干包含该天干即通根）' AS note
FROM public.bazi_branch_hidden_stem_dict h;

-- =========================================================
-- 3) 视图：每个（天干, 地支）取“最佳根”（权重最大）
--    当前同干通根下每对只有一条，但该视图对未来扩展也适用
-- =========================================================
CREATE VIEW public.vw_stem_root_best_in_branch AS
SELECT
  r.stem_code,
  r.branch_code,
  (ARRAY_AGG(r.root_from_hidden_stem_code ORDER BY r.weight DESC))[1] AS vw_stem_root_best_in_branch,
  (ARRAY_AGG(r.root_role ORDER BY r.weight DESC))[1]                  AS best_root_role,
  (ARRAY_AGG(r.root_position ORDER BY r.weight DESC))[1]              AS best_root_position,
  MAX(r.weight)                                                       AS best_weight,
  BOOL_OR(r.is_same_stem)                                             AS has_same_stem_root,
  BOOL_OR(r.is_same_element)                                          AS has_same_element_root
FROM public.bazi_stem_root_dict r
GROUP BY r.stem_code, r.branch_code;

COMMENT ON VIEW public.vw_stem_root_best_in_branch IS
'视图：对每个（天干, 地支）选择权重最高的“最佳根”，用于快速通根判定与根气强弱读取。';

COMMIT;

-- 自检（可选）：
-- SELECT * FROM public.vw_stem_root_best_in_branch WHERE stem_code='甲' ORDER BY branch_code;
-- SELECT * FROM public.bazi_stem_root_dict WHERE branch_code='寅' ORDER BY weight DESC, stem_code;
