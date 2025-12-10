# 表结构
```sql
CREATE TABLE member_account (
    member_id       BIGINT PRIMARY KEY REFERENCES member(member_id) ON DELETE CASCADE,
    balance         NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- 可用余额
    frozen_balance  NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- 冻结余额(如退款中)
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```