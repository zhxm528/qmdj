import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// 类型定义
type EnvCode = 'dev' | 'staging' | 'prod';
type Scope = 'global' | 'project' | 'scene';
type PromptRole = 'system' | 'user' | 'assistant' | 'tool' | 'fewshot';
type VarType = 'string' | 'number' | 'boolean' | 'json' | 'datetime';

interface RenderPromptParams {
  envCode: EnvCode;
  logicalKey: string;
  scope: Scope;
  projectCode?: string;
  sceneCode?: string;
  role: PromptRole;
  language?: string;
  variables: Record<string, any>;
}

interface RenderFlowParams {
  envCode: EnvCode;
  projectCode: string;
  flow: string; // 流程代码
  variables: Record<string, any>;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

interface Template {
  id: string;
  logical_key: string;
  scope: Scope;
  project_id: string | null;
  scene_code: string | null;
  role: PromptRole;
  language: string;
  current_version_id: string | null;
  status: string;
}

interface TemplateVersion {
  id: string;
  template_text: string;
  config: any;
  status: string;
}

interface EnvVersion {
  version_id: string;
  traffic_percent: number;
}

interface Variable {
  name: string;
  var_type: VarType;
  required: boolean;
  default_value: string | null;
}

// 简单的模板渲染函数（支持 {{变量名}} 格式）
function renderTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined || value === null) {
      return match; // 如果变量不存在，保留原样
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  });
}

// 类型转换函数
function coerceValue(type: VarType, raw: any): any {
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
      try {
        return JSON.parse(String(raw));
      } catch (e) {
        throw new Error(`Invalid JSON for variable: ${raw}`);
      }

    case 'datetime':
      const d = new Date(raw);
      if (isNaN(d.getTime())) throw new Error(`Invalid datetime: ${raw}`);
      return d.toISOString();

    case 'string':
    default:
      return String(raw);
  }
}

// Role 映射函数
function mapRole(promptRole: PromptRole): 'system' | 'user' | 'assistant' | 'tool' {
  if (promptRole === 'fewshot') {
    return 'system';
  }
  return promptRole as 'system' | 'user' | 'assistant' | 'tool';
}

export class PromptService {
  // 1. 根据 projectCode 获取 project_id
  private async getProjectId(projectCode: string): Promise<string | null> {
    const rows = await query<{ id: string }>(
      `SELECT id FROM projects WHERE code = $1`,
      [projectCode]
    );
    return rows.length > 0 ? rows[0].id : null;
  }

  // 2. 根据 logicalKey + scope + project + scene + role 查找模板
  private async resolveTemplate(
    logicalKey: string,
    scope: Scope,
    projectId: string | null,
    sceneCode: string | null,
    role: PromptRole,
    language: string | null
  ): Promise<Template> {
    let sql = `
      SELECT *
      FROM prompt_templates
      WHERE logical_key = $1
        AND scope = $2
        AND role = $3
        AND status <> 'deprecated'
    `;
    const params: any[] = [logicalKey, scope, role];

    // 添加 language 条件
    if (language) {
      sql += ` AND language = COALESCE($${params.length + 1}, language)`;
      params.push(language);
    }

    // 添加 scope 相关的条件
    if (scope === 'global') {
      sql += ` AND project_id IS NULL AND scene_code IS NULL`;
    } else if (scope === 'project') {
      sql += ` AND project_id = $${params.length + 1} AND scene_code IS NULL`;
      params.push(projectId);
    } else if (scope === 'scene') {
      sql += ` AND project_id = $${params.length + 1} AND scene_code = $${params.length + 2}`;
      params.push(projectId, sceneCode);
    }

    sql += ` ORDER BY updated_at DESC LIMIT 1`;

    const rows = await query<Template>(sql, params);
    if (rows.length === 0) {
      throw new Error(`Template not found: logicalKey=${logicalKey}, scope=${scope}, role=${role}`);
    }
    return rows[0];
  }

  // 3.1 获取 environment_id
  private async getEnvironmentId(envCode: EnvCode): Promise<string> {
    const rows = await query<{ id: string }>(
      `SELECT id FROM environments WHERE code = $1`,
      [envCode]
    );
    if (rows.length === 0) {
      throw new Error(`Environment not found: ${envCode}`);
    }
    return rows[0].id;
  }

  // 3.2-3.4 根据环境选择版本（支持 A/B 测试）
  private async resolveVersion(
    environmentId: string,
    template: Template
  ): Promise<string> {
    let versionId: string | null = null;

    // 3.2 在该环境下查找版本映射（支持 A/B 测试）
    const envVersions = await query<EnvVersion>(
      `SELECT version_id, traffic_percent
       FROM prompt_env_versions
       WHERE environment_id = $1
         AND template_id = $2
         AND enabled = TRUE`,
      [environmentId, template.id]
    );

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

    // 3.3 如果环境映射为空，回退到模板的 current_version_id
    if (!versionId && template.current_version_id) {
      versionId = template.current_version_id;
    }

    // 3.4 如果依然没有，回退到最新 active 版本
    if (!versionId) {
      const rows = await query<{ id: string }>(
        `SELECT id
         FROM prompt_template_versions
         WHERE template_id = $1
           AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`,
        [template.id]
      );
      if (rows.length === 0) {
        throw new Error(`No active version found for template ${template.id}`);
      }
      versionId = rows[0].id;
    }

    return versionId;
  }

