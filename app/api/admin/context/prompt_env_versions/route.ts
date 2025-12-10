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
    console.error("[prompt_env_versions] 获取用户ID失败:", error);
    return null;
  }
}

interface QueryParams {
  page?: number;
  pageSize?: number;
}

// GET：查询环境版本映射列表
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params: QueryParams = {
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "10", 10),
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

    // 计算总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM prompt_env_versions`,
      []
    );
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        id,
        environment_id,
        template_id,
        version_id,
        enabled,
        traffic_percent,
        created_at
      FROM prompt_env_versions
      ORDER BY created_at DESC
    `;

    const values: any[] = [];
    if (limit !== null) {
      dataQuery += ` LIMIT $1 OFFSET $2`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $1`;
      values.push(offset);
    }

    const envVersions = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: envVersions,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[prompt_env_versions] 查询列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增环境版本映射
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { environment_id, template_id, version_id, enabled, traffic_percent } = body;

    // 验证必填字段
    if (!environment_id) {
      return NextResponse.json(
        { success: false, error: "环境ID不能为空" },
        { status: 400 }
      );
    }

    if (!template_id) {
      return NextResponse.json(
        { success: false, error: "模板ID不能为空" },
        { status: 400 }
      );
    }

    if (!version_id) {
      return NextResponse.json(
        { success: false, error: "版本ID不能为空" },
        { status: 400 }
      );
    }

    // 验证流量权重
    const traffic = traffic_percent !== undefined ? traffic_percent : 100;
    if (traffic < 0 || traffic > 100) {
      return NextResponse.json(
        { success: false, error: "流量权重必须在0-100之间" },
        { status: 400 }
      );
    }

    // 检查环境是否存在
    const envCheck = await query(
      `SELECT id FROM environments WHERE id = $1`,
      [environment_id]
    );
    if (!envCheck || envCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "环境不存在" },
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

    // 检查版本是否存在
    const versionCheck = await query(
      `SELECT id FROM prompt_template_versions WHERE id = $1`,
      [version_id]
    );
    if (!versionCheck || versionCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "版本不存在" },
        { status: 400 }
      );
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO prompt_env_versions (environment_id, template_id, version_id, enabled, traffic_percent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      environment_id,
      template_id,
      version_id,
      enabled !== undefined ? enabled : true,
      traffic,
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
    console.error("[prompt_env_versions] 创建失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新环境版本映射
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { id, environment_id, template_id, version_id, enabled, traffic_percent } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "映射ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM prompt_env_versions WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "环境版本映射不存在" },
        { status: 404 }
      );
    }

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (environment_id !== undefined) {
      // 检查环境是否存在
      const envCheck = await query(
        `SELECT id FROM environments WHERE id = $1`,
        [environment_id]
      );
      if (!envCheck || envCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "环境不存在" },
          { status: 400 }
        );
      }
      updates.push(`environment_id = $${paramIndex}`);
      values.push(environment_id);
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

    if (version_id !== undefined) {
      // 检查版本是否存在
      const versionCheck = await query(
        `SELECT id FROM prompt_template_versions WHERE id = $1`,
        [version_id]
      );
      if (!versionCheck || versionCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "版本不存在" },
          { status: 400 }
        );
      }
      updates.push(`version_id = $${paramIndex}`);
      values.push(version_id);
      paramIndex++;
    }

    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex}`);
      values.push(enabled);
      paramIndex++;
    }

    if (traffic_percent !== undefined) {
      if (traffic_percent < 0 || traffic_percent > 100) {
        return NextResponse.json(
          { success: false, error: "流量权重必须在0-100之间" },
          { status: 400 }
        );
      }
      updates.push(`traffic_percent = $${paramIndex}`);
      values.push(traffic_percent);
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
      UPDATE prompt_env_versions
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
    console.error("[prompt_env_versions] 更新失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除环境版本映射
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
        { success: false, error: "映射ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM prompt_env_versions WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "环境版本映射不存在" },
        { status: 404 }
      );
    }

    // 删除记录
    const deleteQuery = `DELETE FROM prompt_env_versions WHERE id = $1 RETURNING *`;
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
    console.error("[prompt_env_versions] 删除失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

