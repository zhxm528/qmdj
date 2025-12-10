# 表结构
```sql
CREATE TABLE membership_level (
    level_id       SERIAL PRIMARY KEY,
    level_code     VARCHAR(20) NOT NULL UNIQUE,   -- 如: SILVER / GOLD / DIAMOND
    level_name     VARCHAR(50) NOT NULL,          -- 如: 银卡 / 金卡 / 钻石卡
    min_points     INTEGER NOT NULL DEFAULT 0,    -- 达到该等级所需的最低积分
    max_points     INTEGER,                       -- 该等级上限积分(可选, 顶级可为NULL)
    discount_rate  NUMERIC(5,2) NOT NULL DEFAULT 1.00, -- 消费折扣, 1.00表示不打折
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
```