/* ============================================================
   生辰八字 - 基础盘面结构（表A/表B/表C/网D）
   Schema: public
   说明：
   - ENUM 类型全部以 _enum 结尾，避免与同名表(复合类型)冲突
   - 表全部以 _tbl 结尾，避免与你现有表重名
   依赖：pgcrypto (gen_random_uuid)
   ============================================================ */

-- ============================================================
-- 清理：删除已存在的对象（按依赖关系逆序）
-- ============================================================

-- 删除视图（依赖表）
DROP VIEW IF EXISTS public.v_bazi_net_d_relations CASCADE;
DROP VIEW IF EXISTS public.v_bazi_table_c_roots_and_reveals CASCADE;
DROP VIEW IF EXISTS public.v_bazi_table_b_tenshen_summary CASCADE;
DROP VIEW IF EXISTS public.v_bazi_table_a_pillar_overview CASCADE;

-- 删除触发器（依赖表和函数）
DROP TRIGGER IF EXISTS trg_bazi_pillar_validate_complete_after_statement ON public.bazi_pillar_tbl;
DROP TRIGGER IF EXISTS trg_bazi_chart_tbl_set_updated_at ON public.bazi_chart_tbl;

-- 删除表（按依赖关系逆序：先删除子表，再删除父表）
DROP TABLE IF EXISTS public.bazi_special_structure_member_tbl CASCADE;
DROP TABLE IF EXISTS public.bazi_special_structure_tbl CASCADE;
DROP TABLE IF EXISTS public.bazi_stem_relation_tbl CASCADE;
DROP TABLE IF EXISTS public.bazi_branch_relation_tbl CASCADE;

DROP TABLE IF EXISTS public.bazi_reveal_tbl CASCADE;
DROP TABLE IF EXISTS public.bazi_hidden_stem_tbl CASCADE;
DROP TABLE IF EXISTS public.bazi_pillar_tbl CASCADE;
DROP TABLE IF EXISTS public.bazi_chart_tbl CASCADE;

-- 删除函数（依赖枚举类型）
DROP FUNCTION IF EXISTS public.bazi_validate_pillars_complete() CASCADE;
DROP FUNCTION IF EXISTS public.bazi_set_updated_at() CASCADE;

-- 删除枚举类型（最后删除，因为可能被其他对象依赖）
DROP TYPE IF EXISTS public.bazi_structure_type_enum CASCADE;
DROP TYPE IF EXISTS public.bazi_stem_relation_type_enum CASCADE;
DROP TYPE IF EXISTS public.bazi_branch_relation_type_enum CASCADE;
DROP TYPE IF EXISTS public.bazi_tenshen_enum CASCADE;
DROP TYPE IF EXISTS public.bazi_reveal_type_enum CASCADE;
DROP TYPE IF EXISTS public.bazi_root_strength_enum CASCADE;
DROP TYPE IF EXISTS public.bazi_hidden_role_enum CASCADE;
DROP TYPE IF EXISTS public.bazi_pillar_enum CASCADE;
DROP TYPE IF EXISTS public.bazi_yinyang_enum CASCADE;
DROP TYPE IF EXISTS public.bazi_element_enum CASCADE;

-- ============================================================
-- 创建：重新创建所有对象
-- ============================================================

