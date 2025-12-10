# 积分变动记录管理 (points_transaction) 规则文件

本文件用于定义 `points_transaction` 表的扩展功能和自定义规则。

## 表信息

- **表名**：`points_transaction`
- **表中文名**：积分变动记录管理
- **面板路径**：`member`
- **菜单路径**：`points_transaction`

## 表结构

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

## 字段说明

| 字段名 | 中文名 | 类型 | 必填 | 主键 | 自增 | 默认值 | 说明 |
|--------|--------|------|------|------|------|--------|------|
| points_txn_id | ID | BIGSERIAL | 是 | 是 | 是 | - | 积分变动记录ID |
| member_id | 会员ID | BIGINT | 是 | 否 | 否 | - | 关联会员ID |
| card_id | 会员卡ID | BIGINT | 否 | 否 | 否 | NULL | 关联会员卡ID（可选） |
| change_type | 变动类型 | VARCHAR(30) | 是 | 否 | 否 | - | EARN/REDEEM/ADJUST/EXPIRE等 |
| change_points | 变动积分 | INTEGER | 是 | 否 | 否 | - | 正数：增加；负数：减少 |
| balance_after | 变动后余额 | INTEGER | 是 | 否 | 否 | - | 变动后会员可用积分 |
| related_type | 关联类型 | VARCHAR(30) | 否 | 否 | 否 | NULL | RECHARGE/CONSUMPTION/MANUAL等 |
| related_id | 关联ID | BIGINT | 否 | 否 | 否 | NULL | 关联记录ID（如消费记录ID） |
| remark | 备注 | TEXT | 否 | 否 | 否 | NULL | 备注信息 |
| created_at | 创建时间 | TIMESTAMP | 是 | 否 | 否 | NOW() | 创建时间 |

## 已生成的文件

1. **前台页面**：`app/admin/member/points_transaction/page.tsx`
   - 使用 Ant Design 组件
   - 支持分页（10、100、全部）
   - 支持增删改查操作
   - 会员选择下拉框（从 member 表加载）
   - 会员卡选择下拉框（从 member_card 表加载）
   - 变动类型选择（EARN/REDEEM/ADJUST/EXPIRE）
   - 变动积分颜色区分（正数绿色，负数红色）
   - 变动类型中文显示

2. **后台 API**：`app/api/admin/member/points_transaction/route.ts`
   - GET：查询积分变动记录列表（支持分页，按创建时间降序排序）
   - POST：新增积分变动记录（验证必填字段、会员存在性、会员卡存在性）
   - PUT：更新积分变动记录（支持部分字段更新）
   - DELETE：删除积分变动记录

## 业务规则

1. **变动类型**：
   - `EARN`：获得积分（如消费获得、注册赠送等）
   - `REDEEM`：兑换积分（如使用积分兑换商品）
   - `ADJUST`：调整积分（管理员手动调整）
   - `EXPIRE`：积分过期

2. **变动积分**：
   - 正数表示增加积分
   - 负数表示减少积分

3. **变动后余额**：必须大于等于 0

4. **关联类型**：
   - `RECHARGE`：关联充值记录
   - `CONSUMPTION`：关联消费记录
   - `MANUAL`：手动操作
   - `REGISTER`：注册赠送

5. **外键约束**：
   - `member_id` 必须关联到存在的会员记录
   - `card_id` 可选，如果提供则必须关联到存在的会员卡记录

6. **级联删除**：当会员被删除时，积分变动记录会自动删除（ON DELETE CASCADE）

## 特殊处理

1. **变动积分显示**：正数显示为绿色，负数显示为红色，带正负号
2. **变动类型显示**：英文代码转换为中文显示（EARN→获得，REDEEM→兑换等）
3. **会员和卡号显示**：表格中显示会员姓名/手机号和卡号，而不是ID
4. **数据格式化**：积分显示千分位格式

## 扩展功能建议

1. **积分统计**：按会员、按时间段统计积分变动情况
2. **积分对账**：验证积分变动记录与会员积分余额的一致性
3. **批量导入**：支持批量导入积分变动记录
4. **积分查询**：支持按会员、按变动类型、按时间段查询
5. **积分报表**：生成积分变动报表，分析积分使用情况

## 执行规则

当需要修改或扩展功能时，可以在此文件中添加新的规则说明，然后执行相应的操作。

