# 会员等级管理 (membership_level) 规则文件

本文件用于定义 `membership_level` 表的扩展功能和自定义规则。

## 表信息

- **表名**：`membership_level`
- **表中文名**：会员等级管理
- **面板路径**：`member`
- **菜单路径**：`membership_level`

## 表结构

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

## 字段说明

| 字段名 | 中文名 | 类型 | 必填 | 主键 | 自增 | 默认值 | 说明 |
|--------|--------|------|------|------|------|--------|------|
| level_id | ID | SERIAL | 是 | 是 | 是 | - | 会员等级ID |
| level_code | 等级代码 | VARCHAR(20) | 是 | 否 | 否 | - | 等级代码，唯一，如 SILVER/GOLD/DIAMOND |
| level_name | 等级名称 | VARCHAR(50) | 是 | 否 | 否 | - | 等级名称，如 银卡/金卡/钻石卡 |
| min_points | 最低积分 | INTEGER | 是 | 否 | 否 | 0 | 达到该等级所需的最低积分 |
| max_points | 最高积分 | INTEGER | 否 | 否 | 否 | NULL | 该等级上限积分，顶级可为NULL |
| discount_rate | 折扣率 | NUMERIC(5,2) | 是 | 否 | 否 | 1.00 | 消费折扣，1.00表示不打折 |
| created_at | 创建时间 | TIMESTAMP | 是 | 否 | 否 | NOW() | 创建时间 |
| updated_at | 更新时间 | TIMESTAMP | 是 | 否 | 否 | NOW() | 更新时间 |

## 已生成的文件

1. **前台页面**：`app/admin/member/membership_level/page.tsx`
   - 使用 Ant Design 组件
   - 支持分页（10、100、全部）
   - 支持增删改查操作
   - 等级代码验证（只能包含大写字母和下划线）
   - 积分范围验证（最高积分不能小于最低积分）
   - 折扣率验证（0-1之间）

2. **后台 API**：`app/api/admin/member/membership_level/route.ts`
   - GET：查询会员等级列表（支持分页，按最低积分升序排序）
   - POST：新增会员等级（验证必填字段、唯一性、积分范围、折扣率）
   - PUT：更新会员等级（支持部分字段更新，自动更新 updated_at）
   - DELETE：删除会员等级（检查是否有会员使用该等级）

## 业务规则

1. **等级代码唯一性**：`level_code` 字段必须唯一，只能包含大写字母和下划线
2. **积分范围**：`max_points` 必须大于等于 `min_points`，顶级等级可以为 NULL
3. **折扣率**：必须在 0-1 之间，1.00 表示不打折，0.95 表示 95 折
4. **删除限制**：如果等级正在被会员使用，则无法删除
5. **排序规则**：列表按最低积分升序排序，方便查看等级层次

## 扩展功能建议

1. **等级升级规则**：根据会员积分自动升级等级
2. **等级权益配置**：为每个等级配置不同的权益（如积分倍率、专属优惠等）
3. **等级统计**：统计每个等级的会员数量
4. **批量操作**：支持批量修改等级折扣率
5. **等级历史记录**：记录会员等级变更历史

## 执行规则

当需要修改或扩展功能时，可以在此文件中添加新的规则说明，然后执行相应的操作。

