# 表结构
```sql
CREATE TABLE prompt_flows (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
        -- 主键：流程 ID

  , project_id  UUID REFERENCES projects(id)
        -- 外键：所属项目 ID，可为空（全局流程）

  , code        VARCHAR(100) NOT NULL
        -- 流程代码：如 'qmdj.analyze_chart_flow'，在代码中用此 ID 访问

  , name        VARCHAR(200) NOT NULL
        -- 流程名称：如 '奇门遁甲看盘完整上下文'

  , description TEXT
        -- 描述：说明该流程包含哪些步骤、适用场景等

  , created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        -- 创建时间
);
```