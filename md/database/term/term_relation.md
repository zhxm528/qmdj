# 表结构
```sql
CREATE TABLE term_relation (
    id            BIGSERIAL PRIMARY KEY,
    from_term_id  BIGINT NOT NULL REFERENCES term(id), -- 源术语ID
    to_term_id    BIGINT NOT NULL REFERENCES term(id), -- 目标术语ID
    relation_type VARCHAR(32) DEFAULT 'related',       -- 关系类型：related/parent/child 等
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_term_relation UNIQUE (from_term_id, to_term_id, relation_type)
);
```