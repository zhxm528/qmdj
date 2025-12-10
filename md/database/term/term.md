# 表结构
```sql
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
```