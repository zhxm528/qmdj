# 表结构
```sql
CREATE TABLE environments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
        -- 主键：环境 ID

  , code        environment_code NOT NULL UNIQUE
        -- 环境代号：'dev', 'staging', 'prod'，枚举类型

  , name        VARCHAR(50) NOT NULL
        -- 环境名称：如 '开发环境', '预发布环境', '生产环境'

  , description TEXT
        -- 描述：该环境的用途说明
);
```