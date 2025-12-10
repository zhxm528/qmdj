# 表结构
```sql
CREATE TABLE prompt_env_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
        -- 主键：环境-版本配置记录 ID

  , environment_id  UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE
        -- 外键：环境 ID

  , template_id     UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE
        -- 外键：提示词模板 ID

  , version_id      UUID NOT NULL REFERENCES prompt_template_versions(id) ON DELETE CASCADE
        -- 外键：指定在该环境下使用的版本 ID

  , enabled         BOOLEAN NOT NULL DEFAULT TRUE
        -- 是否启用：FALSE 表示该配置暂时不用

  , traffic_percent INTEGER NOT NULL DEFAULT 100
        -- 流量权重（0~100）：
        -- 用于 A/B 测试：一个 template 在同一环境下可以有多条记录，
        -- 按不同 traffic_percent 把请求随机分流到不同版本

  , created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        -- 创建时间
);

```