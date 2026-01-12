-- =========================================
-- 地支藏干字典表结构（PostgreSQL）
-- schema: public
-- =========================================

-- 若存在则先删除（先删明细，再删主表）
DROP TABLE IF EXISTS public.bazi_branch_hidden_stem_dict CASCADE;
DROP TABLE IF EXISTS public.bazi_earthly_branch_dim CASCADE;
DROP TABLE IF EXISTS public.bazi_heavenly_stem_dim CASCADE;

BEGIN;

-- 1) 地支维表（12支）
CREATE TABLE IF NOT EXISTS public.bazi_earthly_branch_dim (
  branch_code  VARCHAR(1) PRIMARY KEY,          -- 子丑寅卯辰巳午未申酉戌亥
  branch_index SMALLINT NOT NULL UNIQUE CHECK (branch_index BETWEEN 1 AND 12),
  branch_name  TEXT NOT NULL,                   -- 可与 branch_code 相同；留作扩展
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.bazi_earthly_branch_dim IS '地支维表（固定字典）';
COMMENT ON COLUMN public.bazi_earthly_branch_dim.branch_code IS '地支：子丑寅卯辰巳午未申酉戌亥';
COMMENT ON COLUMN public.bazi_earthly_branch_dim.branch_index IS '地支序号（1-12）';

-- 2) 天干维表（10干）
CREATE TABLE IF NOT EXISTS public.bazi_heavenly_stem_dim (
  stem_code   VARCHAR(1) PRIMARY KEY,           -- 甲乙丙丁戊己庚辛壬癸
  stem_index  SMALLINT NOT NULL UNIQUE CHECK (stem_index BETWEEN 1 AND 10),
  stem_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.bazi_heavenly_stem_dim IS '天干维表（固定字典）';
COMMENT ON COLUMN public.bazi_heavenly_stem_dim.stem_code IS '天干：甲乙丙丁戊己庚辛壬癸';

-- 3) 地支藏干映射表（核心）
-- 说明：
--   position: 1=主气, 2=中气, 3=余气（有的地支只有 1 或 2 个）
--   role: '主气'|'中气'|'余气'
--   weight: 可选，用于你后续做强弱加权（不同流派可改，不影响字典）
CREATE TABLE IF NOT EXISTS public.bazi_branch_hidden_stem_dict (
  branch_code VARCHAR(1) NOT NULL
    REFERENCES public.bazi_earthly_branch_dim(branch_code)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 3),

  stem_code  VARCHAR(1) NOT NULL
    REFERENCES public.bazi_heavenly_stem_dim(stem_code)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- 兼容旧结构（18_tonggen.sql）：供历史查询字段使用
  hidden_stem_code VARCHAR(1) GENERATED ALWAYS AS (stem_code) STORED,
  hidden_level     TEXT GENERATED ALWAYS AS (
    CASE role
      WHEN '主气' THEN '主'
      WHEN '中气' THEN '中'
      WHEN '余气' THEN '余'
      ELSE role
    END
  ) STORED,

  role TEXT NOT NULL CHECK (role IN ('主气', '中气', '余气')),

  weight NUMERIC(6,4), -- 可空；例如 1.0 / 0.6 / 0.3 之类

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT bazi_branch_hidden_stem_pk PRIMARY KEY (branch_code, position),
  CONSTRAINT bazi_branch_hidden_stem_uk UNIQUE (branch_code, stem_code)
);

CREATE INDEX IF NOT EXISTS idx_bazi_branch_hidden_stem_branch
  ON public.bazi_branch_hidden_stem_dict(branch_code);

CREATE INDEX IF NOT EXISTS idx_bazi_branch_hidden_stem_stem
  ON public.bazi_branch_hidden_stem_dict(stem_code);

COMMENT ON TABLE public.bazi_branch_hidden_stem_dict IS '地支->藏干固定字典表（含主/中/余顺序与角色）';
COMMENT ON COLUMN public.bazi_branch_hidden_stem_dict.position IS '顺序：1主气 2中气 3余气';
COMMENT ON COLUMN public.bazi_branch_hidden_stem_dict.role IS '主气/中气/余气';
COMMENT ON COLUMN public.bazi_branch_hidden_stem_dict.weight IS '可选：藏干权重（用于强弱计算，流派可自定义）';

-- =========================================
-- 可选：初始化数据（建议直接一次性写入）
-- =========================================

-- 地支
INSERT INTO public.bazi_earthly_branch_dim (branch_code, branch_index, branch_name) VALUES
('子', 1, '子'), ('丑', 2, '丑'), ('寅', 3, '寅'), ('卯', 4, '卯'),
('辰', 5, '辰'), ('巳', 6, '巳'), ('午', 7, '午'), ('未', 8, '未'),
('申', 9, '申'), ('酉',10, '酉'), ('戌',11, '戌'), ('亥',12, '亥')
ON CONFLICT (branch_code) DO NOTHING;

-- 天干
INSERT INTO public.bazi_heavenly_stem_dim (stem_code, stem_index, stem_name) VALUES
('甲', 1, '甲'), ('乙', 2, '乙'), ('丙', 3, '丙'), ('丁', 4, '丁'), ('戊', 5, '戊'),
('己', 6, '己'), ('庚', 7, '庚'), ('辛', 8, '辛'), ('壬', 9, '壬'), ('癸',10, '癸')
ON CONFLICT (stem_code) DO NOTHING;

-- 地支藏干（常用：主气->中气->余气）
-- 子：癸
INSERT INTO public.bazi_branch_hidden_stem_dict(branch_code, position, stem_code, role, weight) VALUES
('子', 1, '癸', '主气', NULL),

-- 丑：己 癸 辛
('丑', 1, '己', '主气', NULL),
('丑', 2, '癸', '中气', NULL),
('丑', 3, '辛', '余气', NULL),

-- 寅：甲 丙 戊
('寅', 1, '甲', '主气', NULL),
('寅', 2, '丙', '中气', NULL),
('寅', 3, '戊', '余气', NULL),

-- 卯：乙
('卯', 1, '乙', '主气', NULL),

-- 辰：戊 乙 癸
('辰', 1, '戊', '主气', NULL),
('辰', 2, '乙', '中气', NULL),
('辰', 3, '癸', '余气', NULL),

-- 巳：丙 戊 庚
('巳', 1, '丙', '主气', NULL),
('巳', 2, '戊', '中气', NULL),
('巳', 3, '庚', '余气', NULL),

-- 午：丁 己
('午', 1, '丁', '主气', NULL),
('午', 2, '己', '中气', NULL),

-- 未：己 丁 乙
('未', 1, '己', '主气', NULL),
('未', 2, '丁', '中气', NULL),
('未', 3, '乙', '余气', NULL),

-- 申：庚 壬 戊
('申', 1, '庚', '主气', NULL),
('申', 2, '壬', '中气', NULL),
('申', 3, '戊', '余气', NULL),

-- 酉：辛
('酉', 1, '辛', '主气', NULL),

-- 戌：戊 辛 丁
('戌', 1, '戊', '主气', NULL),
('戌', 2, '辛', '中气', NULL),
('戌', 3, '丁', '余气', NULL),

-- 亥：壬 甲
('亥', 1, '壬', '主气', NULL),
('亥', 2, '甲', '中气', NULL)

ON CONFLICT (branch_code, position) DO NOTHING;

COMMIT;
