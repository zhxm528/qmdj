-- =========================
-- 1) 月支 -> 季节
-- =========================
-- =========================================================
-- 清理已存在的对象（如果存在则先删除，确保重新执行时不会报错）
-- =========================================================

-- 删除索引
DROP INDEX IF EXISTS public.idx_dict_mbo_lookup;

-- 删除表（按依赖关系反向顺序）
DROP TABLE IF EXISTS public.dict_month_branch_override CASCADE;
DROP TABLE IF EXISTS public.dict_season_element_state CASCADE;
DROP TABLE IF EXISTS public.dict_branch_season CASCADE;


-- =========================
-- 1) 月支 -> 季节
-- =========================
CREATE TABLE IF NOT EXISTS public.dict_branch_season (
  branch        text PRIMARY KEY,     -- 月支：子丑寅卯辰巳午未申酉戌亥
  season        text NOT NULL,         -- 季节：春夏秋冬
  note          text NULL
);

COMMENT ON TABLE public.dict_branch_season IS '月令（月支）到季节的固定映射（用于旺相休囚死计算的第一步）';
COMMENT ON COLUMN public.dict_branch_season.branch IS '月支（12地支之一）';
COMMENT ON COLUMN public.dict_branch_season.season IS '季节（春/夏/秋/冬）';

ALTER TABLE public.dict_branch_season
  ADD CONSTRAINT ck_dict_branch_season_branch
  CHECK (branch IN ('子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'));

ALTER TABLE public.dict_branch_season
  ADD CONSTRAINT ck_dict_branch_season_season
  CHECK (season IN ('春','夏','秋','冬'));


-- =========================
-- 2) 季节 × 五行 -> 旺相休囚死（默认规则集）
--    rule_set 用来支持不同门派/算法版本
-- =========================
CREATE TABLE IF NOT EXISTS public.dict_season_element_state (
  rule_set      text NOT NULL DEFAULT 'default',  -- 规则集：default / school_xxx / etc
  season        text NOT NULL,                     -- 春夏秋冬
  element       text NOT NULL,                     -- 木火土金水
  state         text NOT NULL,                     -- 旺相休囚死
  state_rank    smallint NOT NULL,                 -- 用于排序/打分：旺=5 相=4 休=3 囚=2 死=1（可自行调整）
  note          text NULL,
  PRIMARY KEY (rule_set, season, element)
);

COMMENT ON TABLE public.dict_season_element_state IS '季节×五行的旺相休囚死（默认月令强弱字典表；可用 rule_set 支持不同门派）';
COMMENT ON COLUMN public.dict_season_element_state.rule_set IS '规则集标识（默认 default）';
COMMENT ON COLUMN public.dict_season_element_state.state_rank IS '旺相休囚死强弱数值，用于计算/排序';

ALTER TABLE public.dict_season_element_state
  ADD CONSTRAINT ck_dict_ses_season
  CHECK (season IN ('春','夏','秋','冬'));

ALTER TABLE public.dict_season_element_state
  ADD CONSTRAINT ck_dict_ses_element
  CHECK (element IN ('木','火','土','金','水'));

ALTER TABLE public.dict_season_element_state
  ADD CONSTRAINT ck_dict_ses_state
  CHECK (state IN ('旺','相','休','囚','死'));

ALTER TABLE public.dict_season_element_state
  ADD CONSTRAINT ck_dict_ses_rank
  CHECK (state_rank BETWEEN 1 AND 5);


-- =========================
-- 3) 月支 × 五行 -> 覆盖状态（可选）
--    用于：辰戌丑未土旺、或其他门派差异
--    priority 用于同一 rule_set 多条覆盖时取最高优先级
-- =========================
CREATE TABLE IF NOT EXISTS public.dict_month_branch_override (
  rule_set      text NOT NULL,                 -- 覆盖归属哪个规则集（比如 soil_wang_siku）
  branch        text NOT NULL,                 -- 月支
  element       text NOT NULL,                 -- 五行
  state         text NOT NULL,                 -- 覆盖后的旺相休囚死
  state_rank    smallint NOT NULL,             -- 覆盖后的rank
  priority      integer NOT NULL DEFAULT 100,  -- 数值越大越优先
  is_enabled    boolean NOT NULL DEFAULT true,
  note          text NULL,
  PRIMARY KEY (rule_set, branch, element)
);

COMMENT ON TABLE public.dict_month_branch_override IS '月支×五行的旺相休囚死覆盖表（用于土旺四库等门派差异）；查询时优先使用覆盖';
COMMENT ON COLUMN public.dict_month_branch_override.rule_set IS '覆盖规则集标识（例：soil_wang_siku）';
COMMENT ON COLUMN public.dict_month_branch_override.priority IS '覆盖优先级（同rule_set冲突时取最大）';

ALTER TABLE public.dict_month_branch_override
  ADD CONSTRAINT ck_dict_mbo_branch
  CHECK (branch IN ('子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'));

