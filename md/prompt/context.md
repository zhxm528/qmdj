# Prompt 上下文管理使用说明（基于数据库表结构）
## 核心功能
修改文件 `/app/api/prompt_context/route.ts`，按照以下规则实现功能。

## 0. 输入约定
调用侧需要准备如下信息：
 - envCode: 当前环境
  - 枚举：'dev' | 'staging' | 'prod'（对应表 environments.code）
 - logicalKey: 逻辑 ID
  - 例："qmdj.master.analyze_chart"
 - scope: 提示词作用范围
  - 'global' | 'project' | 'scene'（对应枚举 prompt_scope）
 - projectCode: 项目代码（可选）
  - 例："qmdj"（对应 projects.code）
 - sceneCode: 场景代码（可选）
  - 例："analyze_chart"
 - role: 在对话中的角色
  - 'system' | 'user' | 'assistant' | 'tool' | 'fewshot'（对应枚举 prompt_role）
 - language: 语言代码（可选，默认 'zh-CN'）
 - variables: 调用方传入的变量对象
  - 如：
```json
{
  "chart_json": "{...}",
  "question": "这次官司能赢吗？",
  "ask_time": "2025-11-19T14:43:50.673Z"
}
```
## 1. 根据 projectCode 获取 project_id
当 scope 为 'project' 或 'scene' 时，需要项目维度。

```sql
SELECT id
FROM projects
WHERE code = :projectCode;
```
## 2. 按 logical_key + scope + project + scene + role 查找模板（prompt_templates）
我们希望精确锁定一个模板记录。规则：
 - scope = 'global'：
  - project_id IS NULL
  - scene_code IS NULL（建议）
 - scope = 'project'：
  - project_id = :projectId
  - scene_code IS NULL
 - scope = 'scene'：
  - project_id = :projectId
  - scene_code = :sceneCode
 - 统一条件：
  - logical_key = :logicalKey
  - role = :role
  - language = :language（可选过滤）

```sql
SELECT *
FROM prompt_templates
WHERE logical_key = :logicalKey
  AND scope       = :scope
  AND role        = :role
  AND language    = COALESCE(:language, language)
  AND (
          (scope = 'global'  AND project_id IS NULL AND scene_code IS NULL)
      OR (scope = 'project' AND project_id = :projectId AND scene_code IS NULL)
      OR (scope = 'scene'   AND project_id = :projectId AND scene_code = :sceneCode)
  )
  AND status <> 'deprecated'
ORDER BY updated_at DESC
LIMIT 1;
```

## 3. 根据环境 envCode 选择版本（prompt_env_versions / prompt_template_versions）
### 3.1 获取 environment_id

```sql
SELECT id
FROM environments
WHERE code = :envCode;
```

```ts
const envRow = await db.oneOrNone(`
  SELECT id FROM environments WHERE code = $1
`, [envCode]);

if (!envRow) throw new Error(`Environment not found: ${envCode}`);
const environmentId = envRow.id;
```

### 3.2 在该环境下查找版本映射（支持 A/B 测试）
 - 表：prompt_env_versions
 - 约定：
  - environment_id = :environmentId
  - template_id = :templateId
  - enabled = TRUE

多行时根据 traffic_percent 做随机分流

```sql
SELECT id, version_id, traffic_percent
FROM prompt_env_versions
WHERE environment_id = :environmentId
  AND template_id    = :templateId
  AND enabled        = TRUE;
```

```ts
const envVersions = await db.manyOrNone(`
  SELECT version_id, traffic_percent
  FROM prompt_env_versions
  WHERE environment_id = $1
    AND template_id    = $2
    AND enabled        = TRUE
`, [environmentId, templateId]);

let versionId: string | null = null;

if (envVersions.length > 0) {
  // 简单加权随机
  const total = envVersions.reduce((s, v) => s + v.traffic_percent, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const v of envVersions) {
    acc += v.traffic_percent;
    if (r <= acc) {
      versionId = v.version_id;
      break;
    }
  }
}
```

### 3.3 如果环境映射为空，回退到模板的 current_version_id

```ts
if (!versionId && template.current_version_id) {
  versionId = template.current_version_id;
}
```

