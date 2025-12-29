BEGIN;

-- 1) 规则“定义表”：描述这类关系是什么
CREATE TABLE IF NOT EXISTS public.bazi_relation_rule (
  rule_id        bigserial PRIMARY KEY,
  rule_code      text NOT NULL UNIQUE,              -- 机器可用：GAN_WUHE / ZHI_LIUHE / ZHI_SANHE ...
  name_cn        text NOT NULL,                     -- 中文名：五合/六合/三合/三会/冲/刑/害/破/干克/干合
  domain         text NOT NULL CHECK (domain IN ('GAN','ZHI','MIXED')), -- 适用对象：天干/地支/混合
  min_arity      smallint NOT NULL CHECK (min_arity BETWEEN 1 AND 3),  -- 最少参与元素个数（自刑=1）
  max_arity      smallint NOT NULL CHECK (max_arity BETWEEN 1 AND 3),  -- 最多参与元素个数（三合=3）
  is_symmetric   boolean NOT NULL DEFAULT true,     -- 是否对称（如六合对称；干克通常不对称）
  is_directional boolean NOT NULL DEFAULT false,    -- 是否有方向（干克有方向）
  output_kind    text NOT NULL DEFAULT 'NONE',      -- 输出类型：NONE / WUXING（如五合合化五行）
  remark         text
);

COMMENT ON TABLE public.bazi_relation_rule IS '八字固定关系规则：关系类别定义（五合/六合/三合/三会/冲/刑/害/破/干克/干合等）';
COMMENT ON COLUMN public.bazi_relation_rule.rule_code IS '规则代码（程序键）';
COMMENT ON COLUMN public.bazi_relation_rule.domain IS '适用对象域：GAN=天干，ZHI=地支';
COMMENT ON COLUMN public.bazi_relation_rule.min_arity IS '关系参与元素最小数量：自刑=1，六合/冲/害/破/五合=2，三合/三会=3';
COMMENT ON COLUMN public.bazi_relation_rule.output_kind IS '输出类型：例如五合/干合可输出合化五行';

-- 2) 规则“明细表”：存固定字典条目（谁和谁/谁和谁和谁成立）
CREATE TABLE IF NOT EXISTS public.bazi_relation_entry (
  entry_id      bigserial PRIMARY KEY,
  rule_id       bigint NOT NULL REFERENCES public.bazi_relation_rule(rule_id) ON DELETE CASCADE,
  participants  text[] NOT NULL,          -- 参与者数组：长度 1~3（如 ['子','丑'] / ['申','子','辰'] / ['辰']）
  output_wuxing text,                     -- 可选：合化五行等输出
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb, -- 可选补充：刑的类别、备注、流派差异标记等
  CHECK (cardinality(participants) BETWEEN 1 AND 3)
);

-- 防止同一规则下重复插入同一条固定字典
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_bazi_relation_entry_rule_participants'
      AND conrelid = 'public.bazi_relation_entry'::regclass
  ) THEN
    ALTER TABLE public.bazi_relation_entry
      ADD CONSTRAINT uq_bazi_relation_entry_rule_participants UNIQUE (rule_id, participants);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_bazi_relation_entry_rule_id
  ON public.bazi_relation_entry(rule_id);

-- 数组包含/集合查询会用到（查三合三会特别方便）
CREATE INDEX IF NOT EXISTS gin_bazi_relation_entry_participants
  ON public.bazi_relation_entry USING gin (participants);

COMMENT ON TABLE public.bazi_relation_entry IS '八字固定关系字典明细：按规则存具体成立的组合（participants 数组）';

