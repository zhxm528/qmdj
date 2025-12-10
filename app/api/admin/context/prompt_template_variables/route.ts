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
    console.error("[prompt_template_variables] 获取用户ID失败:", error);
    return null;
  }
}

interface QueryParams {
  page?: number;
  pageSize?: number;
}

// GET：查询模板变量列表
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
      `SELECT COUNT(*) as total FROM prompt_template_variables`,
      []
    );
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        id,
        version_id,
        name,
        var_type,
        required,
        default_value,
        description,
        created_at
      FROM prompt_template_variables
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

    const variables = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: variables,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[prompt_template_variables] 查询列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增模板变量
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { version_id, name, var_type, required, default_value, description } = body;

    // 验证必填字段
    if (!version_id) {
      return NextResponse.json(
        { success: false, error: "版本ID不能为空" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: "变量名称不能为空" },
        { status: 400 }
      );
    }

    if (!var_type) {
      return NextResponse.json(
        { success: false, error: "变量类型不能为空" },
        { status: 400 }
      );
    }

    // 验证变量类型
    const validTypes = ["string", "number", "boolean", "json", "datetime"];
    if (!validTypes.includes(var_type)) {
      return NextResponse.json(
        { success: false, error: "无效的变量类型" },
        { status: 400 }
      );
    }

    // 验证变量名称长度
    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: "变量名称不能超过100个字符" },
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

    // 检查同一版本下变量名是否已存在
    const existingVariable = await query(
      `SELECT id FROM prompt_template_variables WHERE version_id = $1 AND name = $2`,
      [version_id, name]
    );
    if (existingVariable && existingVariable.length > 0) {
      return NextResponse.json(
        { success: false, error: "该版本下已存在相同名称的变量" },
        { status: 400 }
      );
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO prompt_template_variables (version_id, name, var_type, required, default_value, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      version_id,
      name,
      var_type,
      required !== undefined ? required : true,
      default_value || null,
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
    console.error("[prompt_template_variables] 创建失败:", error);
    // 处理唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "该版本下已存在相同名称的变量" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新模板变量
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { id, version_id, name, var_type, required, default_value, description } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "变量ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id, version_id, name FROM prompt_template_variables WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "模板变量不存在" },
        { status: 404 }
      );
    }

    const existing = existingCheck[0];

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

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

    if (name !== undefined) {
      if (name.length > 100) {
        return NextResponse.json(
          { success: false, error: "变量名称不能超过100个字符" },
          { status: 400 }
        );
      }
      // 如果版本或名称发生变化，检查是否重复
      const checkVersionId = version_id !== undefined ? version_id : existing.version_id;
      const checkName = name !== existing.name ? name : null;
      if (checkName) {
        const existingVariable = await query(
          `SELECT id FROM prompt_template_variables WHERE version_id = $1 AND name = $2 AND id != $3`,
          [checkVersionId, checkName, id]
        );
        if (existingVariable && existingVariable.length > 0) {
          return NextResponse.json(
            { success: false, error: "该版本下已存在相同名称的变量" },
            { status: 400 }
          );
        }
      }
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (var_type !== undefined) {
      const validTypes = ["string", "number", "boolean", "json", "datetime"];
      if (!validTypes.includes(var_type)) {
        return NextResponse.json(
          { success: false, error: "无效的变量类型" },
          { status: 400 }
        );
      }
      updates.push(`var_type = $${paramIndex}`);
      values.push(var_type);
      paramIndex++;
    }

    if (required !== undefined) {
      updates.push(`required = $${paramIndex}`);
      values.push(required);
      paramIndex++;
    }

    if (default_value !== undefined) {
      updates.push(`default_value = $${paramIndex}`);
      values.push(default_value || null);
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
      UPDATE prompt_template_variables
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
    console.error("[prompt_template_variables] 更新失败:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "该版本下已存在相同名称的变量" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除模板变量
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
        { success: false, error: "变量ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM prompt_template_variables WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "模板变量不存在" },
        { status: 404 }
      );
    }

    // 删除记录
    const deleteQuery = `DELETE FROM prompt_template_variables WHERE id = $1 RETURNING *`;
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
    console.error("[prompt_template_variables] 删除失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

