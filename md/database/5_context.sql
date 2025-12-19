-- =========================================================
-- 1. 清理历史定义（DROP IF EXISTS）
-- =========================================================

-- 先删掉有外键依赖的子表，再删父表和类型

DROP TABLE IF EXISTS prompt_flow_steps      CASCADE;
DROP TABLE IF EXISTS prompt_flows           CASCADE;
DROP TABLE IF EXISTS prompt_env_versions    CASCADE;
DROP TABLE IF EXISTS environments           CASCADE;
DROP TABLE IF EXISTS prompt_template_tags   CASCADE;
DROP TABLE IF EXISTS prompt_tags            CASCADE;
DROP TABLE IF EXISTS prompt_template_variables CASCADE;
DROP TABLE IF EXISTS prompt_template_versions CASCADE;
DROP TABLE IF EXISTS prompt_templates       CASCADE;
DROP TABLE IF EXISTS projects               CASCADE;

-- 再删除枚举类型（如果存在）
DROP TYPE IF EXISTS environment_code  CASCADE;
DROP TYPE IF EXISTS variable_type     CASCADE;
DROP TYPE IF EXISTS prompt_status     CASCADE;
DROP TYPE IF EXISTS prompt_role       CASCADE;
DROP TYPE IF EXISTS prompt_scope      CASCADE;

-- =========================================================
-- 2. 准备工作：UUID 扩展 / 枚举类型
-- =========================================================

-- 使用 gen_random_uuid() 生成 UUID 需要该扩展
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 提示词作用范围：全局 / 项目级 / 场景级
CREATE TYPE prompt_scope AS ENUM ('global', 'project', 'scene');

-- 提示词在对话中的角色
CREATE TYPE prompt_role AS ENUM ('system', 'user', 'assistant', 'tool', 'fewshot');

-- 提示词状态：是否还在使用
CREATE TYPE prompt_status AS ENUM ('active', 'testing', 'deprecated');

-- 模板变量类型：简单分类，方便校验
CREATE TYPE variable_type AS ENUM ('string', 'number', 'boolean', 'json', 'datetime');

-- 环境枚举：不同部署环境（可选增强部分用到）
CREATE TYPE environment_code AS ENUM ('dev', 'staging', 'prod');

-- =========================================================
-- 3. 项目表：projects
--    用于区分不同业务项目（例如：奇门遁甲项目 / 其他应用）
-- =========================================================

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

-- 按 code 查询的索引（虽然有 UNIQUE，但单独索引更语义清晰）
CREATE INDEX idx_projects_code ON projects(code);

-- =========================================================
-- 4. 提示词模板主表：prompt_templates
--    表示“一个逻辑上的提示词定义”，不含具体版本内容
-- =========================================================

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

-- 在同一 scope + project + scene + role 下，logical_key 唯一
CREATE UNIQUE INDEX uq_prompt_templates_scope_key
ON prompt_templates(scope, project_id, scene_code, role, logical_key);

-- 项目 + 场景 查询时使用
CREATE INDEX idx_prompt_templates_project_scene
ON prompt_templates(project_id, scene_code);

-- 按状态查询（查看 active / testing / deprecated）
CREATE INDEX idx_prompt_templates_status
ON prompt_templates(status);

-- 在创建版本表后再补充 current_version_id 外键约束
-- （需先创建 prompt_template_versions）

-- =========================================================
-- 5. 提示词版本表：prompt_template_versions
--    每一版本对应一个具体的模板内容和配置
-- =========================================================

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

  , updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        -- 创建时间
);

-- 在同一模板下，版本号唯一
CREATE UNIQUE INDEX uq_prompt_template_versions_template_version
ON prompt_template_versions(template_id, version);

-- 按模板快速查询所有版本
CREATE INDEX idx_prompt_template_versions_template
ON prompt_template_versions(template_id);

-- 补充 prompt_templates.current_version_id 的外键约束
ALTER TABLE prompt_templates
    ADD CONSTRAINT fk_prompt_templates_current_version
    FOREIGN KEY (current_version_id)
    REFERENCES prompt_template_versions(id);

-- =========================================================
-- 6. 模板变量表：prompt_template_variables
--    描述每个版本中有哪些占位符变量、类型和是否必填
-- =========================================================

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

-- 同一版本下变量名唯一
CREATE UNIQUE INDEX uq_prompt_template_variables_version_name
ON prompt_template_variables(version_id, name);

-- 按版本查询变量列表
CREATE INDEX idx_prompt_template_variables_version
ON prompt_template_variables(version_id);

-- =========================================================
-- 7. 标签表：prompt_tags / prompt_template_tags
--    用于给模板打业务标签，方便筛选和统计
-- =========================================================

CREATE TABLE prompt_tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
        -- 主键：标签 ID

  , name        VARCHAR(100) NOT NULL UNIQUE
        -- 标签名：如 'metaphysics', 'qmdj', 'analysis', 'nl2sql'

  , description TEXT
        -- 标签描述：说明该标签的意义和使用范围
);

-- 模板与标签的多对多关系表
CREATE TABLE prompt_template_tags (
    template_id UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE
        -- 外键：提示词模板 ID

  , tag_id      UUID NOT NULL REFERENCES prompt_tags(id) ON DELETE CASCADE
        -- 外键：标签 ID

  , PRIMARY KEY (template_id, tag_id)
        -- 复合主键：一个模板和一个标签只允许出现一次
);

-- 按标签查有哪些模板用到了它
CREATE INDEX idx_prompt_template_tags_tag
ON prompt_template_tags(tag_id);

-- =========================================================
-- 8. 环境与版本映射（可选增强）：environments / prompt_env_versions
--    用于在 dev / staging / prod 中选择不同版本，支持 A/B 测试
-- =========================================================

-- 环境表：dev / staging / prod 等
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

-- 环境与模板版本绑定表：用于指定每个环境下使用哪些版本
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

-- 按环境 + 模板查询所有版本配置（用于路由/分流逻辑）
CREATE INDEX idx_prompt_env_versions_env_template
ON prompt_env_versions(environment_id, template_id);

-- =========================================================
-- 9. Prompt 流程表（可选增强）：prompt_flows / prompt_flow_steps
--    用于定义“多层组合”上下文，例如：
--    全局 system + 项目级 system + 场景级 system + few-shot 示例
-- =========================================================

-- prompt_flows：一个完整的上下文流程定义
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

-- prompt_flow_steps：流程中的具体步骤，每一步关联一个 prompt_template
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

-- 确保同一流程中 step_order 不重复
CREATE UNIQUE INDEX uq_prompt_flow_steps_flow_order
ON prompt_flow_steps(flow_id, step_order);