-- 0) 依赖扩展
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) 枚举类型（public 下，全部 _enum 后缀）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname='bazi_element_enum' AND n.nspname='public'
  ) THEN
    CREATE TYPE public.bazi_element_enum AS ENUM ('木','火','土','金','水');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname='bazi_yinyang_enum' AND n.nspname='public'
  ) THEN
    CREATE TYPE public.bazi_yinyang_enum AS ENUM ('阴','阳');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname='bazi_pillar_enum' AND n.nspname='public'
  ) THEN
    CREATE TYPE public.bazi_pillar_enum AS ENUM ('year','month','day','hour');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname='bazi_hidden_role_enum' AND n.nspname='public'
  ) THEN
    CREATE TYPE public.bazi_hidden_role_enum AS ENUM ('主气','中气','余气');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname='bazi_root_strength_enum' AND n.nspname='public'
  ) THEN
    CREATE TYPE public.bazi_root_strength_enum AS ENUM ('本气根','中气根','余气根');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname='bazi_reveal_type_enum' AND n.nspname='public'
  ) THEN
    CREATE TYPE public.bazi_reveal_type_enum AS ENUM ('same_stem','same_element','custom');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname='bazi_tenshen_enum' AND n.nspname='public'
  ) THEN
    CREATE TYPE public.bazi_tenshen_enum AS ENUM (
      '日主',
      '比肩','劫财',
      '食神','伤官',
      '偏财','正财',
      '七杀','正官',
      '偏印','正印'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname='bazi_branch_relation_type_enum' AND n.nspname='public'
  ) THEN
    CREATE TYPE public.bazi_branch_relation_type_enum AS ENUM ('冲','六合','害','破','刑','自刑');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname='bazi_stem_relation_type_enum' AND n.nspname='public'
  ) THEN
    CREATE TYPE public.bazi_stem_relation_type_enum AS ENUM ('合','克','生');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname='bazi_structure_type_enum' AND n.nspname='public'
  ) THEN
    CREATE TYPE public.bazi_structure_type_enum AS ENUM ('三合局','三会局','半合','方局','会方','六合局','其他');
  END IF;
END$$;

-- 2) updated_at 触发器函数
CREATE OR REPLACE FUNCTION public.bazi_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.1) 验证四柱完整性函数（确保每个 chart 必须有且仅有4个 pillar）
-- 注意：此函数在语句级别执行，允许在事务中批量插入/删除
CREATE OR REPLACE FUNCTION public.bazi_validate_pillars_complete()
RETURNS TRIGGER AS $$
DECLARE
  invalid_charts RECORD;
BEGIN
  -- 查找所有不完整的 chart（pillar 数量不等于4）
  FOR invalid_charts IN
    SELECT chart_id, COUNT(*) as pillar_count
    FROM public.bazi_pillar_tbl
    GROUP BY chart_id
    HAVING COUNT(*) != 4
  LOOP
    RAISE EXCEPTION '八字盘 % 必须包含且仅包含4个柱（年、月、日、时），当前有 % 个柱', 
      invalid_charts.chart_id, invalid_charts.pillar_count;
  END LOOP;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3) 核心表：盘（chart）
CREATE TABLE IF NOT EXISTS public.bazi_chart_tbl (
  chart_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_email          VARCHAR(255) NOT NULL,

  day_master_stem      CHAR(1) NOT NULL,
  day_master_element   public.bazi_element_enum NOT NULL,
  day_master_yinyang   public.bazi_yinyang_enum NOT NULL,

  meta                JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_bazi_day_master_stem_len CHECK (char_length(day_master_stem) = 1),
  CONSTRAINT fk_bazi_chart_tbl_user_email FOREIGN KEY (user_email) 
    REFERENCES public.users(email) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bazi_chart_tbl_created_at
  ON public.bazi_chart_tbl(created_at);

CREATE INDEX IF NOT EXISTS idx_bazi_chart_tbl_user_email
  ON public.bazi_chart_tbl(user_email);

-- 添加唯一约束：确保每个用户的每个四柱组合唯一
-- 通过函数索引实现：根据user_email和四柱（通过pillar表关联）创建唯一约束
-- 注意：由于四柱存储在pillar表中，我们需要使用一个函数来生成唯一标识
DO $$
BEGIN
  -- 创建一个函数来生成四柱唯一标识
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'bazi_get_four_pillars_key' AND n.nspname = 'public'
  ) THEN
    CREATE OR REPLACE FUNCTION public.bazi_get_four_pillars_key(p_chart_id UUID)
    RETURNS TEXT AS $$
    SELECT CONCAT(
      (SELECT stem || branch FROM public.bazi_pillar_tbl WHERE chart_id = p_chart_id AND pillar = 'year' LIMIT 1),
      '-',
      (SELECT stem || branch FROM public.bazi_pillar_tbl WHERE chart_id = p_chart_id AND pillar = 'month' LIMIT 1),
      '-',
      (SELECT stem || branch FROM public.bazi_pillar_tbl WHERE chart_id = p_chart_id AND pillar = 'day' LIMIT 1),
      '-',
      (SELECT stem || branch FROM public.bazi_pillar_tbl WHERE chart_id = p_chart_id AND pillar = 'hour' LIMIT 1)
    );
    $$ LANGUAGE SQL IMMUTABLE;
  END IF;
