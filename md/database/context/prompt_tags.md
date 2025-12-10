# 表结构
```sql
CREATE TABLE prompt_tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
        -- 主键：标签 ID

  , name        VARCHAR(100) NOT NULL UNIQUE
        -- 标签名：如 'metaphysics', 'qmdj', 'analysis', 'nl2sql'

  , description TEXT
        -- 标签描述：说明该标签的意义和使用范围
);
```