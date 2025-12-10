# 表结构
```sql
CREATE TABLE member_card (
    card_id        BIGSERIAL PRIMARY KEY,
    card_no        VARCHAR(50) NOT NULL UNIQUE,         -- 会员卡号
    member_id      BIGINT NOT NULL REFERENCES member(member_id) ON DELETE CASCADE,
    is_primary     BOOLEAN NOT NULL DEFAULT TRUE,       -- 是否主卡
    status         SMALLINT NOT NULL DEFAULT 1,         -- 1=正常,0=挂失/注销
    issued_at      TIMESTAMP NOT NULL DEFAULT NOW(),    -- 发卡时间
    expired_at     TIMESTAMP,                           -- 过期时间（可选）
    remark         TEXT
);
```