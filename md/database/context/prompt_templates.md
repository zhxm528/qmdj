# 表结构
```sql
CREATE TABLE prompt_templates (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
        -- 主键：提示词模板 ID

  , logical_key       VARCHAR(200) NOT NULL
        -- 逻辑 ID：程序调用用的标识，如 'qmdj.master.analyze_chart'
        -- 同一 scope + project + scene + role 下应唯一

  , scope             prompt_scope NOT NULL
        -- 提示词的作用范围：
        -- 'global': 全局通用提示词
        -- 'project': 某个项目通用提示词
        -- 'scene': 某个具体场景使用的提示词（如“看盘”、“分类问题”等）

  , project_id        UUID REFERENCES projects(id)
        -- 所属项目 ID：
        -- scope='global' 时可为 NULL；
        -- scope='project' 或 'scene' 时通常指向某个项目

  , scene_code        VARCHAR(100)
        -- 场景代码：例如 'analyze_chart', 'classify_question'
        -- 用于在一个项目内进一步按业务场景拆分

  , role              prompt_role NOT NULL
        -- 提示词在对话中的角色：
        -- 'system': 系统角色设定
        -- 'user': 代表用户指令的模板
        -- 'assistant': 代表示例回答 / few-shot 的回答部分
        -- 'tool': 工具调用相关提示
        -- 'fewshot': few-shot 示例提示（可选）

  , language          VARCHAR(20)  NOT NULL DEFAULT 'zh-CN'
        -- 语言标识：如 'zh-CN', 'en-US' 等
        -- 方便你按语言管理多套提示词

  , description       TEXT
        -- 描述：说明该提示词主要用途，例如“奇门遁甲大师角色设定”

  , current_version_id UUID
        -- 当前默认使用的版本 ID：
        -- 指向 prompt_template_versions.id
        -- 便于快速获取当前“线上版本”

  , status            prompt_status NOT NULL DEFAULT 'active'
        -- 状态：
        -- 'active': 正在使用
        -- 'testing': 测试中
        -- 'deprecated': 已弃用，不建议再使用

  , task_type         VARCHAR(50)
        -- 任务类型：用于业务分类，如 'analysis', 'classification', 'generation' 等

  , sensitivity       VARCHAR(50)
        -- 敏感等级：如 'low', 'normal', 'high'，可用于权限控制或审计需求

  , metadata          JSONB
        -- 扩展元数据：如 { "owner": "qmdj-team", "notes": "仅用于问事，不负责起盘" }

  , created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
        -- 创建时间

  , updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
        -- 更新时间
);
```