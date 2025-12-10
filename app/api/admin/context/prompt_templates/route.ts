import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

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
    console.error("[context/prompt_templates] 获取用户ID失败:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    let offset = 0;
    let limit: number | null = null;

    if (pageSize === -1) {
      limit = null;
    } else {
      offset = (page - 1) * pageSize;
      limit = pageSize;
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM prompt_templates`,
      []
    );
    const total = parseInt(countResult[0]?.total || "0", 10);

    let dataQuery = `
      SELECT
        id,
        logical_key,
        scope,
        project_id,
        scene_code,
        role,
        language,
        description,
        current_version_id,
        status,
        task_type,
        sensitivity,
        metadata,
        created_at,
        updated_at
      FROM prompt_templates
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

    const templates = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: templates,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[prompt_templates] 查询失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const {
      logical_key,
      scope,
      project_id,
      scene_code,
      role,
      language,
      description,
      current_version_id,
      status,
      task_type,
      sensitivity,
      metadata,
    } = body;

    if (!logical_key) {
      return NextResponse.json(
        { success: false, error: "逻辑键不能为空" },
        { status: 400 }
      );
    }

    if (!scope) {
      return NextResponse.json(
        { success: false, error: "作用范围不能为空" },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { success: false, error: "角色不能为空" },
        { status: 400 }
      );
    }

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

    if (current_version_id) {
      const versionCheck = await query(
        `SELECT id FROM prompt_template_versions WHERE id = $1`,
        [current_version_id]
      );
      if (!versionCheck || versionCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "版本不存在" },
          { status: 400 }
        );
      }
    }

    const insertQuery = `
      INSERT INTO prompt_templates (
        logical_key,
        scope,
        project_id,
        scene_code,
        role,
        language,
        description,
        current_version_id,
        status,
        task_type,
        sensitivity,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      logical_key,
      scope,
      project_id || null,
      scene_code || null,
      role,
      language || "zh-CN",
      description || null,
      current_version_id || null,
      status || "active",
      task_type || null,
      sensitivity || null,
      metadata ? JSON.stringify(metadata) : null,
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
    console.error("[prompt_templates] 创建失败:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "逻辑键已存在" },
        { status: 400 }
      );
    }
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "项目或版本不存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      logical_key,
      scope,
      project_id,
      scene_code,
      role,
      language,
      description,
      current_version_id,
      status,
      task_type,
      sensitivity,
      metadata,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "模板ID不能为空" },
        { status: 400 }
      );
    }

    const existingCheck = await query(
      `SELECT id FROM prompt_templates WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "模板不存在" },
        { status: 404 }
      );
    }

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

    if (current_version_id) {
      const versionCheck = await query(
        `SELECT id FROM prompt_template_versions WHERE id = $1`,
        [current_version_id]
      );
      if (!versionCheck || versionCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "版本不存在" },
          { status: 400 }
        );
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (logical_key !== undefined) {
      updates.push(`logical_key = $${paramIndex}`);
      values.push(logical_key);
      paramIndex++;
    }
    if (scope !== undefined) {
      updates.push(`scope = $${paramIndex}`);
      values.push(scope);
      paramIndex++;
    }
    if (project_id !== undefined) {
      updates.push(`project_id = $${paramIndex}`);
      values.push(project_id || null);
      paramIndex++;
    }
    if (scene_code !== undefined) {
      updates.push(`scene_code = $${paramIndex}`);
      values.push(scene_code || null);
      paramIndex++;
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }
    if (language !== undefined) {
      updates.push(`language = $${paramIndex}`);
      values.push(language);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description || null);
      paramIndex++;
    }
    if (current_version_id !== undefined) {
      updates.push(`current_version_id = $${paramIndex}`);
      values.push(current_version_id || null);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (task_type !== undefined) {
      updates.push(`task_type = $${paramIndex}`);
      values.push(task_type || null);
      paramIndex++;
    }
    if (sensitivity !== undefined) {
      updates.push(`sensitivity = $${paramIndex}`);
      values.push(sensitivity || null);
      paramIndex++;
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramIndex}`);
      values.push(metadata ? JSON.stringify(metadata) : null);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有要更新的字段" },
        { status: 400 }
      );
    }

    values.push(id);
    const updateQuery = `
      UPDATE prompt_templates
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
    console.error("[prompt_templates] 更新失败:", error);
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "项目或版本不存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

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
        { success: false, error: "模板ID不能为空" },
        { status: 400 }
      );
    }

    const existingCheck = await query(
      `SELECT id FROM prompt_templates WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "模板不存在" },
        { status: 404 }
      );
    }

    const deleteQuery = `DELETE FROM prompt_templates WHERE id = $1 RETURNING *`;
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
    console.error("[prompt_templates] 删除失败:", error);
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "该模板被其他数据引用，无法删除" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

