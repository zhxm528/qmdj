# 表结构
```sql
CREATE TABLE member (
    member_id      BIGSERIAL PRIMARY KEY,
    member_code    VARCHAR(50) UNIQUE,         -- 可选，内部会员编码
    full_name      VARCHAR(100),               -- 会员姓名
    mobile         VARCHAR(20),                -- 手机号
    email          VARCHAR(100),
    gender         CHAR(1),                    -- M/F 或其他
    birth_date     DATE,
    status         SMALLINT NOT NULL DEFAULT 1,    -- 1=正常, 0=停用/冻结
    level_id       INTEGER REFERENCES membership_level(level_id),
    total_points   INTEGER NOT NULL DEFAULT 0,     -- 历史累计积分
    available_points INTEGER NOT NULL DEFAULT 0,   -- 当前可用积分
    remark         TEXT,
    registered_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
```