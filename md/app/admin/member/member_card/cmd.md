# 会员卡管理 (member_card) 规则文件

本文件用于定义 `member_card` 表的扩展功能和自定义规则。

## 表信息

- **表名**：`member_card`
- **表中文名**：会员卡管理
- **面板路径**：`member`
- **菜单路径**：`member_card`

## 表结构

```sql
CREATE TABLE member_card (
    card_id        BIGSERIAL PRIMARY KEY,
    card_no        VARCHAR(50) NOT NULL UNIQUE,         -- 会员卡号
    member_id      BIGINT NOT NULL REFERENCES member(member_id) ON DELETE CASCADE,
    is_primary     BOOLEAN NOT NULL DEFAULT TRUE,       -- 是否主卡
    status         SMALLINT NOT NULL DEFAULT 1,         -- 1=正常,0=挂失/注销
    issued_at      TIMESTAMP NOT NULL DEFAULT NOW(),    -- 发卡时间
    expired_at     TIMESTAMP,                           -- 过期时间（可选）
    remark         TEXT
);
```

## 字段说明

| 字段名 | 中文名 | 类型 | 必填 | 主键 | 自增 | 默认值 | 说明 |
|--------|--------|------|------|------|------|--------|------|
| card_id | ID | BIGSERIAL | 是 | 是 | 是 | - | 会员卡ID |
| card_no | 会员卡号 | VARCHAR(50) | 是 | 否 | 否 | - | 会员卡号，唯一 |
| member_id | 会员ID | BIGINT | 是 | 否 | 否 | - | 关联会员ID |
| is_primary | 是否主卡 | BOOLEAN | 是 | 否 | 否 | TRUE | 是否主卡 |
| status | 状态 | SMALLINT | 是 | 否 | 否 | 1 | 1=正常,0=挂失/注销 |
| issued_at | 发卡时间 | TIMESTAMP | 是 | 否 | 否 | NOW() | 发卡时间 |
| expired_at | 过期时间 | TIMESTAMP | 否 | 否 | 否 | NULL | 过期时间（可选） |
| remark | 备注 | TEXT | 否 | 否 | 否 | NULL | 备注信息 |

## 已生成的文件

1. **前台页面**：`app/admin/member/member_card/page.tsx`
   - 使用 Ant Design 组件
   - 支持分页（10、100、全部）
   - 支持增删改查操作
   - 会员选择下拉框（从 member 表加载）

2. **后台 API**：`app/api/admin/member/member_card/route.ts`
   - GET：查询会员卡列表（支持分页）
   - POST：新增会员卡
   - PUT：更新会员卡
   - DELETE：删除会员卡

## 业务规则

1. **会员卡号唯一性**：`card_no` 字段必须唯一，系统会自动检查
2. **会员关联**：`member_id` 必须关联到存在的会员记录
3. **主卡标识**：`is_primary` 用于标识是否为会员的主卡
4. **状态管理**：状态为 0 时表示挂失或注销
5. **过期时间**：可选字段，用于设置会员卡的过期时间

## 扩展功能建议

1. **批量操作**：支持批量挂失、批量注销
2. **卡号生成规则**：自动生成会员卡号（如：根据会员ID生成）
3. **过期提醒**：查询即将过期的会员卡
4. **主卡切换**：当设置新卡为主卡时，自动将原主卡设为非主卡
5. **关联查询**：在列表中显示会员姓名、手机号等信息

## 执行规则

当需要修改或扩展功能时，可以在此文件中添加新的规则说明，然后执行相应的操作。

