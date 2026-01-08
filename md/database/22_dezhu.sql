-- 明细表
DROP TABLE IF EXISTS bazi_support_detail_tbl;
DROP TABLE IF EXISTS bazi_support_summary_tbl;
DROP TABLE IF EXISTS dict_support_ruleset;

CREATE TABLE bazi_support_detail_tbl (
  id BIGSERIAL PRIMARY KEY,
  chart_id UUID NOT NULL,
  pillar VARCHAR(10) NOT NULL, -- year/month/day/hour
  source_type VARCHAR(20) NOT NULL, -- stem/hidden_stem
  stem VARCHAR(10) NOT NULL, -- 天干
  element VARCHAR(10) NOT NULL, -- 五行
  ten_god VARCHAR(20), -- 十神（比肩/劫财/正印/偏印）
  support_type VARCHAR(20) NOT NULL, -- same_class/shengfu
  hidden_rank VARCHAR(10), -- 主/中/余（仅藏干）
  base_score NUMERIC(10,4) NOT NULL,
  position_weight NUMERIC(10,4) NOT NULL,
  hidden_weight NUMERIC(10,4) NOT NULL,
  final_score NUMERIC(10,4) NOT NULL,
  evidence_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE bazi_support_detail_tbl IS '得助明细表：记录每条同类/生扶来源及其评分证据';
COMMENT ON COLUMN bazi_support_detail_tbl.id IS '自增主键';
COMMENT ON COLUMN bazi_support_detail_tbl.chart_id IS '排盘ID';
COMMENT ON COLUMN bazi_support_detail_tbl.pillar IS '来源柱位：year/month/day/hour';
COMMENT ON COLUMN bazi_support_detail_tbl.source_type IS '来源类型：stem/hidden_stem';
COMMENT ON COLUMN bazi_support_detail_tbl.stem IS '天干';
COMMENT ON COLUMN bazi_support_detail_tbl.element IS '五行';
COMMENT ON COLUMN bazi_support_detail_tbl.ten_god IS '十神（比肩/劫财/正印/偏印）';
COMMENT ON COLUMN bazi_support_detail_tbl.support_type IS '助力类型：same_class/shengfu';
COMMENT ON COLUMN bazi_support_detail_tbl.hidden_rank IS '藏干层级：主/中/余（仅藏干）';
COMMENT ON COLUMN bazi_support_detail_tbl.base_score IS '基础分';
COMMENT ON COLUMN bazi_support_detail_tbl.position_weight IS '柱位权重';
COMMENT ON COLUMN bazi_support_detail_tbl.hidden_weight IS '藏干层级权重';
COMMENT ON COLUMN bazi_support_detail_tbl.final_score IS '最终得助分';
COMMENT ON COLUMN bazi_support_detail_tbl.evidence_json IS '证据JSON';
COMMENT ON COLUMN bazi_support_detail_tbl.created_at IS '创建时间';

-- 汇总表

CREATE TABLE bazi_support_summary_tbl (
  id BIGSERIAL PRIMARY KEY,
  chart_id UUID NOT NULL,
  same_class_score NUMERIC(10,4) NOT NULL,
  shengfu_score NUMERIC(10,4) NOT NULL,
  total_support_score NUMERIC(10,4) NOT NULL,
  ruleset_id VARCHAR(50) NOT NULL DEFAULT 'default',
  evidence_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE bazi_support_summary_tbl IS '得助汇总表：同类/生扶/总分';
COMMENT ON COLUMN bazi_support_summary_tbl.id IS '自增主键';
COMMENT ON COLUMN bazi_support_summary_tbl.chart_id IS '排盘ID';
COMMENT ON COLUMN bazi_support_summary_tbl.same_class_score IS '同类得助分';
COMMENT ON COLUMN bazi_support_summary_tbl.shengfu_score IS '生扶得助分';
COMMENT ON COLUMN bazi_support_summary_tbl.total_support_score IS '总得助分';
COMMENT ON COLUMN bazi_support_summary_tbl.ruleset_id IS '规则集ID';
COMMENT ON COLUMN bazi_support_summary_tbl.evidence_json IS '证据JSON';
COMMENT ON COLUMN bazi_support_summary_tbl.created_at IS '创建时间';

-- 规则表

CREATE TABLE dict_support_ruleset (
  ruleset_id VARCHAR(50) PRIMARY KEY,
  base_score_same_class NUMERIC(10,4) NOT NULL DEFAULT 1.0000,
  base_score_shengfu NUMERIC(10,4) NOT NULL DEFAULT 1.0000,
  stem_position_weights JSONB NOT NULL,
  hidden_position_weights JSONB NOT NULL,
  hidden_rank_weights JSONB NOT NULL,
  include_day_stem BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE dict_support_ruleset IS '得助规则集：基础分与位置/藏干权重配置';
COMMENT ON COLUMN dict_support_ruleset.ruleset_id IS '规则集ID';
COMMENT ON COLUMN dict_support_ruleset.base_score_same_class IS '同类基础分';
COMMENT ON COLUMN dict_support_ruleset.base_score_shengfu IS '生扶基础分';
COMMENT ON COLUMN dict_support_ruleset.stem_position_weights IS '天干位置权重JSON';
COMMENT ON COLUMN dict_support_ruleset.hidden_position_weights IS '地支位置权重JSON';
COMMENT ON COLUMN dict_support_ruleset.hidden_rank_weights IS '藏干层级权重JSON';
COMMENT ON COLUMN dict_support_ruleset.include_day_stem IS '是否计算日干本身';
COMMENT ON COLUMN dict_support_ruleset.note IS '备注';
COMMENT ON COLUMN dict_support_ruleset.created_at IS '创建时间';