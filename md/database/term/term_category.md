# 表结构
```sql
CREATE TABLE term_category (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(128) NOT NULL,           -- 分类名称：如“会员体系”
    code        VARCHAR(64)  NOT NULL UNIQUE,    -- 分类编码：如 member, payment
    description VARCHAR(512),                    -- 分类说明
    sort_order  INT DEFAULT 100,                 -- 排序值，越小越靠前
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```