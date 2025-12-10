# 表结构
```sql
CREATE TABLE prompt_template_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
        -- 主键：版本 ID

  , template_id     UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE
        -- 外键：所属的模板主记录 ID

  , version         VARCHAR(50) NOT NULL
        -- 版本号：可使用 semver，如 '1.0.0', '1.1.0'
        -- 在同一个 template_id 下必须唯一

  , template_text   TEXT NOT NULL
        -- 模板内容：包含占位符的提示词文本，例如：
        -- "你是一位通晓奇门遁甲的大师...\n当前盘面：{{chart_json}}\n问题：{{question}}"

  , config          JSONB
        -- 配置字段：存放与该版本相关的额外配置
        -- 例如：{"max_history_tokens": 4000, "style": "concise"}

  , status          prompt_status NOT NULL DEFAULT 'active'
        -- 版本状态：active / testing / deprecated

  , changelog       TEXT
        -- 版本变更说明：记录本版本相较上一版改动的内容

  , created_by      VARCHAR(100)
        -- 记录创建该版本的用户（账号/姓名），方便审计和责任追踪

  , created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        -- 创建时间
);
```