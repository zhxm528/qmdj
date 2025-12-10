# 会员账户管理 (member_account) 规则文件

本文件用于定义 `member_account` 表的扩展功能和自定义规则。

## 表信息

- **表名**：`member_account`
- **表中文名**：会员账户管理
- **面板路径**：`member`
- **菜单路径**：`member_account`

## 表结构

```sql
CREATE TABLE member_account (
    member_id       BIGINT PRIMARY KEY REFERENCES member(member_id) ON DELETE CASCADE,
    balance         NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- 可用余额
    frozen_balance  NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- 冻结余额(如退款中)
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 字段说明

| 字段名 | 中文名 | 类型 | 必填 | 主键 | 自增 | 默认值 | 说明 |
|--------|--------|------|------|------|------|--------|------|
| member_id | 会员ID | BIGINT | 是 | 是 | 否 | - | 会员ID，主键，关联到 member 表 |
| balance | 可用余额 | NUMERIC(12,2) | 是 | 否 | 否 | 0.00 | 会员可以使用的储值余额 |
| frozen_balance | 冻结余额 | NUMERIC(12,2) | 是 | 否 | 否 | 0.00 | 冻结的余额（如退款中、待审核等） |
| updated_at | 更新时间 | TIMESTAMP | 是 | 否 | 否 | NOW() | 更新时间 |

## 已生成的文件

1. **前台页面**：`app/admin/member/member_account/page.tsx`
   - 使用 Ant Design 组件
   - 支持分页（10、100、全部）
   - 支持增删改查操作
   - 会员选择（从 member 表加载）
   - 显示总余额（可用余额 + 冻结余额）
   - 余额格式化显示（货币格式）

2. **后台 API**：`app/api/admin/member/member_account/route.ts`
   - GET：查询会员账户列表（支持分页，按更新时间降序排序）
   - POST：初始化会员账户（检查会员是否存在、账户是否已存在）
   - PUT：更新会员账户（支持部分字段更新，自动更新 updated_at）
   - DELETE：删除会员账户（检查账户余额，有余额时不允许删除）

## 业务规则

1. **一对一关系**：每个会员只有一条账户记录（member_id 是主键）
2. **余额验证**：可用余额和冻结余额都不能小于 0
3. **删除保护**：删除账户前检查是否有余额，有余额时不允许删除
4. **外键约束**：member_id 必须关联到存在的会员记录
5. **级联删除**：当会员被删除时，账户记录会自动删除（ON DELETE CASCADE）

## 特殊处理

1. **初始化账户**：新增操作实际上是"初始化账户"，需要指定会员ID
2. **账户唯一性**：每个会员只能有一个账户，初始化时会检查是否已存在
3. **余额显示**：表格中显示总余额（可用余额 + 冻结余额）
4. **货币格式**：余额显示为货币格式（¥符号，保留2位小数）

## 扩展功能建议

1. **余额变动记录**：关联 `recharge_transaction` 和 `consumption_transaction` 表，查看余额变动历史
2. **余额冻结/解冻**：提供批量冻结/解冻余额的功能
3. **余额统计**：统计总余额、可用余额、冻结余额的汇总数据
4. **余额预警**：设置余额预警阈值，余额低于阈值时提醒
5. **批量操作**：支持批量初始化账户、批量调整余额

## 执行规则

当需要修改或扩展功能时，可以在此文件中添加新的规则说明，然后执行相应的操作。

