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
    console.error("[context/prompt_template_versions] 获取用户ID失败:", error);
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
    
    // 如果提供了 id，返回单个版本
    if (id) {
      const queryStr = `SELECT id, template_id, version, template_text, config, status, changelog, created_by, created_at, updated_at FROM prompt_template_versions WHERE id = $1`;
      console.log("[prompt_template_versions] 查询单个版本 SQL:", queryStr);
      console.log("[prompt_template_versions] 查询参数:", [id]);
      const result = await query(queryStr, [id]);
      if (result && result.length > 0) {
        return NextResponse.json({
          success: true,
          data: result[0],
        });
      } else {
        return NextResponse.json(
          { success: false, error: "版本不存在" },
          { status: 404 }
        );
      }
    }

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const template_id = searchParams.get("template_id") || undefined;
    const template_logical_key = searchParams.get("template_logical_key") || undefined;
    const status = searchParams.get("status") || undefined;

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

    // 判断是否需要 JOIN prompt_templates 表
    const needJoinTemplate = !!template_logical_key;

    // 模板ID精确查询
    if (template_id) {
      whereConditions.push(`ptv.template_id = $${paramIndex}`);
      queryValues.push(template_id);
      paramIndex++;
    }

    // 模板逻辑键模糊查询（需要 JOIN）
    if (template_logical_key) {
      whereConditions.push(`pt.logical_key ILIKE $${paramIndex}`);
      queryValues.push(`%${template_logical_key}%`);
      paramIndex++;
    }

    // 状态查询
    if (status) {
      whereConditions.push(`ptv.status = $${paramIndex}`);
      queryValues.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // JOIN 子句
    const joinClause = needJoinTemplate 
      ? `LEFT JOIN prompt_templates pt ON ptv.template_id = pt.id`
      : "";

    // 计算总数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM prompt_template_versions ptv
      ${joinClause}
      ${whereClause}
    `;
    console.log("[prompt_template_versions] 查询总数 SQL:", countQuery);
    console.log("[prompt_template_versions] 查询总数参数:", queryValues);
    const countResult = await query(countQuery, queryValues);
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        ptv.id,
        ptv.template_id,
        ptv.version,
        ptv.template_text,
        ptv.config,
        ptv.status,
        ptv.changelog,
        ptv.created_by,
        ptv.created_at,
        ptv.updated_at
      FROM prompt_template_versions ptv
      ${joinClause}
      ${whereClause}
      ORDER BY ptv.created_at DESC
    `;

    const values: any[] = [...queryValues];
    if (limit !== null) {
      dataQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $${paramIndex}`;
      values.push(offset);
    }

    console.log("[prompt_template_versions] 查询数据 SQL:", dataQuery);
    console.log("[prompt_template_versions] 查询数据参数:", values);
    const versions = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: versions,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[prompt_template_versions] 查询失败:", error);
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
      template_id,
      version,
      template_text,
      config,
      status,
      changelog,
      created_by,
    } = body;

    if (!template_id) {
      return NextResponse.json(
        { success: false, error: "模板ID不能为空" },
        { status: 400 }
      );
    }

    if (!version) {
      return NextResponse.json(
        { success: false, error: "版本号不能为空" },
        { status: 400 }
      );
    }

    if (!template_text) {
      return NextResponse.json(
        { success: false, error: "模板内容不能为空" },
        { status: 400 }
      );
    }

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

    const insertQuery = `
      INSERT INTO prompt_template_versions (
        template_id,
        version,
        template_text,
        config,
        status,
        changelog,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      template_id,
      version,
      template_text,
      config ? JSON.stringify(config) : null,
      status || "active",
      changelog || null,
      created_by || null,
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
    console.error("[prompt_template_versions] 创建失败:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "该模板下版本号已存在" },
        { status: 400 }
      );
    }
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "模板不存在" },
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
      template_id,
      version,
      template_text,
      config,
      status,
      changelog,
      created_by,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "版本ID不能为空" },
        { status: 400 }
      );
    }

    const existingCheck = await query(
      `SELECT id FROM prompt_template_versions WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "版本不存在" },
        { status: 404 }
      );
    }

    if (template_id) {
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
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (template_id !== undefined) {
      updates.push(`template_id = $${paramIndex}`);
      values.push(template_id);
      paramIndex++;
    }
    if (version !== undefined) {
      updates.push(`version = $${paramIndex}`);
      values.push(version);
      paramIndex++;
    }
    if (template_text !== undefined) {
      updates.push(`template_text = $${paramIndex}`);
      values.push(template_text);
      paramIndex++;
    }
    if (config !== undefined) {
      updates.push(`config = $${paramIndex}`);
      values.push(config ? JSON.stringify(config) : null);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (changelog !== undefined) {
      updates.push(`changelog = $${paramIndex}`);
      values.push(changelog || null);
      paramIndex++;
    }
    if (created_by !== undefined) {
      updates.push(`created_by = $${paramIndex}`);
      values.push(created_by || null);
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
      UPDATE prompt_template_versions
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
    console.error("[prompt_template_versions] 更新失败:", error);
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "模板不存在" },
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
        { success: false, error: "版本ID不能为空" },
        { status: 400 }
      );
    }

    const existingCheck = await query(
      `SELECT id FROM prompt_template_versions WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "版本不存在" },
        { status: 404 }
      );
    }

    const deleteQuery = `DELETE FROM prompt_template_versions WHERE id = $1 RETURNING *`;
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
    console.error("[prompt_template_versions] 删除失败:", error);
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "该版本被其他数据引用，无法删除" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