  // 4. 获取版本内容
  private async getVersion(versionId: string): Promise<TemplateVersion> {
    const rows = await query<TemplateVersion>(
      `SELECT id, template_text, config, status
       FROM prompt_template_versions
       WHERE id = $1`,
      [versionId]
    );
    if (rows.length === 0) {
      throw new Error(`Version not found: ${versionId}`);
    }
    return rows[0];
  }

  // 5. 拉取变量定义并校验
  private async resolveAndValidateVars(
    versionId: string,
    variables: Record<string, any>
  ): Promise<Record<string, any>> {
    // 5.1 拉取该版本的全部变量定义
    const vars = await query<Variable>(
      `SELECT name, var_type, required, default_value
       FROM prompt_template_variables
       WHERE version_id = $1`,
      [versionId]
    );

    // 转为 map
    const varSchema = new Map<string, {
      type: VarType;
      required: boolean;
      defaultValue: string | null;
    }>();

    for (const v of vars) {
      varSchema.set(v.name, {
        type: v.var_type,
        required: v.required,
        defaultValue: v.default_value
      });
    }

    // 5.2 校验必填变量 & 补默认值
    const finalVars: Record<string, any> = {};

    Array.from(varSchema.entries()).forEach(([name, spec]) => {
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
    });

    return finalVars;
  }

  // 根据流程生成 messages[]
  async renderFlowToMessages(params: RenderFlowParams): Promise<ChatMessage[]> {
    // 1. 获取 project_id
    const projectId = await this.getProjectId(params.projectCode);
    if (!projectId) {
      throw new Error(`Project not found: ${params.projectCode}`);
    }

    // 2. 根据项目ID和流程代码获取流程
    const flows = await query<{ id: string; code: string; name: string; project_id: string | null }>(
      `SELECT id, code, name, project_id FROM prompt_flows WHERE code = $1 AND project_id = $2`,
      [params.flow, projectId]
    );

    if (flows.length === 0) {
      throw new Error(`Flow not found: projectCode=${params.projectCode}, flow=${params.flow}`);
    }

    const flow = flows[0];

    // 3. 获取 environment_id
    const environmentId = await this.getEnvironmentId(params.envCode);

    // 4. 获取流程下的所有步骤（按 step_order 排序）
    const steps = await query<{
      id: string;
      flow_id: string;
      step_order: number;
      template_id: string;
      version_strategy: string;
      fixed_version_id: string | null;
      optional: boolean;
    }>(
      `SELECT id, flow_id, step_order, template_id, version_strategy, fixed_version_id, optional
       FROM prompt_flow_steps
       WHERE flow_id = $1
       ORDER BY step_order ASC`,
      [flow.id]
    );

    if (steps.length === 0) {
      throw new Error(`No steps found for flow: ${flow.code}`);
    }

    // 5. 为每个步骤生成 message
    const messages: ChatMessage[] = [];

    for (const step of steps) {
      // 5.1 获取模板信息（包含 role）
      const templates = await query<{
        id: string;
        logical_key: string;
        scope: Scope;
        role: PromptRole;
        current_version_id: string | null;
      }>(
        `SELECT id, logical_key, scope, role, current_version_id
         FROM prompt_templates
         WHERE id = $1 AND status <> 'deprecated'`,
        [step.template_id]
      );

      if (templates.length === 0) {
        console.warn(`Template not found for step ${step.id}, skipping`);
        continue;
      }

      const template = templates[0];

      // 5.2 根据版本策略获取模板版本
      let versionId: string | null = null;

      if (step.version_strategy === 'pinned' && step.fixed_version_id) {
        // 使用固定版本
        versionId = step.fixed_version_id;
      } else {
        // 使用 latest 策略：先查环境映射，再查 current_version_id，最后查最新 active 版本
        const envVersions = await query<{ version_id: string; traffic_percent: number }>(
          `SELECT version_id, traffic_percent
           FROM prompt_env_versions
           WHERE environment_id = $1
             AND template_id = $2
             AND enabled = TRUE`,
          [environmentId, template.id]
        );

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

        // 如果环境映射为空，回退到模板的 current_version_id
        if (!versionId && template.current_version_id) {
          versionId = template.current_version_id;
        }

        // 如果依然没有，回退到最新 active 版本
        if (!versionId) {
          const latestVersions = await query<{ id: string }>(
            `SELECT id
             FROM prompt_template_versions
             WHERE template_id = $1
               AND status = 'active'
             ORDER BY created_at DESC
             LIMIT 1`,
            [template.id]
          );
          if (latestVersions.length > 0) {
            versionId = latestVersions[0].id;
          }
        }
      }

      if (!versionId) {
        console.warn(`No version found for template ${template.id} in step ${step.id}, skipping`);
        continue;
      }

      // 5.3 获取模板版本内容
      const version = await this.getVersion(versionId);

      // 5.4 拉取变量定义并校验
      const finalVars = await this.resolveAndValidateVars(versionId, params.variables);

      // 5.5 渲染模板
      const content = renderTemplate(version.template_text, finalVars);

      // 5.6 转换为 OpenAI messages[] 结构
      messages.push({
        role: mapRole(template.role),
        content
      });
    }

    return messages;
  }

