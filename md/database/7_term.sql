-- ============================================================
-- 1. 清理旧表（注意顺序：先删子表，再删父表）
-- ============================================================
DROP TABLE IF EXISTS term_relation;
DROP TABLE IF EXISTS term;
DROP TABLE IF EXISTS term_category;

-- ============================================================
-- 2. 术语分类表 term_category
--    用于给名词解释做大类划分，例如：会员体系、支付结算等
-- ============================================================
CREATE TABLE term_category (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(128) NOT NULL,           -- 分类名称：如“会员体系”
    code        VARCHAR(64)  NOT NULL UNIQUE,    -- 分类编码：如 member, payment
    description VARCHAR(512),                    -- 分类说明
    sort_order  INT DEFAULT 100,                 -- 排序值，越小越靠前
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE term_category IS '名词解释 - 分类表，用于对术语进行大类划分';

COMMENT ON COLUMN term_category.id          IS '主键，自增ID';
COMMENT ON COLUMN term_category.name        IS '分类名称，如“会员体系”、“支付结算”';
COMMENT ON COLUMN term_category.code        IS '分类编码，英文或拼音，用于程序内部使用且唯一';
COMMENT ON COLUMN term_category.description IS '分类说明，描述该分类下术语的范围';
COMMENT ON COLUMN term_category.sort_order  IS '排序值，数值越小展示越靠前';
COMMENT ON COLUMN term_category.created_at  IS '创建时间';
COMMENT ON COLUMN term_category.updated_at  IS '最后一次更新时间';


-- ============================================================
-- 3. 术语表 term
--    存储具体的名词解释数据
-- ============================================================
CREATE TABLE term (
    id              BIGSERIAL PRIMARY KEY,
    term_key        VARCHAR(128) NOT NULL UNIQUE,   -- 系统内部唯一标识/路由Key，如 member_level
    name            VARCHAR(256) NOT NULL,          -- 显示名称，如“会员等级”
    alias           VARCHAR(512),                   -- 别名/缩写/旧称，用逗号分隔：如 "VIP,等级"
    pinyin          VARCHAR(512),                   -- 名称的拼音或简拼：如 "huiyuan dengji, hydj"
    category_id     BIGINT REFERENCES term_category(id), -- 所属分类ID
    short_desc      VARCHAR(512),                   -- 列表展示用的简要说明（1~2 句话）
    full_desc       TEXT,                           -- 详细解释，支持较长文本
    status          SMALLINT NOT NULL DEFAULT 1,    -- 状态：1=启用，0=停用
    sort_order      INT DEFAULT 1000,               -- 排序值：列表展示顺序
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE term IS '名词解释 - 术语表，存储具体的名词及解释内容';

COMMENT ON COLUMN term.id          IS '主键，自增ID';
COMMENT ON COLUMN term.term_key    IS '术语唯一键，用于路由或接口标识，如“member_level”，全局唯一';
COMMENT ON COLUMN term.name        IS '术语名称，对用户展示，如“会员等级”';
COMMENT ON COLUMN term.alias       IS '术语别名/缩写/旧称，用逗号分隔，便于搜索，如 "VIP,等级"';
COMMENT ON COLUMN term.pinyin      IS '术语名称的拼音或简拼，可用于按拼音搜索与排序';
COMMENT ON COLUMN term.category_id IS '分类ID，关联 term_category.id，表示该术语所属的大类';
COMMENT ON COLUMN term.short_desc  IS '简要说明，在列表或搜索结果中展示的一两句简介';
COMMENT ON COLUMN term.full_desc   IS '详细解释，包含使用场景、注意事项等完整说明';
COMMENT ON COLUMN term.status      IS '状态：1=启用（正常展示），0=停用（前台不展示）';
COMMENT ON COLUMN term.sort_order  IS '排序值，同分类下数值越小展示越靠前';
COMMENT ON COLUMN term.created_at  IS '创建时间';
COMMENT ON COLUMN term.updated_at  IS '最后一次更新时间';


-- ============================================================
-- 4. 术语关系表 term_relation（可选，但推荐）
--    用于描述术语之间的关联，例如：相关术语、父子关系等
-- ============================================================
CREATE TABLE term_relation (
    id            BIGSERIAL PRIMARY KEY,
    from_term_id  BIGINT NOT NULL REFERENCES term(id), -- 源术语ID
    to_term_id    BIGINT NOT NULL REFERENCES term(id), -- 目标术语ID
    relation_type VARCHAR(32) DEFAULT 'related',       -- 关系类型：related/parent/child 等
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_term_relation UNIQUE (from_term_id, to_term_id, relation_type)
);

COMMENT ON TABLE term_relation IS '名词解释 - 术语关系表，描述术语与术语之间的关联关系';

COMMENT ON COLUMN term_relation.id            IS '主键，自增ID';
COMMENT ON COLUMN term_relation.from_term_id  IS '源术语ID，关联 term.id，表示关系起点';
COMMENT ON COLUMN term_relation.to_term_id    IS '目标术语ID，关联 term.id，表示关系终点';
COMMENT ON COLUMN term_relation.relation_type IS '关系类型，如：related=相关术语, parent=上位概念, child=下位概念';
COMMENT ON COLUMN term_relation.created_at    IS '创建时间';
COMMENT ON COLUMN term_relation.updated_at    IS '最后一次更新时间';
COMMENT ON CONSTRAINT uq_term_relation ON term_relation IS '同一对术语在同一种关系类型下只允许存在一条记录';


-- ============================================================
-- 5. 索引（提高查询性能）
-- ============================================================

-- term 表：名称索引，用于按名称模糊查询或排序
CREATE INDEX idx_term_name
    ON term (name);

-- term 表：别名索引，用于按 alias 模糊查询
CREATE INDEX idx_term_alias
    ON term (alias);

-- term 表：拼音索引，用于按拼音查询或排序
CREATE INDEX idx_term_pinyin
    ON term (pinyin);

-- term 表：分类 + 状态 组合索引，用于分类过滤、只查启用中的术语
CREATE INDEX idx_term_category_status
    ON term (category_id, status);

-- term_relation 表：关系起点索引，用于查某术语的相关术语列表
CREATE INDEX idx_term_relation_from
    ON term_relation (from_term_id);

-- term_relation 表：关系终点索引，反向查关系时使用（可选）
CREATE INDEX idx_term_relation_to
    ON term_relation (to_term_id);
