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
    console.error("[prompt_flows] 获取用户ID失败:", error);
    return null;
  }
}

interface QueryParams {
  page?: number;
  pageSize?: number;
  code?: string;
  name?: string;
}

// GET：查询流程列表
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    // 如果提供了 id，返回单个流程
    if (id) {
      const queryStr = `SELECT id, project_id, code, name, description, created_at FROM prompt_flows WHERE id = $1`;
      console.log("[prompt_flows] 查询单个流程 SQL:", queryStr);
      console.log("[prompt_flows] 查询参数:", [id]);
      const result = await query(queryStr, [id]);
      if (result && result.length > 0) {
        return NextResponse.json({
          success: true,
          data: result[0],
        });
      } else {
        return NextResponse.json(
          { success: false, error: "流程不存在" },
          { status: 404 }
        );
      }
    }

    const params: QueryParams = {
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "10", 10),
      code: searchParams.get("code") || undefined,
      name: searchParams.get("name") || undefined,
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

    // 流程代码模糊查询
    if (params.code) {
      whereConditions.push(`code ILIKE $${paramIndex}`);
      queryValues.push(`%${params.code}%`);
      paramIndex++;
    }

    // 流程名称模糊查询
    if (params.name) {
      whereConditions.push(`name ILIKE $${paramIndex}`);
      queryValues.push(`%${params.name}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // 计算总数
    const countQuery = `SELECT COUNT(*) as total FROM prompt_flows ${whereClause}`;
    console.log("[prompt_flows] 查询总数 SQL:", countQuery);
    console.log("[prompt_flows] 查询总数参数:", queryValues);
    const countResult = await query(countQuery, queryValues);
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        id,
        project_id,
        code,
        name,
        description,
        created_at
      FROM prompt_flows
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const values: any[] = [...queryValues];
    if (limit !== null) {
      dataQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $${paramIndex}`;
      values.push(offset);
    }

    console.log("[prompt_flows] 查询数据 SQL:", dataQuery);
    console.log("[prompt_flows] 查询数据参数:", values);
    const flows = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: flows,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[prompt_flows] 查询列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增流程
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, code, name, description, copy_from_id } = body;

    // 如果是复制操作
    if (copy_from_id) {
      // 查询原始流程信息
      const sourceFlow = await query(
        `SELECT project_id, code, name, description FROM prompt_flows WHERE id = $1`,
        [copy_from_id]
      );

      if (!sourceFlow || sourceFlow.length === 0) {
        return NextResponse.json(
          { success: false, error: "源流程不存在" },
          { status: 404 }
        );
      }

      const source = sourceFlow[0];

      // 生成新的流程代码和名称（添加副本标识）
      const newCode = `${source.code}_copy_${Date.now()}`;
      const newName = `${source.name} (副本)`;

      // 创建新流程
      const insertFlowQuery = `
        INSERT INTO prompt_flows (project_id, code, name, description)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const newFlowResult = await query(insertFlowQuery, [
        source.project_id,
        newCode,
        newName,
        source.description,
      ]);

      if (!newFlowResult || newFlowResult.length === 0) {
        return NextResponse.json(
          { success: false, error: "复制流程失败" },
          { status: 500 }
        );
      }

      const newFlowId = newFlowResult[0].id;

      // 查询原始流程的所有步骤
      const sourceSteps = await query(
        `SELECT flow_id, step_order, template_id, version_strategy, fixed_version_id, optional
         FROM prompt_flow_steps
         WHERE flow_id = $1
         ORDER BY step_order ASC`,
        [copy_from_id]
      );

      // 复制所有步骤
      if (sourceSteps && sourceSteps.length > 0) {
        for (const step of sourceSteps) {
          const insertStepQuery = `
            INSERT INTO prompt_flow_steps (flow_id, step_order, template_id, version_strategy, fixed_version_id, optional)
            VALUES ($1, $2, $3, $4, $5, $6)
          `;
          await query(insertStepQuery, [
            newFlowId,
            step.step_order,
            step.template_id,
            step.version_strategy,
            step.fixed_version_id,
            step.optional,
          ]);
        }
      }

      return NextResponse.json({
        success: true,
        data: newFlowResult[0],
        message: "复制成功",
      });
    }

    // 验证必填字段
    if (!code) {
      return NextResponse.json(
        { success: false, error: "流程代码不能为空" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: "流程名称不能为空" },
        { status: 400 }
      );
    }

    // 验证流程代码长度
    if (code.length > 100) {
      return NextResponse.json(
        { success: false, error: "流程代码不能超过100个字符" },
        { status: 400 }
      );
    }

    // 验证流程名称长度
    if (name.length > 200) {
      return NextResponse.json(
        { success: false, error: "流程名称不能超过200个字符" },
        { status: 400 }
      );
    }

    // 如果提供了项目ID，检查项目是否存在
    if (project_id) {
      const projectCheck = await query(
        `SELECT id FROM projects WHERE id = $1`,
        [project_id]
      );
      if (!projectCheck || projectCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "项目不存在" },
          { status: 400 }
        );
      }
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO prompt_flows (project_id, code, name, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      project_id || null,
      code,
      name,
      description || null,
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
    console.error("[prompt_flows] 创建失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新流程
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { id, project_id, code, name, description } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "流程ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM prompt_flows WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "流程不存在" },
        { status: 404 }
      );
    }

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (project_id !== undefined) {
      if (project_id) {
        // 检查项目是否存在
        const projectCheck = await query(
          `SELECT id FROM projects WHERE id = $1`,
          [project_id]
        );
        if (!projectCheck || projectCheck.length === 0) {
          return NextResponse.json(
            { success: false, error: "项目不存在" },
            { status: 400 }
          );
        }
      }
      updates.push(`project_id = $${paramIndex}`);
      values.push(project_id || null);
      paramIndex++;
    }

    if (code !== undefined) {
      if (code.length > 100) {
        return NextResponse.json(
          { success: false, error: "流程代码不能超过100个字符" },
          { status: 400 }
        );
      }
      updates.push(`code = $${paramIndex}`);
      values.push(code);
      paramIndex++;
    }

    if (name !== undefined) {
      if (name.length > 200) {
        return NextResponse.json(
          { success: false, error: "流程名称不能超过200个字符" },
          { status: 400 }
        );
      }
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description || null);
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
      UPDATE prompt_flows
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
    console.error("[prompt_flows] 更新失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除流程
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
        { success: false, error: "流程ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM prompt_flows WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "流程不存在" },
        { status: 404 }
      );
    }

    // 删除记录（会自动级联删除流程步骤）
    const deleteQuery = `DELETE FROM prompt_flows WHERE id = $1 RETURNING *`;
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
    console.error("[prompt_flows] 删除失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

