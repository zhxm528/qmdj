-- =========================================================
-- 天干 → 五行 / 阴阳（固定字典）
-- Schema: public
-- Table : public.dict_heavenly_stem
-- =========================================================

-- 1) 枚举类型（避免脏值）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wu_xing') THEN
    CREATE TYPE public.wu_xing AS ENUM ('木','火','土','金','水');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'yin_yang') THEN
    CREATE TYPE public.yin_yang AS ENUM ('阴','阳');
  END IF;
END$$;

-- 2) 字典表
CREATE TABLE IF NOT EXISTS public.dict_heavenly_stem (
  stem         CHAR(1) PRIMARY KEY,      -- 天干：甲乙丙丁戊己庚辛壬癸
  yin_yang     public.yin_yang NOT NULL,  -- 阴/阳
  wu_xing      public.wu_xing NOT NULL,   -- 五行
  display_order SMALLINT NOT NULL UNIQUE, -- 1..10 用于排序展示
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_stem_valid
    CHECK (stem IN ('甲','乙','丙','丁','戊','己','庚','辛','壬','癸'))
);

COMMENT ON TABLE  public.dict_heavenly_stem IS '固定字典：天干→五行/阴阳';
COMMENT ON COLUMN public.dict_heavenly_stem.stem IS '天干（单字）';
COMMENT ON COLUMN public.dict_heavenly_stem.yin_yang IS '阴阳属性（固定）';
COMMENT ON COLUMN public.dict_heavenly_stem.wu_xing IS '五行属性（固定）';
COMMENT ON COLUMN public.dict_heavenly_stem.display_order IS '显示顺序（甲=1..癸=10）';

-- 3) 种子数据（UPSERT，重复执行不会报错）
INSERT INTO public.dict_heavenly_stem (stem, yin_yang, wu_xing, display_order)
VALUES
  ('甲','阳','木', 1),
  ('乙','阴','木', 2),
  ('丙','阳','火', 3),
  ('丁','阴','火', 4),
  ('戊','阳','土', 5),
  ('己','阴','土', 6),
  ('庚','阳','金', 7),
  ('辛','阴','金', 8),
  ('壬','阳','水', 9),
  ('癸','阴','水',10)
ON CONFLICT (stem) DO UPDATE
SET yin_yang      = EXCLUDED.yin_yang,
    wu_xing       = EXCLUDED.wu_xing,
    display_order = EXCLUDED.display_order,
    updated_at    = now();