END$$;

-- 添加唯一约束：通过唯一索引实现（基于user_email和四柱组合）
-- 注意：PostgreSQL不支持跨表的唯一约束，所以我们使用应用层逻辑确保唯一性
-- 在应用层通过查询检查是否存在相同的四柱组合

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_bazi_chart_tbl_set_updated_at') THEN
    CREATE TRIGGER trg_bazi_chart_tbl_set_updated_at
    BEFORE UPDATE ON public.bazi_chart_tbl
    FOR EACH ROW EXECUTE FUNCTION public.bazi_set_updated_at();
  END IF;
END$$;

-- 4) 表A：四柱（pillar）
CREATE TABLE IF NOT EXISTS public.bazi_pillar_tbl (
  pillar_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id            UUID NOT NULL REFERENCES public.bazi_chart_tbl(chart_id) ON DELETE CASCADE,

  pillar              public.bazi_pillar_enum NOT NULL, -- year/month/day/hour
  sort_order          SMALLINT NOT NULL,                -- 1..4

  stem                CHAR(1) NOT NULL,
  stem_element        public.bazi_element_enum NOT NULL,
  stem_yinyang        public.bazi_yinyang_enum NOT NULL,
  stem_tenshen        public.bazi_tenshen_enum NOT NULL,

  branch              CHAR(1) NOT NULL,
  branch_element      public.bazi_element_enum,

  CONSTRAINT uq_bazi_pillar_tbl UNIQUE (chart_id, pillar),
  CONSTRAINT ck_bazi_sort_order CHECK (sort_order BETWEEN 1 AND 4),
  CONSTRAINT ck_bazi_stem_len CHECK (char_length(stem) = 1),
  CONSTRAINT ck_bazi_branch_len CHECK (char_length(branch) = 1)
);

CREATE INDEX IF NOT EXISTS idx_bazi_pillar_tbl_chart
  ON public.bazi_pillar_tbl(chart_id);

CREATE INDEX IF NOT EXISTS idx_bazi_pillar_tbl_chart_order
  ON public.bazi_pillar_tbl(chart_id, sort_order);

-- 添加触发器：确保每个 chart 必须有且仅有4个 pillar
-- 使用 AFTER STATEMENT 级别，允许在事务中批量操作
DO $$
BEGIN
  -- 在语句执行完成后验证完整性（允许批量插入/删除）
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_bazi_pillar_validate_complete_after_statement') THEN
    CREATE TRIGGER trg_bazi_pillar_validate_complete_after_statement
    AFTER INSERT OR UPDATE OR DELETE ON public.bazi_pillar_tbl
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.bazi_validate_pillars_complete();
  END IF;
END$$;

