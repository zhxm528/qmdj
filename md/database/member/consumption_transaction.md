# 表结构
```sql
CREATE TABLE consumption_transaction (
    consumption_id    BIGSERIAL PRIMARY KEY,
    member_id         BIGINT NOT NULL REFERENCES member(member_id) ON DELETE CASCADE,
    card_id           BIGINT REFERENCES member_card(card_id),
    original_amount   NUMERIC(12,2) NOT NULL,        -- 原始消费金额
    discount_amount   NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- 优惠金额（折扣/满减）
    payable_amount    NUMERIC(12,2) NOT NULL,        -- 实际应付金额
    paid_amount       NUMERIC(12,2) NOT NULL,        -- 实际支付金额（可能含现金+余额）
    pay_channel       VARCHAR(30) NOT NULL,          -- 支付渠道: BALANCE/CASH/WECHAT...
    status            SMALLINT NOT NULL DEFAULT 1,   -- 1=成功,0=作废/撤销
    points_used       INTEGER NOT NULL DEFAULT 0,    -- 本次消费使用积分
    points_earned     INTEGER NOT NULL DEFAULT 0,    -- 本次消费获得积分
    external_order_no VARCHAR(100),                  -- 外部订单号(如收银系统)
    remark            TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
```