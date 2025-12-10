# 表结构
```sql
CREATE TABLE points_transaction (
    points_txn_id    BIGSERIAL PRIMARY KEY,
    member_id        BIGINT NOT NULL REFERENCES member(member_id) ON DELETE CASCADE,
    card_id          BIGINT REFERENCES member_card(card_id),
    change_type      VARCHAR(30) NOT NULL,    -- EARN / REDEEM / ADJUST / EXPIRE 等
    change_points    INTEGER NOT NULL,        -- 正数：增加；负数：减少
    balance_after    INTEGER NOT NULL,        -- 变动后会员可用积分
    related_type     VARCHAR(30),            -- 关联类型: RECHARGE / CONSUMPTION / MANUAL 等
    related_id       BIGINT,                 -- 关联记录id（例如消费记录id）
    remark           TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
```