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
    const id = searchParams.get("id");
    
    // 如果提供了 id，返回单个模板
    if (id) {
      const queryStr = `SELECT id, logical_key, scope, project_id, scene_code, role, language, description, current_version_id, status, task_type, sensitivity, metadata, created_at, updated_at FROM prompt_templates WHERE id = $1`;
      console.log("[prompt_templates] 查询单个模板 SQL:", queryStr);
      console.log("[prompt_templates] 查询参数:", [id]);
      const result = await query(queryStr, [id]);
      if (result && result.length > 0) {
        return NextResponse.json({
          success: true,
          data: result[0],
        });
      } else {
        return NextResponse.json(
          { success: false, error: "模板不存在" },
          { status: 404 }
        );
      }
    }

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const logical_key = searchParams.get("logical_key") || undefined;
    const status = searchParams.get("status") || undefined;
    const scene_code = searchParams.get("scene_code") || undefined;
    const scope = searchParams.get("scope") || undefined;
    const role = searchParams.get("role") || undefined;
    const project_id = searchParams.get("project_id") || undefined;
    const language = searchParams.get("language") || undefined;
    const current_version_id = searchParams.get("current_version_id") || undefined;

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

    // 逻辑键模糊查询
    if (logical_key) {
      whereConditions.push(`logical_key ILIKE $${paramIndex}`);
      queryValues.push(`%${logical_key}%`);
      paramIndex++;
    }

    // 状态查询
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryValues.push(status);
      paramIndex++;
    }

    // 场景代码模糊查询
    if (scene_code) {
      whereConditions.push(`scene_code ILIKE $${paramIndex}`);
      queryValues.push(`%${scene_code}%`);
      paramIndex++;
    }

    // 作用范围查询
    if (scope) {
      whereConditions.push(`scope = $${paramIndex}`);
      queryValues.push(scope);
      paramIndex++;
    }

    // 角色查询
    if (role) {
      whereConditions.push(`role = $${paramIndex}`);
      queryValues.push(role);
      paramIndex++;
    }

    // 项目ID查询
    if (project_id) {
      whereConditions.push(`project_id = $${paramIndex}`);
      queryValues.push(project_id);
      paramIndex++;
    }

    // 语言查询
    if (language) {
      whereConditions.push(`language = $${paramIndex}`);
      queryValues.push(language);
      paramIndex++;
    }

    // 当前版本ID查询
    if (current_version_id) {
      whereConditions.push(`current_version_id = $${paramIndex}`);
      queryValues.push(current_version_id);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // 计算总数
    const countQuery = `SELECT COUNT(*) as total FROM prompt_templates ${whereClause}`;
    console.log("[prompt_templates] 查询总数 SQL:", countQuery);
    console.log("[prompt_templates] 查询总数参数:", queryValues);
    const countResult = await query(countQuery, queryValues);
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

    console.log("[prompt_templates] 查询数据 SQL:", dataQuery);
    console.log("[prompt_templates] 查询数据参数:", values);
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
      // 验证 UUID 格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(current_version_id)) {
        return NextResponse.json(
          { success: false, error: "当前版本ID必须是有效的UUID格式" },
          { status: 400 }
        );
      }
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
      // 验证 UUID 格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(current_version_id)) {
        return NextResponse.json(
          { success: false, error: "当前版本ID必须是有效的UUID格式" },
          { status: 400 }
        );
      }
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