  // 对外：直接返回 OpenAI messages[]
  async renderToMessages(params: RenderPromptParams): Promise<ChatMessage[]> {
    // 1. 获取 project_id（如果需要）
    let projectId: string | null = null;
    if (params.scope === 'project' || params.scope === 'scene') {
      if (!params.projectCode) {
        throw new Error(`projectCode is required for scope: ${params.scope}`);
      }
      projectId = await this.getProjectId(params.projectCode);
      if (!projectId) {
        throw new Error(`Project not found: ${params.projectCode}`);
      }
    }

    // 2. 查找模板
    const template = await this.resolveTemplate(
      params.logicalKey,
      params.scope,
      projectId,
      params.sceneCode || null,
      params.role,
      params.language || null
    );

    // 3. 获取 environment_id
    const environmentId = await this.getEnvironmentId(params.envCode);

    // 4. 选择版本
    const versionId = await this.resolveVersion(environmentId, template);

    // 5. 获取版本内容
    const version = await this.getVersion(versionId);

    // 6. 拉取变量定义并校验
    const finalVars = await this.resolveAndValidateVars(versionId, params.variables);

    // 7. 渲染模板
    const content = renderTemplate(version.template_text, finalVars);

    // 8. 转换为 OpenAI messages[] 结构
    return [{
      role: mapRole(template.role),
      content
    }];
  }
}

// API 路由处理函数
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 打印入参日志
    console.log("=== Prompt Context API 请求开始 ===");
    console.log("入参:", JSON.stringify(body, null, 2));
    
    const {
      envCode,
      logicalKey,
      scope,
      projectCode,
      sceneCode,
      role,
      language,
      variables,
      flow // 新增：流程代码参数
    } = body;

    // 创建服务实例
    const service = new PromptService();

    // 判断是流程模式还是单模板模式
    if (flow && projectCode) {
      // 流程模式：根据 projectCode 和 flow 生成 messages[]
      if (!envCode || !variables) {
        return NextResponse.json(
          { error: "流程模式缺少必需参数: envCode, projectCode, flow, variables" },
          { status: 400 }
        );
      }

      // 验证枚举值
      const validEnvCodes: EnvCode[] = ['dev', 'staging', 'prod'];
      if (!validEnvCodes.includes(envCode)) {
        return NextResponse.json(
          { error: `无效的 envCode: ${envCode}` },
          { status: 400 }
        );
      }

      const messages = await service.renderFlowToMessages({
        envCode,
        projectCode,
        flow,
        variables
      });

      // 打印出参日志
      console.log("=== Prompt Context API 请求成功（流程模式）===");
      console.log("出参:", JSON.stringify({ success: true, messages }, null, 2));

      return NextResponse.json({
        success: true,
        messages
      });
    } else {
      // 单模板模式：原有逻辑
      // 参数验证
      if (!envCode || !logicalKey || !scope || !role || !variables) {
        return NextResponse.json(
          { error: "缺少必需参数: envCode, logicalKey, scope, role, variables" },
          { status: 400 }
        );
      }

      // 验证枚举值
      const validEnvCodes: EnvCode[] = ['dev', 'staging', 'prod'];
      const validScopes: Scope[] = ['global', 'project', 'scene'];
      const validRoles: PromptRole[] = ['system', 'user', 'assistant', 'tool', 'fewshot'];

      if (!validEnvCodes.includes(envCode)) {
        return NextResponse.json(
          { error: `无效的 envCode: ${envCode}` },
          { status: 400 }
        );
      }
      if (!validScopes.includes(scope)) {
        return NextResponse.json(
          { error: `无效的 scope: ${scope}` },
          { status: 400 }
        );
      }
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `无效的 role: ${role}` },
          { status: 400 }
        );
      }

      const messages = await service.renderToMessages({
        envCode,
        logicalKey,
        scope,
        projectCode,
        sceneCode,
        role,
        language: language || 'zh-CN',
        variables
      });

      // 打印出参日志
      console.log("=== Prompt Context API 请求成功（单模板模式）===");
      console.log("出参:", JSON.stringify({ success: true, messages }, null, 2));

      return NextResponse.json({
        success: true,
        messages
      });
    }
  } catch (error: any) {
    console.error("=== Prompt Context API 请求失败 ===");
    console.error("错误信息:", error.message || "处理请求失败");
    console.error("错误堆栈:", error.stack);
    
    const errorResponse = { error: error.message || "处理请求失败" };
    console.log("出参:", JSON.stringify(errorResponse, null, 2));
    
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}