-- 5) 表A.hidden_stems：藏干
CREATE TABLE IF NOT EXISTS public.bazi_hidden_stem_tbl (
  hidden_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id           UUID NOT NULL REFERENCES public.bazi_pillar_tbl(pillar_id) ON DELETE CASCADE,

  hidden_stem         CHAR(1) NOT NULL,
  hidden_role         public.bazi_hidden_role_enum NOT NULL,
  role_order          SMALLINT NOT NULL,   -- 1..3

  element             public.bazi_element_enum NOT NULL,
  yinyang             public.bazi_yinyang_enum NOT NULL,
  tenshen             public.bazi_tenshen_enum NOT NULL,

  is_root             BOOLEAN NOT NULL DEFAULT FALSE,
  root_strength       public.bazi_root_strength_enum,

  CONSTRAINT ck_bazi_hidden_stem_len CHECK (char_length(hidden_stem) = 1),
  CONSTRAINT ck_bazi_role_order CHECK (role_order BETWEEN 1 AND 3),
  CONSTRAINT uq_bazi_hidden_role UNIQUE (pillar_id, role_order),
  CONSTRAINT ck_bazi_root_strength_when_root CHECK (
    (is_root = FALSE AND root_strength IS NULL) OR
    (is_root = TRUE  AND root_strength IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_bazi_hidden_stem_tbl_pillar
  ON public.bazi_hidden_stem_tbl(pillar_id);

CREATE INDEX IF NOT EXISTS idx_bazi_hidden_stem_tbl_tenshen
  ON public.bazi_hidden_stem_tbl(tenshen);

-- 6) 表C：透（reveal）关系
CREATE TABLE IF NOT EXISTS public.bazi_reveal_tbl (
  reveal_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id            UUID NOT NULL REFERENCES public.bazi_chart_tbl(chart_id) ON DELETE CASCADE,

  from_hidden_id      UUID NOT NULL REFERENCES public.bazi_hidden_stem_tbl(hidden_id) ON DELETE CASCADE,
  to_pillar_id        UUID NOT NULL REFERENCES public.bazi_pillar_tbl(pillar_id) ON DELETE CASCADE,

  reveal_type         public.bazi_reveal_type_enum NOT NULL DEFAULT 'same_stem',

  CONSTRAINT uq_bazi_reveal UNIQUE (from_hidden_id, to_pillar_id, reveal_type)
);

CREATE INDEX IF NOT EXISTS idx_bazi_reveal_tbl_chart
  ON public.bazi_reveal_tbl(chart_id);

CREATE INDEX IF NOT EXISTS idx_bazi_reveal_tbl_from
  ON public.bazi_reveal_tbl(from_hidden_id);

CREATE INDEX IF NOT EXISTS idx_bazi_reveal_tbl_to
  ON public.bazi_reveal_tbl(to_pillar_id);

-- 7) 表B：十神汇总（缓存表，可不用；视图会实时算）
-- 17_shishen.sql


-- 8) 网D：地支两两关系
CREATE TABLE IF NOT EXISTS public.bazi_branch_relation_tbl (
  relation_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id            UUID NOT NULL REFERENCES public.bazi_chart_tbl(chart_id) ON DELETE CASCADE,

  relation_type       public.bazi_branch_relation_type_enum NOT NULL,

  a_pillar_id         UUID NOT NULL REFERENCES public.bazi_pillar_tbl(pillar_id) ON DELETE CASCADE,
  b_pillar_id         UUID NOT NULL REFERENCES public.bazi_pillar_tbl(pillar_id) ON DELETE CASCADE,

  a_branch            CHAR(1) NOT NULL,
  b_branch            CHAR(1) NOT NULL,

  note                TEXT,

  CONSTRAINT ck_bazi_branch_not_self CHECK (a_pillar_id <> b_pillar_id),
  CONSTRAINT ck_bazi_a_branch_len CHECK (char_length(a_branch) = 1),
  CONSTRAINT ck_bazi_b_branch_len CHECK (char_length(b_branch) = 1),
  CONSTRAINT uq_bazi_branch_relation UNIQUE (chart_id, relation_type, a_pillar_id, b_pillar_id)
);

CREATE INDEX IF NOT EXISTS idx_bazi_branch_relation_tbl_chart
  ON public.bazi_branch_relation_tbl(chart_id);

