# 表结构
```sql
CREATE TABLE recharge_transaction (
    recharge_id      BIGSERIAL PRIMARY KEY,
    member_id        BIGINT NOT NULL REFERENCES member(member_id) ON DELETE CASCADE,
    card_id          BIGINT REFERENCES member_card(card_id),
    amount           NUMERIC(12,2) NOT NULL,        -- 充值金额
    bonus_points     INTEGER NOT NULL DEFAULT 0,    -- 赠送积分（如有）
    payment_method   VARCHAR(30) NOT NULL,          -- 支付方式: CASH/WECHAT/ALIPAY/CARD...
    status           SMALLINT NOT NULL DEFAULT 1,   -- 1=成功,0=失败,2=待支付,3=已退款等
    external_order_no VARCHAR(100),                 -- 第三方支付单号(可选)
    operator_id      VARCHAR(50),                   -- 操作员/收银员编号
    remark           TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
```