### 3.4 如果依然没有，回退到最新 active 版本

```sql
SELECT id
FROM prompt_template_versions
WHERE template_id = :templateId
  AND status      = 'active'
ORDER BY created_at DESC
LIMIT 1;
```

```ts
if (!versionId) {
  const v = await db.oneOrNone(`
    SELECT id
    FROM prompt_template_versions
    WHERE template_id = $1
      AND status      = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `, [templateId]);

  if (!v) throw new Error(`No active version found for template ${templateId}`);
  versionId = v.id;
}
```

## 4. 获取版本内容（template_text 与 config）
表：prompt_template_versions

```sql
SELECT id, template_text, config, status
FROM prompt_template_versions
WHERE id = :versionId;
```

```ts
const version = await db.one(`
  SELECT id, template_text, config, status
  FROM prompt_template_versions
  WHERE id = $1
`, [versionId]);

const templateText = version.template_text; // 带 {{变量}} 的文本
const config       = version.config || {}; // 可选的版本配置
```
## 5. 从变量表读取定义并校验调用参数
表：prompt_template_variables

### 5.1 拉取该版本的全部变量定义

```sql
SELECT
    name,
    var_type,
    required,
    default_value,
    description
FROM prompt_template_variables
WHERE version_id = :versionId;
```

```ts
const vars = await db.manyOrNone(`
  SELECT name, var_type, required, default_value
  FROM prompt_template_variables
  WHERE version_id = $1
`, [versionId]);

// 转为一个 map，方便后面查
const varSchema = new Map<string, {
  type: 'string' | 'number' | 'boolean' | 'json' | 'datetime',
  required: boolean,
  defaultValue: string | null
}>();

for (const v of vars) {
  varSchema.set(v.name, {
    type: v.var_type,
    required: v.required,
    defaultValue: v.default_value
  });
}
```
### 5.2 校验必填变量 & 补默认值
输入：variables: Record<string, any>（调用方传入）

```ts
function coerceValue(type: string, raw: any) {
  if (raw == null) return raw;

  switch (type) {
    case 'number':
      const num = Number(raw);
      if (Number.isNaN(num)) throw new Error(`Expect number but got ${raw}`);
      return num;

    case 'boolean':
      if (typeof raw === 'boolean') return raw;
      if (raw === 'true' || raw === '1') return true;
      if (raw === 'false' || raw === '0') return false;
      throw new Error(`Expect boolean but got ${raw}`);

    case 'json':
      if (typeof raw === 'object') return raw;
      try { return JSON.parse(String(raw)); }
      catch (e) { throw new Error(`Invalid JSON for variable: ${raw}`); }

    case 'datetime':
      const d = new Date(raw);
      if (isNaN(d.getTime())) throw new Error(`Invalid datetime: ${raw}`);
      return d.toISOString(); // 存成 ISO 字符串

    case 'string':
    default:
      return String(raw);
  }
}

const finalVars: Record<string, any> = {};

for (const [name, spec] of varSchema.entries()) {
  const { type, required, defaultValue } = spec;
  let value = variables[name];

  if (value === undefined || value === null) {
    if (required && defaultValue == null) {
      throw new Error(`Missing required variable: ${name}`);
    }
    // 使用 defaultValue（若有）
    if (defaultValue != null) {
      value = defaultValue;
    }
  }

  if (value != null) {
    value = coerceValue(type, value);
  }

  finalVars[name] = value;
}
```
说明：
- 必填校验：required = TRUE 且没有传入、也没有 default_value，直接抛错。
- 类型转换：依据 var_type 做基础类型检查，保证模板里使用时不会出现明显类型问题。
- finalVars 是最终用于模板渲染的变量表。

## 6. 模板渲染：把 template_text + finalVars → 文本内容
模板格式约定是 {{变量名}}。可以用现成模板引擎：Mustache

## 7. 转换为 OpenAI Chat API 的 messages[] 结构
OpenAI Chat API 的基本结构是：