-- ------------------------------------------------------------
-- 3) 插入 10 类规则定义（幂等）
INSERT INTO public.bazi_relation_rule (rule_code, name_cn, domain, min_arity, max_arity, is_symmetric, is_directional, output_kind, remark)
VALUES
  ('GAN_WUHE',   '五合', 'GAN', 2, 2, true,  false, 'WUXING', '天干五合（同“干合”常见说法之一）'),
  ('GAN_HE',     '干合', 'GAN', 2, 2, true,  false, 'WUXING', '通常与“五合”同表（这里单独建一个规则码，便于兼容调用）'),
  ('ZHI_LIUHE',  '六合', 'ZHI', 2, 2, true,  false, 'NONE',  '地支六合'),
  ('ZHI_SANHE',  '三合', 'ZHI', 3, 3, true,  false, 'WUXING','地支三合局'),
  ('ZHI_SANHUI', '三会', 'ZHI', 3, 3, true,  false, 'WUXING','地支三会局'),
  ('ZHI_CHONG',  '冲',   'ZHI', 2, 2, true,  false, 'NONE',  '地支六冲'),
  ('ZHI_XING',   '刑',   'ZHI', 1, 3, false, false, 'NONE',  '地支刑：含三刑/相刑/自刑（用 meta.kind 区分）'),
  ('ZHI_HAI',    '害',   'ZHI', 2, 2, true,  false, 'NONE',  '地支六害'),
  ('ZHI_PO',     '破',   'ZHI', 2, 2, true,  false, 'NONE',  '地支六破'),
  ('GAN_KE',     '干克', 'GAN', 2, 2, false, true,  'NONE',  '天干相克（方向性），通常可由五行相克 + 天干五行映射推导；此处存成固定对照对，查询更直接')
ON CONFLICT (rule_code) DO UPDATE
SET name_cn = EXCLUDED.name_cn,
    domain = EXCLUDED.domain,
    min_arity = EXCLUDED.min_arity,
    max_arity = EXCLUDED.max_arity,
    is_symmetric = EXCLUDED.is_symmetric,
    is_directional = EXCLUDED.is_directional,
    output_kind = EXCLUDED.output_kind,
    remark = EXCLUDED.remark;

-- ------------------------------------------------------------
-- 4) 插入规则明细（固定字典，幂等）
-- 4.1 五合 / 干合（同一套条目，复制两份 rule_code 以兼容两种叫法）
INSERT INTO public.bazi_relation_entry (rule_id, participants, output_wuxing)
VALUES
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_WUHE'), ARRAY['甲','己'], '土'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_WUHE'), ARRAY['乙','庚'], '金'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_WUHE'), ARRAY['丙','辛'], '水'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_WUHE'), ARRAY['丁','壬'], '木'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_WUHE'), ARRAY['戊','癸'], '火'),

  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_HE'),   ARRAY['甲','己'], '土'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_HE'),   ARRAY['乙','庚'], '金'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_HE'),   ARRAY['丙','辛'], '水'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_HE'),   ARRAY['丁','壬'], '木'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_HE'),   ARRAY['戊','癸'], '火')
ON CONFLICT (rule_id, participants) DO UPDATE
SET output_wuxing = EXCLUDED.output_wuxing;

-- 4.2 六合（建议对称关系存一条即可；如果你更喜欢查 A->B 直接命中，可再插反向一条）
INSERT INTO public.bazi_relation_entry (rule_id, participants)
VALUES
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_LIUHE'), ARRAY['子','丑']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_LIUHE'), ARRAY['寅','亥']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_LIUHE'), ARRAY['卯','戌']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_LIUHE'), ARRAY['辰','酉']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_LIUHE'), ARRAY['巳','申']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_LIUHE'), ARRAY['午','未'])
ON CONFLICT (rule_id, participants) DO NOTHING;

-- 4.3 三合
INSERT INTO public.bazi_relation_entry (rule_id, participants, output_wuxing)
VALUES
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_SANHE'), ARRAY['申','子','辰'], '水'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_SANHE'), ARRAY['寅','午','戌'], '火'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_SANHE'), ARRAY['亥','卯','未'], '木'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_SANHE'), ARRAY['巳','酉','丑'], '金')
ON CONFLICT (rule_id, participants) DO UPDATE
SET output_wuxing = EXCLUDED.output_wuxing;

-- 4.4 三会
INSERT INTO public.bazi_relation_entry (rule_id, participants, output_wuxing)
VALUES
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_SANHUI'), ARRAY['亥','子','丑'], '水'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_SANHUI'), ARRAY['寅','卯','辰'], '木'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_SANHUI'), ARRAY['巳','午','未'], '火'),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_SANHUI'), ARRAY['申','酉','戌'], '金')
ON CONFLICT (rule_id, participants) DO UPDATE
SET output_wuxing = EXCLUDED.output_wuxing;

