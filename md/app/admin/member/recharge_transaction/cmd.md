# 充值记录管理 (recharge_transaction) 规则文件

本文件用于定义 `recharge_transaction` 表的扩展功能和自定义规则。

## 表信息

- **表名**：`recharge_transaction`
- **表中文名**：充值记录管理
- **面板路径**：`member`
- **菜单路径**：`recharge_transaction`

## 表结构

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

## 字段说明

| 字段名 | 中文名 | 类型 | 必填 | 主键 | 自增 | 默认值 | 说明 |
|--------|--------|------|------|------|------|--------|------|
| recharge_id | ID | BIGSERIAL | 是 | 是 | 是 | - | 充值记录ID |
| member_id | 会员ID | BIGINT | 是 | 否 | 否 | - | 关联会员ID |
| card_id | 会员卡ID | BIGINT | 否 | 否 | 否 | NULL | 关联会员卡ID（可选） |
| amount | 充值金额 | NUMERIC(12,2) | 是 | 否 | 否 | - | 充值金额 |
| bonus_points | 赠送积分 | INTEGER | 是 | 否 | 否 | 0 | 赠送积分（如有） |
| payment_method | 支付方式 | VARCHAR(30) | 是 | 否 | 否 | - | CASH/WECHAT/ALIPAY/CARD/SYSTEM_GIFT等 |
| status | 状态 | SMALLINT | 是 | 否 | 否 | 1 | 1=成功,0=失败,2=待支付,3=已退款等 |
| external_order_no | 外部订单号 | VARCHAR(100) | 否 | 否 | 否 | NULL | 第三方支付单号（可选） |
| operator_id | 操作员 | VARCHAR(50) | 否 | 否 | 否 | NULL | 操作员/收银员编号 |
| remark | 备注 | TEXT | 否 | 否 | 否 | NULL | 备注信息 |
| created_at | 创建时间 | TIMESTAMP | 是 | 否 | 否 | NOW() | 创建时间 |

## 已生成的文件

1. **前台页面**：`app/admin/member/recharge_transaction/page.tsx`
   - 使用 Ant Design 组件
   - 支持分页（10、100、全部）
   - 支持增删改查操作
   - 会员选择下拉框（从 member 表加载）
   - 会员卡选择下拉框（从 member_card 表加载）
   - 支付方式选择（CASH/WECHAT/ALIPAY/CARD/SYSTEM_GIFT）
   - 状态选择（成功/失败/待支付/已退款）
   - 金额格式化显示（货币格式）
   - 支付方式和状态中文显示

2. **后台 API**：`app/api/admin/member/recharge_transaction/route.ts`
   - GET：查询充值记录列表（支持分页，按创建时间降序排序）
   - POST：新增充值记录（验证必填字段、会员存在性、会员卡存在性、金额验证）
   - PUT：更新充值记录（支持部分字段更新）
   - DELETE：删除充值记录

## 业务规则

1. **支付方式**：
   - `CASH`：现金支付
   - `WECHAT`：微信支付
   - `ALIPAY`：支付宝支付
   - `CARD`：银行卡支付
   - `SYSTEM_GIFT`：系统赠送

2. **状态管理**：
   - `1`：成功（充值成功）
   - `0`：失败（充值失败）
   - `2`：待支付（等待支付）
   - `3`：已退款（已退款）

3. **充值金额**：必须大于 0

4. **赠送积分**：不能小于 0

5. **外键约束**：
   - `member_id` 必须关联到存在的会员记录
   - `card_id` 可选，如果提供则必须关联到存在的会员卡记录

6. **级联删除**：当会员被删除时，充值记录会自动删除（ON DELETE CASCADE）

## 特殊处理

1. **金额显示**：充值金额显示为货币格式（¥符号，保留2位小数）
2. **支付方式显示**：英文代码转换为中文显示（CASH→现金，WECHAT→微信等）
3. **状态显示**：数字状态转换为中文显示（1→成功，0→失败等）
4. **会员和卡号显示**：表格中显示会员姓名/手机号和卡号，而不是ID
5. **数据格式化**：积分显示千分位格式

## 扩展功能建议

1. **充值统计**：按会员、按时间段、按支付方式统计充值情况
2. **充值分析**：分析充值趋势、充值金额分布等
3. **退款处理**：支持充值记录的退款操作
4. **批量导入**：支持批量导入充值记录
5. **充值报表**：生成充值报表，分析充值数据
6. **充值活动**：支持充值送积分、充值送余额等营销活动

## 执行规则

当需要修改或扩展功能时，可以在此文件中添加新的规则说明，然后执行相应的操作。