```ts
type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
};
```
这里只处理“单模板 → 单 message”的情况。复杂多步骤（flow）的情况见后面扩展说明。
### 7.1 从模板 role 映射到 OpenAI 的 role
表 prompt_templates.role 已经是同一套枚举：system / user / assistant / tool / fewshot
 - 若为 'fewshot'：
  - 一般会拆成两条：一条 user、一条 assistant，但这属于进阶用法；
  - 简单版可以先不在这里用 fewshot，而是把 few-shot 示例定义成单独模板并在 flow 里组合。

```ts
function mapRole(promptRole: string): 'system' | 'user' | 'assistant' | 'tool' {
  if (promptRole === 'fewshot') {
    // 简易处理：当成 system 或 user，看你设计
    return 'system';
  }
  return promptRole as any;
}
```
### 7.2 组装 messages[]
最简单的情况：一个模板 + 当前渲染内容 → 一条 message。

```ts
const messages: ChatCompletionMessageParam[] = [];

// 1) 模板产生的提示词 message
messages.push({
  role: mapRole(template.role),
  content: renderedContent
});

// 2) 如需追加历史对话、知识库内容，在此处 append
// 3) 最后追加本次用户输入（如果当前模板不是 user prompt）
```

### 7.3 实际调用 OpenAI SDK

```ts
const completion = await openai.chat.completions.create({
  model: 'gpt-4.1',
  messages
});
```
## 8. 多步骤 Flow 的扩展
使用：
 - prompt_flows
 - prompt_flow_steps
你可以让上述“查模板 + 选版本 + 变量校验 + 渲染”的逻辑变成一个 可复用函数，然后对每个 step 调用一次，依次把结果追加到 messages[]。
大致流程：
 - 1. 根据 flow_code 从 prompt_flows 获取 flow_id
 - 2. 查询 prompt_flow_steps 中该 flow_id 的所有步骤，按 step_order 排序
 - 3. 对每一个 step：
  - 用 step.template_id 代替第 2 节中的“按 logicalKey + scope … 查询”的过程（你已经有 template 了）
  - 根据 step.version_strategy：
   - 'latest'：按第 3 节逻辑（环境映射 → current_version → 最新 active）
   - 'pinned'：直接用 fixed_version_id
  - 从变量表查变量定义并校验（可为每步定义不同变量，或复用全局变量）
  - 渲染模板，得到文本
  - 追加到 messages[]：
```ts
messages.push({
  role: mapRole(stepTemplate.role),
  content: renderedContent
});
```
    最后再追加用户当前提问的 user message。

## 9. 总结：推荐封装成一个「PromptService」
可以把以上逻辑封装成几个内部函数，对外暴露一个高层 API：

```ts
interface RenderPromptParams {
  envCode: 'dev' | 'staging' | 'prod';
  logicalKey: string;
  scope: 'global' | 'project' | 'scene';
  projectCode?: string;
  sceneCode?: string;
  role: 'system' | 'user' | 'assistant' | 'tool' | 'fewshot';
  language?: string;
  variables: Record<string, any>;
}

interface RenderedPrompt {
  templateId: string;
  versionId: string;
  content: string;
  variables: Record<string, any>;
}

class PromptService {
  // 1) 根据 logicalKey + scope + project + scene + role 选模板
  private async resolveTemplate(...) { ... }

  // 2) 根据环境选择版本（含 A/B）
  private async resolveVersion(...) { ... }

  // 3) 拉取变量定义并校验、补默认值
  private async resolveAndValidateVars(...) { ... }

  // 4) 渲染文本
  private renderTemplate(...) { ... }

  // 对外：直接返回 OpenAI messages[]
  async renderToMessages(params: RenderPromptParams): Promise<ChatMessage[]> {
    const template = await this.resolveTemplate(...);
    const version  = await this.resolveVersion(...);
    const vars     = await this.resolveAndValidateVars(...);
    const content  = this.renderTemplate(version.template_text, vars);

    return [{
      role: mapRole(template.role),
      content
    }];
  }
}
```
实现功能可以达到的效果：
 - 换模型 / 换环境 / 做 A/B 测试
 - 新增一个场景（加一个 logical_key + 场景模板 + 版本）
 - 修改提示词细节（新增版本，切换 current_version 或环境映射）
都可以只动数据库配置，而不用改业务代码。