-- 4.5 冲
INSERT INTO public.bazi_relation_entry (rule_id, participants)
VALUES
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_CHONG'), ARRAY['子','午']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_CHONG'), ARRAY['丑','未']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_CHONG'), ARRAY['寅','申']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_CHONG'), ARRAY['卯','酉']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_CHONG'), ARRAY['辰','戌']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_CHONG'), ARRAY['巳','亥'])
ON CONFLICT (rule_id, participants) DO NOTHING;

-- 4.6 刑（三刑/相刑/自刑，用 meta.kind 区分）
INSERT INTO public.bazi_relation_entry (rule_id, participants, meta)
VALUES
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_XING'), ARRAY['寅','巳','申'], '{"kind":"三刑"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_XING'), ARRAY['丑','未','戌'], '{"kind":"三刑"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_XING'), ARRAY['子','卯'],     '{"kind":"相刑"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_XING'), ARRAY['辰'],         '{"kind":"自刑"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_XING'), ARRAY['午'],         '{"kind":"自刑"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_XING'), ARRAY['酉'],         '{"kind":"自刑"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_XING'), ARRAY['亥'],         '{"kind":"自刑"}'::jsonb)
ON CONFLICT (rule_id, participants) DO UPDATE
SET meta = EXCLUDED.meta;

-- 4.7 害
INSERT INTO public.bazi_relation_entry (rule_id, participants)
VALUES
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_HAI'), ARRAY['子','未']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_HAI'), ARRAY['丑','午']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_HAI'), ARRAY['寅','巳']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_HAI'), ARRAY['卯','辰']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_HAI'), ARRAY['申','亥']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_HAI'), ARRAY['酉','戌'])
ON CONFLICT (rule_id, participants) DO NOTHING;

-- 4.8 破
INSERT INTO public.bazi_relation_entry (rule_id, participants)
VALUES
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_PO'), ARRAY['子','酉']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_PO'), ARRAY['卯','午']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_PO'), ARRAY['辰','丑']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_PO'), ARRAY['未','戌']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_PO'), ARRAY['寅','亥']),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='ZHI_PO'), ARRAY['巳','申'])
ON CONFLICT (rule_id, participants) DO NOTHING;

-- 4.9 干克（方向性：A 克 B。这里直接存“天干对天干”的固定对照对）
-- 木克土：甲乙 克 戊己
-- 土克水：戊己 克 壬癸
-- 水克火：壬癸 克 丙丁
-- 火克金：丙丁 克 庚辛
-- 金克木：庚辛 克 甲乙
INSERT INTO public.bazi_relation_entry (rule_id, participants, meta)
VALUES
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['甲','戊'], '{"a_element":"木","b_element":"土"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['甲','己'], '{"a_element":"木","b_element":"土"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['乙','戊'], '{"a_element":"木","b_element":"土"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['乙','己'], '{"a_element":"木","b_element":"土"}'::jsonb),

  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['戊','壬'], '{"a_element":"土","b_element":"水"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['戊','癸'], '{"a_element":"土","b_element":"水"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['己','壬'], '{"a_element":"土","b_element":"水"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['己','癸'], '{"a_element":"土","b_element":"水"}'::jsonb),

  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['壬','丙'], '{"a_element":"水","b_element":"火"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['壬','丁'], '{"a_element":"水","b_element":"火"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['癸','丙'], '{"a_element":"水","b_element":"火"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['癸','丁'], '{"a_element":"水","b_element":"火"}'::jsonb),

  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['丙','庚'], '{"a_element":"火","b_element":"金"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['丙','辛'], '{"a_element":"火","b_element":"金"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['丁','庚'], '{"a_element":"火","b_element":"金"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['丁','辛'], '{"a_element":"火","b_element":"金"}'::jsonb),

  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['庚','甲'], '{"a_element":"金","b_element":"木"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['庚','乙'], '{"a_element":"金","b_element":"木"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['辛','甲'], '{"a_element":"金","b_element":"木"}'::jsonb),
  ((SELECT r.rule_id FROM public.bazi_relation_rule r WHERE r.rule_code='GAN_KE'), ARRAY['辛','乙'], '{"a_element":"金","b_element":"木"}'::jsonb)
ON CONFLICT (rule_id, participants) DO UPDATE
SET meta = EXCLUDED.meta;

COMMIT;