-- 9) 网D：天干两两关系
CREATE TABLE IF NOT EXISTS public.bazi_stem_relation_tbl (
  relation_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id            UUID NOT NULL REFERENCES public.bazi_chart_tbl(chart_id) ON DELETE CASCADE,

  relation_type       public.bazi_stem_relation_type_enum NOT NULL,

  a_pillar_id         UUID NOT NULL REFERENCES public.bazi_pillar_tbl(pillar_id) ON DELETE CASCADE,
  b_pillar_id         UUID NOT NULL REFERENCES public.bazi_pillar_tbl(pillar_id) ON DELETE CASCADE,

  a_stem              CHAR(1) NOT NULL,
  b_stem              CHAR(1) NOT NULL,

  note                TEXT,

  CONSTRAINT ck_bazi_stem_not_self CHECK (a_pillar_id <> b_pillar_id),
  CONSTRAINT ck_bazi_a_stem_len CHECK (char_length(a_stem) = 1),
  CONSTRAINT ck_bazi_b_stem_len CHECK (char_length(b_stem) = 1),
  CONSTRAINT uq_bazi_stem_relation UNIQUE (chart_id, relation_type, a_pillar_id, b_pillar_id)
);

CREATE INDEX IF NOT EXISTS idx_bazi_stem_relation_tbl_chart
  ON public.bazi_stem_relation_tbl(chart_id);

-- 10) 网D：特殊结构 + 成员
CREATE TABLE IF NOT EXISTS public.bazi_special_structure_tbl (
  structure_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id            UUID NOT NULL REFERENCES public.bazi_chart_tbl(chart_id) ON DELETE CASCADE,

  structure_type      public.bazi_structure_type_enum NOT NULL,
  element             public.bazi_element_enum NOT NULL,
  is_complete         BOOLEAN NOT NULL DEFAULT TRUE,
  is_broken           BOOLEAN NOT NULL DEFAULT FALSE,

  note                TEXT
);

CREATE INDEX IF NOT EXISTS idx_bazi_special_structure_tbl_chart
  ON public.bazi_special_structure_tbl(chart_id);

CREATE TABLE IF NOT EXISTS public.bazi_special_structure_member_tbl (
  member_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id        UUID NOT NULL REFERENCES public.bazi_special_structure_tbl(structure_id) ON DELETE CASCADE,

  pillar_id           UUID NOT NULL REFERENCES public.bazi_pillar_tbl(pillar_id) ON DELETE CASCADE,
  branch              CHAR(1) NOT NULL,
  member_order        SMALLINT NOT NULL,

  CONSTRAINT ck_bazi_member_order CHECK (member_order >= 1),
  CONSTRAINT ck_bazi_member_branch_len CHECK (char_length(branch) = 1),
  CONSTRAINT uq_bazi_structure_member UNIQUE (structure_id, pillar_id)
);

CREATE INDEX IF NOT EXISTS idx_bazi_special_structure_member_tbl_structure
  ON public.bazi_special_structure_member_tbl(structure_id);

-- ============================================================
-- 视图：表A/表B/表C/网D
-- ============================================================

-- 表A：四柱总览（每柱一行）
CREATE OR REPLACE VIEW public.v_bazi_table_a_pillar_overview AS
SELECT
  p.chart_id,
  p.pillar::text AS pillar,
  p.stem,
  (p.stem_element::text || p.stem_yinyang::text) AS stem_element_yinyang,
  p.stem_tenshen::text AS stem_tenshen,
  p.branch,
  p.branch_element::text AS branch_element,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        '干', hs.hidden_stem,
        '主中余', hs.hidden_role::text,
        '五行', hs.element::text,
        '阴阳', hs.yinyang::text,
        '十神', hs.tenshen::text,
        '是否通根', hs.is_root,
        '根强度', COALESCE(hs.root_strength::text, NULL),
        '透到', COALESCE(rv.reveal_to, '[]'::jsonb)
      )
      ORDER BY hs.role_order
    ) FILTER (WHERE hs.hidden_id IS NOT NULL),
    '[]'::jsonb
  ) AS hidden_stems
FROM public.bazi_pillar_tbl p
LEFT JOIN public.bazi_hidden_stem_tbl hs
  ON hs.pillar_id = p.pillar_id
