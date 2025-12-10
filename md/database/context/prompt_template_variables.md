# 表结构
```sql
CREATE TABLE prompt_template_variables (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
        -- 主键：变量记录 ID

  , version_id       UUID NOT NULL REFERENCES prompt_template_versions(id) ON DELETE CASCADE
        -- 外键：所在的模板版本 ID

  , name             VARCHAR(100) NOT NULL
        -- 变量名称：对应模板中的占位符名，如 'chart_json', 'question'

  , var_type         variable_type NOT NULL DEFAULT 'string'
        -- 变量类型：string / number / boolean / json / datetime
        -- 便于在应用层做类型校验和转换

  , required         BOOLEAN NOT NULL DEFAULT TRUE
        -- 是否必填：
        -- TRUE：调用方必须提供该变量
        -- FALSE：可选变量，可用 default_value 或空值

  , default_value    TEXT
        -- 默认值（字符串形式存储）：
        -- 当 required=FALSE 且调用方未提供该变量时，可以使用此默认值

  , description      TEXT
        -- 描述：说明该变量的含义和用法，例如：
        -- "奇门遁甲盘面 JSON，使用约定格式"
        -- "用户的原始问题文本" 等

  , created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
        -- 创建时间
);

```