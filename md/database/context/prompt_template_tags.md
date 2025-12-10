# 表结构
```sql
CREATE TABLE prompt_template_tags (
    template_id UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE
        -- 外键：提示词模板 ID

  , tag_id      UUID NOT NULL REFERENCES prompt_tags(id) ON DELETE CASCADE
        -- 外键：标签 ID

  , PRIMARY KEY (template_id, tag_id)
        -- 复合主键：一个模板和一个标签只允许出现一次
);
```