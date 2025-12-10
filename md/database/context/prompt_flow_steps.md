# 表结构
```sql
CREATE TABLE prompt_flow_steps (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
        -- 主键：流程步骤 ID

  , flow_id      UUID NOT NULL REFERENCES prompt_flows(id) ON DELETE CASCADE
        -- 外键：所属流程 ID

  , step_order   INTEGER NOT NULL
        -- 步骤顺序：从 1 开始，按数值大小排序执行

  , template_id  UUID NOT NULL REFERENCES prompt_templates(id)
        -- 外键：本步骤引用的提示词模板 ID

  , version_strategy VARCHAR(20) NOT NULL DEFAULT 'latest'
        -- 版本策略：
        -- 'latest'：使用模板的 current_version_id 或环境映射最新版本
        -- 'pinned'：使用 fixed_version_id 指定的固定版本

  , fixed_version_id UUID REFERENCES prompt_template_versions(id)
        -- 固定版本 ID：当 version_strategy='pinned' 时使用该指定版本

  , optional     BOOLEAN NOT NULL DEFAULT FALSE
        -- 是否可选步骤：
        -- TRUE：在某些业务逻辑下可以选择跳过本步骤

  , created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        -- 创建时间
);
```