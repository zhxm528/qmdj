# 表结构
```sql
CREATE TABLE projects (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
        -- 主键：项目 ID，UUID 类型，方便分布式唯一标识
  , code         VARCHAR(50)  NOT NULL UNIQUE
        -- 项目代码：如 'qmdj'，在代码中引用用它，不建议修改
  , name         VARCHAR(100) NOT NULL
        -- 项目名称：如 '奇门遁甲问事助手'，给人看的名字
  , description  TEXT
        -- 项目描述：说明该项目做什么、适用范围等
  , created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        -- 创建时间：记录该项目记录什么时候创建
  , updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        -- 更新时间：记录该项目记录最后一次修改时间
);
```