# 消费记录管理 (consumption_transaction) 规则文件

本文件用于定义 `consumption_transaction` 表的扩展功能和自定义规则。

## 表信息

- **表名**：`consumption_transaction`
- **表中文名**：消费记录管理
- **面板路径**：`member`
- **菜单路径**：`consumption_transaction`

## 表结构

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

## 字段说明

| 字段名 | 中文名 | 类型 | 必填 | 主键 | 自增 | 默认值 | 说明 |
|--------|--------|------|------|------|------|--------|------|
| consumption_id | ID | BIGSERIAL | 是 | 是 | 是 | - | 消费记录ID |
| member_id | 会员ID | BIGINT | 是 | 否 | 否 | - | 关联会员ID |
| card_id | 会员卡ID | BIGINT | 否 | 否 | 否 | NULL | 关联会员卡ID（可选） |
| original_amount | 原始金额 | NUMERIC(12,2) | 是 | 否 | 否 | - | 原始消费金额 |
| discount_amount | 优惠金额 | NUMERIC(12,2) | 是 | 否 | 否 | 0.00 | 优惠金额（折扣/满减） |
| payable_amount | 应付金额 | NUMERIC(12,2) | 是 | 否 | 否 | - | 实际应付金额 |
| paid_amount | 实付金额 | NUMERIC(12,2) | 是 | 否 | 否 | - | 实际支付金额 |
| pay_channel | 支付渠道 | VARCHAR(30) | 是 | 否 | 否 | - | BALANCE/CASH/WECHAT/ALIPAY/CARD等 |
| status | 状态 | SMALLINT | 是 | 否 | 否 | 1 | 1=成功,0=作废/撤销 |
| points_used | 使用积分 | INTEGER | 是 | 否 | 否 | 0 | 本次消费使用的积分 |
| points_earned | 获得积分 | INTEGER | 是 | 否 | 否 | 0 | 本次消费获得的积分 |
| external_order_no | 外部订单号 | VARCHAR(100) | 否 | 否 | 否 | NULL | 外部订单号（如收银系统） |
| remark | 备注 | TEXT | 否 | 否 | 否 | NULL | 备注信息 |
| created_at | 创建时间 | TIMESTAMP | 是 | 否 | 否 | NOW() | 创建时间 |

## 已生成的文件

1. **前台页面**：`app/admin/member/consumption_transaction/page.tsx`
   - 使用 Ant Design 组件
   - 支持分页（10、100、全部）
   - 支持增删改查操作
   - 会员选择下拉框（从 member 表加载）
   - 会员卡选择下拉框（从 member_card 表加载）
   - 支付渠道选择（BALANCE/CASH/WECHAT/ALIPAY/CARD）
   - 状态选择（成功/作废/撤销）
   - 金额格式化显示（货币格式）
   - 支付渠道中文显示

2. **后台 API**：`app/api/admin/member/consumption_transaction/route.ts`
   - GET：查询消费记录列表（支持分页，按创建时间降序排序）
   - POST：新增消费记录（验证必填字段、会员存在性、会员卡存在性、金额验证）
   - PUT：更新消费记录（支持部分字段更新）
   - DELETE：删除消费记录

## 业务规则

1. **金额关系**：
   - `payable_amount` = `original_amount` - `discount_amount`
   - `paid_amount` 可能等于或小于 `payable_amount`（如有其他优惠）

2. **支付渠道**：
   - `BALANCE`：余额支付
   - `CASH`：现金支付
   - `WECHAT`：微信支付
   - `ALIPAY`：支付宝支付
   - `CARD`：银行卡支付

3. **状态管理**：
   - `1`：成功（正常消费记录）
   - `0`：作废/撤销（取消的消费记录）

4. **积分处理**：
   - `points_used`：本次消费使用的积分（抵扣金额）
   - `points_earned`：本次消费获得的积分（根据消费金额计算）

5. **外键约束**：
   - `member_id` 必须关联到存在的会员记录
   - `card_id` 可选，如果提供则必须关联到存在的会员卡记录

6. **级联删除**：当会员被删除时，消费记录会自动删除（ON DELETE CASCADE）

## 特殊处理

1. **金额显示**：所有金额字段显示为货币格式（¥符号，保留2位小数）
2. **支付渠道显示**：英文代码转换为中文显示（BALANCE→余额，WECHAT→微信等）
3. **会员和卡号显示**：表格中显示会员姓名/手机号和卡号，而不是ID
4. **数据格式化**：积分显示千分位格式

## 扩展功能建议

1. **消费统计**：按会员、按时间段、按支付渠道统计消费情况
2. **消费分析**：分析消费趋势、热门商品、会员消费习惯等
3. **退款处理**：支持消费记录的退款操作
4. **批量导入**：支持批量导入消费记录
5. **消费报表**：生成消费报表，分析消费数据

## 执行规则

当需要修改或扩展功能时，可以在此文件中添加新的规则说明，然后执行相应的操作。

