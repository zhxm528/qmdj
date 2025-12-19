import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

// 获取当前用户ID（管理员权限检查）
async function getCurrentUserId(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session?.value) {
      return null;
    }

    const token = session.value.trim();
    let userRows = await query(
      `SELECT id, role FROM users WHERE email = $1 OR id = $2 LIMIT 1`,
      [token.toLowerCase(), /^\d+$/.test(token) ? parseInt(token, 10) : -1]
    );

    if (userRows && userRows.length > 0) {
      const user = userRows[0] as { id: number; role: string };
      if (user.role === "qmdj") {
        return user.id;
      }
    }
    return null;
  } catch (error) {
    console.error("[prompt_flow_steps] 获取用户ID失败:", error);
    return null;
  }
}

interface QueryParams {
  page?: number;
  pageSize?: number;
  flow_id?: string;
  template_logical_key?: string; // 模板逻辑键，支持模糊查询
  version_strategy?: string;
  fixed_version?: string; // 版本号，支持模糊查询
}

// GET：查询流程步骤列表
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    // 如果提供了 id，返回单个流程步骤
    if (id) {
      const queryStr = `SELECT id, flow_id, step_order, template_id, version_strategy, fixed_version_id, optional, created_at FROM prompt_flow_steps WHERE id = $1`;
      console.log("[prompt_flow_steps] 查询单个流程步骤 SQL:", queryStr);
      console.log("[prompt_flow_steps] 查询参数:", [id]);
      const result = await query(queryStr, [id]);
      if (result && result.length > 0) {
        return NextResponse.json({
          success: true,
          data: result[0],
        });
      } else {
        return NextResponse.json(
          { success: false, error: "流程步骤不存在" },
          { status: 404 }
        );
      }
    }

    const params: QueryParams = {
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "10", 10),
      flow_id: searchParams.get("flow_id") || undefined,
      template_logical_key: searchParams.get("template_logical_key") || undefined,
      version_strategy: searchParams.get("version_strategy") || undefined,
      fixed_version: searchParams.get("fixed_version") || undefined,
    };

    const page = params.page || 1;
    const pageSize = params.pageSize || 10;

    let offset = 0;
    let limit: number | null = null;

    if (pageSize === -1) {
      limit = null;
    } else {
      offset = (page - 1) * pageSize;
      limit = pageSize;
    }

    // 构建 WHERE 条件
    const whereConditions: string[] = [];
    const queryValues: any[] = [];
    let paramIndex = 1;

    // 判断是否需要 JOIN 相关表
    const needJoinTemplate = !!params.template_logical_key;
    const needJoinVersion = !!params.fixed_version;

    // 流程ID查询
    if (params.flow_id) {
      whereConditions.push(`ptv.flow_id = $${paramIndex}`);
      queryValues.push(params.flow_id);
      paramIndex++;
    }

    // 模板逻辑键模糊查询（需要 JOIN prompt_templates）
    if (params.template_logical_key) {
      whereConditions.push(`pt.logical_key ILIKE $${paramIndex}`);
      queryValues.push(`%${params.template_logical_key}%`);
      paramIndex++;
    }

    // 版本策略查询
    if (params.version_strategy) {
      whereConditions.push(`ptv.version_strategy = $${paramIndex}`);
      queryValues.push(params.version_strategy);
      paramIndex++;
    }

    // 固定版本号模糊查询（需要 JOIN prompt_template_versions）
    if (params.fixed_version) {
      whereConditions.push(`pv.version ILIKE $${paramIndex}`);
      queryValues.push(`%${params.fixed_version}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // JOIN 子句
    let joinClause = "";
    if (needJoinTemplate) {
      joinClause += ` LEFT JOIN prompt_templates pt ON ptv.template_id = pt.id`;
    }
    if (needJoinVersion) {
      joinClause += ` LEFT JOIN prompt_template_versions pv ON ptv.fixed_version_id = pv.id`;
    }

    // 计算总数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM prompt_flow_steps ptv
      ${joinClause}
      ${whereClause}
    `;
    console.log("[prompt_flow_steps] 查询总数 SQL:", countQuery);
    console.log("[prompt_flow_steps] 查询总数参数:", queryValues);
    const countResult = await query(countQuery, queryValues);
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        ptv.id,
        ptv.flow_id,
        ptv.step_order,
        ptv.template_id,
        ptv.version_strategy,
        ptv.fixed_version_id,
        ptv.optional,
        ptv.created_at
      FROM prompt_flow_steps ptv
      ${joinClause}
      ${whereClause}
      ORDER BY ptv.flow_id, ptv.step_order ASC
    `;

    const values: any[] = [...queryValues];
    if (limit !== null) {
      dataQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $${paramIndex}`;
      values.push(offset);
    }

    console.log("[prompt_flow_steps] 查询数据 SQL:", dataQuery);
    console.log("[prompt_flow_steps] 查询数据参数:", values);
    const steps = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: steps,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[prompt_flow_steps] 查询列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增流程步骤
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { flow_id, step_order, template_id, version_strategy, fixed_version_id, optional } = body;

    // 验证必填字段
    if (!flow_id) {
      return NextResponse.json(
        { success: false, error: "流程ID不能为空" },
        { status: 400 }
      );
    }

    if (!step_order) {
      return NextResponse.json(
        { success: false, error: "步骤顺序不能为空" },
        { status: 400 }
      );
    }

    if (!template_id) {
      return NextResponse.json(
        { success: false, error: "模板ID不能为空" },
        { status: 400 }
      );
    }

    if (!version_strategy) {
      return NextResponse.json(
        { success: false, error: "版本策略不能为空" },
        { status: 400 }
      );
    }

    // 验证版本策略
    const validStrategies = ["latest", "pinned"];
    if (!validStrategies.includes(version_strategy)) {
      return NextResponse.json(
        { success: false, error: "无效的版本策略，必须是 latest 或 pinned" },
        { status: 400 }
      );
    }

    // 如果版本策略是pinned，必须提供fixed_version_id
    if (version_strategy === "pinned" && !fixed_version_id) {
      return NextResponse.json(
        { success: false, error: "版本策略为pinned时，必须提供固定版本ID" },
        { status: 400 }
      );
    }

    // 验证步骤顺序：必须是正整数
    const stepOrderNum = Number(step_order);
    if (isNaN(stepOrderNum) || !Number.isInteger(stepOrderNum) || stepOrderNum < 1) {
      return NextResponse.json(
        { success: false, error: "步骤顺序必须是大于0的正整数" },
        { status: 400 }
      );
    }
    const stepOrderInt = parseInt(String(step_order), 10);

    // 检查流程是否存在
    const flowCheck = await query(
      `SELECT id FROM prompt_flows WHERE id = $1`,
      [flow_id]
    );
    if (!flowCheck || flowCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "流程不存在" },
        { status: 400 }
      );
    }

    // 检查模板是否存在
    const templateCheck = await query(
      `SELECT id FROM prompt_templates WHERE id = $1`,
      [template_id]
    );
    if (!templateCheck || templateCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "模板不存在" },
        { status: 400 }
      );
    }

    // 如果提供了固定版本ID，检查版本是否存在
    if (fixed_version_id) {
      const versionCheck = await query(
        `SELECT id FROM prompt_template_versions WHERE id = $1`,
        [fixed_version_id]
      );
      if (!versionCheck || versionCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "版本不存在" },
          { status: 400 }
        );
      }
    }

    // 检查同一流程中步骤顺序是否重复
    const existingOrder = await query(
      `SELECT id FROM prompt_flow_steps WHERE flow_id = $1 AND step_order = $2`,
      [flow_id, stepOrderInt]
    );
    if (existingOrder && existingOrder.length > 0) {
      return NextResponse.json(
        { success: false, error: "该流程中已存在相同顺序的步骤" },
        { status: 400 }
      );
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO prompt_flow_steps (flow_id, step_order, template_id, version_strategy, fixed_version_id, optional)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      flow_id,
      stepOrderInt,
      template_id,
      version_strategy,
      version_strategy === "pinned" ? fixed_version_id : null,
      optional !== undefined ? optional : false,
    ]);

    if (result && result.length > 0) {
      return NextResponse.json({
        success: true,
        data: result[0],
        message: "创建成功",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "创建失败" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[prompt_flow_steps] 创建失败:", error);
    // 处理唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "该流程中已存在相同顺序的步骤" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新流程步骤
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { id, flow_id, step_order, template_id, version_strategy, fixed_version_id, optional } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "步骤ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id, flow_id, step_order, version_strategy FROM prompt_flow_steps WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "流程步骤不存在" },
        { status: 404 }
      );
    }

    const existing = existingCheck[0];

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (flow_id !== undefined) {
      // 检查流程是否存在
      const flowCheck = await query(
        `SELECT id FROM prompt_flows WHERE id = $1`,
        [flow_id]
      );
      if (!flowCheck || flowCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "流程不存在" },
          { status: 400 }
        );
      }
      updates.push(`flow_id = $${paramIndex}`);
      values.push(flow_id);
      paramIndex++;
    }

    if (step_order !== undefined) {
      // 验证步骤顺序：必须是正整数
      const stepOrderNum = Number(step_order);
      if (isNaN(stepOrderNum) || !Number.isInteger(stepOrderNum) || stepOrderNum < 1) {
        return NextResponse.json(
          { success: false, error: "步骤顺序必须是大于0的正整数" },
          { status: 400 }
        );
      }
      const stepOrderInt = parseInt(String(step_order), 10);
      // 如果步骤顺序发生变化，检查是否重复
      const checkFlowId = flow_id !== undefined ? flow_id : existing.flow_id;
      const checkOrder = stepOrderInt !== existing.step_order ? stepOrderInt : null;
      if (checkOrder) {
        const existingOrder = await query(
          `SELECT id FROM prompt_flow_steps WHERE flow_id = $1 AND step_order = $2 AND id != $3`,
          [checkFlowId, checkOrder, id]
        );
        if (existingOrder && existingOrder.length > 0) {
          return NextResponse.json(
            { success: false, error: "该流程中已存在相同顺序的步骤" },
            { status: 400 }
          );
        }
      }
      updates.push(`step_order = $${paramIndex}`);
      values.push(stepOrderInt);
      paramIndex++;
    }

    if (template_id !== undefined) {
      // 检查模板是否存在
      const templateCheck = await query(
        `SELECT id FROM prompt_templates WHERE id = $1`,
        [template_id]
      );
      if (!templateCheck || templateCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "模板不存在" },
          { status: 400 }
        );
      }
      updates.push(`template_id = $${paramIndex}`);
      values.push(template_id);
      paramIndex++;
    }

    // 记录版本策略是否被更新
    let versionStrategyUpdated = false;
    let finalVersionStrategy = version_strategy;

    if (version_strategy !== undefined) {
      const validStrategies = ["latest", "pinned"];
      if (!validStrategies.includes(version_strategy)) {
        return NextResponse.json(
          { success: false, error: "无效的版本策略，必须是 latest 或 pinned" },
          { status: 400 }
        );
      }
      updates.push(`version_strategy = $${paramIndex}`);
      values.push(version_strategy);
      paramIndex++;
      versionStrategyUpdated = true;
      finalVersionStrategy = version_strategy;

      // 如果版本策略改为 latest，清除 fixed_version_id
      if (version_strategy === "latest") {
        updates.push(`fixed_version_id = NULL`);
      }
    } else {
      // 如果没有更新版本策略，使用现有的值
      finalVersionStrategy = existing.version_strategy || "latest";
    }

    // 只有当版本策略是 "pinned" 时，才处理 fixed_version_id
    // 如果版本策略被更新为 "latest"，上面已经设置了 fixed_version_id = NULL，这里跳过避免重复
    if (finalVersionStrategy === "pinned" && (!versionStrategyUpdated || version_strategy === "pinned")) {
      if (fixed_version_id !== undefined) {
        if (fixed_version_id) {
          // 检查版本是否存在
          const versionCheck = await query(
            `SELECT id FROM prompt_template_versions WHERE id = $1`,
            [fixed_version_id]
          );
          if (!versionCheck || versionCheck.length === 0) {
            return NextResponse.json(
              { success: false, error: "版本不存在" },
              { status: 400 }
            );
          }
          updates.push(`fixed_version_id = $${paramIndex}`);
          values.push(fixed_version_id);
          paramIndex++;
        } else {
          return NextResponse.json(
            { success: false, error: "版本策略为固定版本时，必须提供固定版本ID" },
            { status: 400 }
          );
        }
      }
    }

    if (optional !== undefined) {
      updates.push(`optional = $${paramIndex}`);
      values.push(optional);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有要更新的字段" },
        { status: 400 }
      );
    }

    values.push(id);
    const updateQuery = `
      UPDATE prompt_flow_steps
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result && result.length > 0) {
      return NextResponse.json({
        success: true,
        data: result[0],
        message: "更新成功",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "更新失败" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[prompt_flow_steps] 更新失败:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "该流程中已存在相同顺序的步骤" },
        { status: 400 }
      );
    }
    // 处理 PostgreSQL 的 "multiple assignments to same column" 错误
    if (error.message && error.message.includes("multiple assignments to same column")) {
      return NextResponse.json(
        { success: false, error: "不能对同一列进行多次赋值" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除流程步骤
export async function DELETE(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "步骤ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM prompt_flow_steps WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "流程步骤不存在" },
        { status: 404 }
      );
    }

    // 删除记录
    const deleteQuery = `DELETE FROM prompt_flow_steps WHERE id = $1 RETURNING *`;
    const result = await query(deleteQuery, [id]);

    if (result && result.length > 0) {
      return NextResponse.json({
        success: true,
        data: result[0],
        message: "删除成功",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "删除失败" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[prompt_flow_steps] 删除失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