ALTER TABLE public.dict_month_branch_override
  ADD CONSTRAINT ck_dict_mbo_element
  CHECK (element IN ('木','火','土','金','水'));

ALTER TABLE public.dict_month_branch_override
  ADD CONSTRAINT ck_dict_mbo_state
  CHECK (state IN ('旺','相','休','囚','死'));

ALTER TABLE public.dict_month_branch_override
  ADD CONSTRAINT ck_dict_mbo_rank
  CHECK (state_rank BETWEEN 1 AND 5);

CREATE INDEX IF NOT EXISTS idx_dict_mbo_lookup
  ON public.dict_month_branch_override (rule_set, branch, element)
  WHERE is_enabled = true;


-- =========================================================
-- 初始化数据
-- =========================================================

-- 1) dict_branch_season：月支 -> 季节（四季法）
INSERT INTO public.dict_branch_season (branch, season, note) VALUES
('寅','春','春：寅卯辰'),
('卯','春','春：寅卯辰'),
('辰','春','春：寅卯辰（季末土月）'),
('巳','夏','夏：巳午未'),
('午','夏','夏：巳午未'),
('未','夏','夏：巳午未（季末土月）'),
('申','秋','秋：申酉戌'),
('酉','秋','秋：申酉戌'),
('戌','秋','秋：申酉戌（季末土月）'),
('亥','冬','冬：亥子丑'),
('子','冬','冬：亥子丑'),
('丑','冬','冬：亥子丑（季末土月）')
ON CONFLICT (branch) DO UPDATE
SET season = EXCLUDED.season,
    note   = EXCLUDED.note;


-- 2) dict_season_element_state：默认规则集 default
-- 春：木旺 火相 水休 金囚 土死
INSERT INTO public.dict_season_element_state (rule_set, season, element, state, state_rank, note) VALUES
('default','春','木','旺',5,'春木旺'),
('default','春','火','相',4,'春火相'),
('default','春','水','休',3,'春水休'),
('default','春','金','囚',2,'春金囚'),
('default','春','土','死',1,'春土死')
ON CONFLICT (rule_set, season, element) DO UPDATE
SET state = EXCLUDED.state, state_rank = EXCLUDED.state_rank, note = EXCLUDED.note;

-- 夏：火旺 土相 木休 水囚 金死
INSERT INTO public.dict_season_element_state (rule_set, season, element, state, state_rank, note) VALUES
('default','夏','火','旺',5,'夏火旺'),
('default','夏','土','相',4,'夏土相'),
('default','夏','木','休',3,'夏木休'),
('default','夏','水','囚',2,'夏水囚'),
('default','夏','金','死',1,'夏金死')
ON CONFLICT (rule_set, season, element) DO UPDATE
SET state = EXCLUDED.state, state_rank = EXCLUDED.state_rank, note = EXCLUDED.note;

-- 秋：金旺 水相 土休 火囚 木死
INSERT INTO public.dict_season_element_state (rule_set, season, element, state, state_rank, note) VALUES
('default','秋','金','旺',5,'秋金旺'),
('default','秋','水','相',4,'秋水相'),
('default','秋','土','休',3,'秋土休'),
('default','秋','火','囚',2,'秋火囚'),
('default','秋','木','死',1,'秋木死')
ON CONFLICT (rule_set, season, element) DO UPDATE
SET state = EXCLUDED.state, state_rank = EXCLUDED.state_rank, note = EXCLUDED.note;

-- 冬：水旺 木相 金休 土囚 火死
INSERT INTO public.dict_season_element_state (rule_set, season, element, state, state_rank, note) VALUES
('default','冬','水','旺',5,'冬水旺'),
('default','冬','木','相',4,'冬木相'),
('default','冬','金','休',3,'冬金休'),
('default','冬','土','囚',2,'冬土囚'),
('default','冬','火','死',1,'冬火死')
ON CONFLICT (rule_set, season, element) DO UPDATE
SET state = EXCLUDED.state, state_rank = EXCLUDED.state_rank, note = EXCLUDED.note;


-- 3) dict_month_branch_override：示例规则集 soil_wang_siku（辰戌丑未土旺）
-- 你在计算时若选择 rule_set='soil_wang_siku'，就优先应用这些覆盖
INSERT INTO public.dict_month_branch_override (rule_set, branch, element, state, state_rank, priority, is_enabled, note) VALUES
('soil_wang_siku','辰','土','旺',5,100,true,'辰为四库之一，按此规则土旺'),
('soil_wang_siku','未','土','旺',5,100,true,'未为四库之一，按此规则土旺'),
('soil_wang_siku','戌','土','旺',5,100,true,'戌为四库之一，按此规则土旺'),
('soil_wang_siku','丑','土','旺',5,100,true,'丑为四库之一，按此规则土旺')
ON CONFLICT (rule_set, branch, element) DO UPDATE
SET state      = EXCLUDED.state,
    state_rank = EXCLUDED.state_rank,
    priority   = EXCLUDED.priority,
    is_enabled = EXCLUDED.is_enabled,
    note       = EXCLUDED.note;