LEFT JOIN LATERAL (
  SELECT COALESCE(
    jsonb_agg((tp.pillar::text || '_stem') ORDER BY tp.sort_order),
    '[]'::jsonb
  ) AS reveal_to
  FROM public.bazi_reveal_tbl r
  JOIN public.bazi_pillar_tbl tp ON tp.pillar_id = r.to_pillar_id
  WHERE r.from_hidden_id = hs.hidden_id
) rv ON TRUE
GROUP BY
  p.chart_id, p.pillar_id, p.pillar, p.stem, p.stem_element, p.stem_yinyang, p.stem_tenshen, p.branch, p.branch_element;


-- 表B：十神汇总（实时）
CREATE OR REPLACE VIEW public.v_bazi_table_b_tenshen_summary AS
WITH stem_cnt AS (
  SELECT
    p.chart_id,
    'stem'::text AS source,
    p.stem_tenshen AS tenshen,
    COUNT(*)::int AS cnt
  FROM public.bazi_pillar_tbl p
  GROUP BY p.chart_id, p.stem_tenshen
),
hidden_base AS (
  SELECT
    p.chart_id,
    hs.hidden_id,
    hs.tenshen
  FROM public.bazi_pillar_tbl p
  JOIN public.bazi_hidden_stem_tbl hs ON hs.pillar_id = p.pillar_id
),
hidden_vis AS (
  SELECT
    hb.chart_id,
    hb.tenshen,
    COUNT(*)::int AS cnt,
    (COUNT(r.reveal_id) > 0) AS is_visible,
    COALESCE(COUNT(DISTINCT r.to_pillar_id), 0)::int AS visible_pillar_cnt
  FROM hidden_base hb
  LEFT JOIN public.bazi_reveal_tbl r ON r.from_hidden_id = hb.hidden_id
  GROUP BY hb.chart_id, hb.tenshen
)
SELECT chart_id, source, tenshen::text AS tenshen, cnt, FALSE AS is_visible, 0 AS visible_pillar_cnt
FROM stem_cnt
UNION ALL
SELECT chart_id, 'hidden'::text AS source, tenshen::text, cnt, is_visible, visible_pillar_cnt
FROM hidden_vis;


-- 表C：根与透汇总（每个 chart 一行）
CREATE OR REPLACE VIEW public.v_bazi_table_c_roots_and_reveals AS
WITH roots AS (
  SELECT
    p.chart_id,
    hs.root_strength,
    jsonb_build_object(
      '柱', p.pillar::text,
      '支', p.branch,
      '藏干', hs.hidden_stem,
      '根强度', hs.root_strength::text,
      '十神', hs.tenshen::text
    ) AS detail
  FROM public.bazi_pillar_tbl p
  JOIN public.bazi_hidden_stem_tbl hs ON hs.pillar_id = p.pillar_id
  WHERE hs.is_root = TRUE
),
roots_agg AS (
  SELECT
    r.chart_id,
    jsonb_build_object(
      'counts', jsonb_build_object(
        '本气根', COALESCE(SUM((r.root_strength = '本气根')::int),0),
        '中气根', COALESCE(SUM((r.root_strength = '中气根')::int),0),
        '余气根', COALESCE(SUM((r.root_strength = '余气根')::int),0)
      ),
      'details', COALESCE(jsonb_agg(r.detail), '[]'::jsonb)
    ) AS roots_summary
  FROM roots r
  GROUP BY r.chart_id
),
reveals AS (
  SELECT
    fp.chart_id,
    jsonb_build_object(
      '从柱', fp.pillar::text,
      '从支', fp.branch,
      '藏干', hs.hidden_stem,
      '十神', hs.tenshen::text,
      '透到', jsonb_agg(tp.pillar::text ORDER BY tp.sort_order)
    ) AS item
  FROM public.bazi_reveal_tbl r
  JOIN public.bazi_hidden_stem_tbl hs ON hs.hidden_id = r.from_hidden_id
  JOIN public.bazi_pillar_tbl fp ON fp.pillar_id = hs.pillar_id
  JOIN public.bazi_pillar_tbl tp ON tp.pillar_id = r.to_pillar_id
  GROUP BY fp.chart_id, fp.pillar, fp.branch, hs.hidden_stem, hs.tenshen
),
reveals_agg AS (
  SELECT
    chart_id,
    COALESCE(jsonb_agg(item), '[]'::jsonb) AS reveals_summary
  FROM reveals
  GROUP BY chart_id
)
SELECT
  c.chart_id,
  COALESCE(
    ra.roots_summary,
    jsonb_build_object(
      'counts', jsonb_build_object('本气根',0,'中气根',0,'余气根',0),
      'details','[]'::jsonb
    )
  ) AS roots_summary,
  COALESCE(rv.reveals_summary, '[]'::jsonb) AS reveals_summary
FROM public.bazi_chart_tbl c
LEFT JOIN roots_agg ra ON ra.chart_id = c.chart_id
LEFT JOIN reveals_agg rv ON rv.chart_id = c.chart_id;


-- 网D：关系网（每个 chart 一行）
CREATE OR REPLACE VIEW public.v_bazi_net_d_relations AS
WITH br AS (
  SELECT
    r.chart_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'type', r.relation_type::text,
          'a', (ap.pillar::text || '(支=' || r.a_branch || ')'),
          'b', (bp.pillar::text || '(支=' || r.b_branch || ')'),
          'note', COALESCE(r.note,'')
        )
      ),
      '[]'::jsonb
    ) AS branch_relations
  FROM public.bazi_branch_relation_tbl r
  JOIN public.bazi_pillar_tbl ap ON ap.pillar_id = r.a_pillar_id
  JOIN public.bazi_pillar_tbl bp ON bp.pillar_id = r.b_pillar_id
  GROUP BY r.chart_id
),
sr AS (
  SELECT
    r.chart_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'type', r.relation_type::text,
          'a', (ap.pillar::text || '(干=' || r.a_stem || ')'),
          'b', (bp.pillar::text || '(干=' || r.b_stem || ')'),
          'note', COALESCE(r.note,'')
        )
      ),
      '[]'::jsonb
    ) AS stem_relations
  FROM public.bazi_stem_relation_tbl r
  JOIN public.bazi_pillar_tbl ap ON ap.pillar_id = r.a_pillar_id
  JOIN public.bazi_pillar_tbl bp ON bp.pillar_id = r.b_pillar_id
  GROUP BY r.chart_id
),
ss AS (
  SELECT
    s.chart_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'type', s.structure_type::text,
          'element', s.element::text,
          'is_complete', s.is_complete,
          'is_broken', s.is_broken,
          'members', COALESCE(m.members, '[]'::jsonb),
          'note', COALESCE(s.note,'')
        )
      ),
      '[]'::jsonb
    ) AS special_structures
  FROM public.bazi_special_structure_tbl s
  LEFT JOIN LATERAL (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'pillar', p.pillar::text,
          'branch', sm.branch
        )
        ORDER BY sm.member_order
      ) AS members
    FROM public.bazi_special_structure_member_tbl sm
    JOIN public.bazi_pillar_tbl p ON p.pillar_id = sm.pillar_id
    WHERE sm.structure_id = s.structure_id
  ) m ON TRUE
  GROUP BY s.chart_id
)
SELECT
  c.chart_id,
  COALESCE(br.branch_relations, '[]'::jsonb)     AS branch_relations,
  COALESCE(sr.stem_relations, '[]'::jsonb)       AS stem_relations,
  COALESCE(ss.special_structures, '[]'::jsonb)   AS special_structures
FROM public.bazi_chart_tbl c
LEFT JOIN br ON br.chart_id = c.chart_id
LEFT JOIN sr ON sr.chart_id = c.chart_id
LEFT JOIN ss ON ss.chart_id = c.chart_id;

-- ============================================================
-- 使用示例：
-- SELECT * FROM public.v_bazi_table_a_pillar_overview WHERE chart_id = '...';
-- SELECT * FROM public.v_bazi_table_b_tenshen_summary   WHERE chart_id = '...';
-- SELECT * FROM public.v_bazi_table_c_roots_and_reveals WHERE chart_id = '...';
-- SELECT * FROM public.v_bazi_net_d_relations           WHERE chart_id = '...';
-- ============================================================
