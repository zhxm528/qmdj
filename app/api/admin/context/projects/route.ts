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
    console.error("[context/projects] 获取用户ID失败:", error);
    return null;
  }
}

interface ProjectsQueryParams {
  page?: number;
  pageSize?: number;
}

// GET：查询项目列表
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params: ProjectsQueryParams = {
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
      `SELECT COUNT(*) as total FROM projects`,
      []
    );
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        id,
        code,
        name,
        description,
        created_at,
        updated_at
      FROM projects
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

    const projects = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: projects,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[projects] 查询项目列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增项目
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, description } = body;

    // 验证必填字段
    if (!code) {
      return NextResponse.json(
        { success: false, error: "项目代码不能为空" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: "项目名称不能为空" },
        { status: 400 }
      );
    }

    // 验证项目代码格式（只能包含小写字母、数字和下划线）
    if (!/^[a-z0-9_]+$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "项目代码只能包含小写字母、数字和下划线" },
        { status: 400 }
      );
    }

    // 验证项目代码长度
    if (code.length > 50) {
      return NextResponse.json(
        { success: false, error: "项目代码不能超过50个字符" },
        { status: 400 }
      );
    }

    // 验证项目名称长度
    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: "项目名称不能超过100个字符" },
        { status: 400 }
      );
    }

    // 检查项目代码是否已存在
    const existingCode = await query(
      `SELECT id FROM projects WHERE code = $1`,
      [code]
    );
    if (existingCode && existingCode.length > 0) {
      return NextResponse.json(
        { success: false, error: "项目代码已存在" },
        { status: 400 }
      );
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO projects (code, name, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await query(insertQuery, [
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
    console.error("[projects] 创建项目失败:", error);
    // 处理唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "项目代码已存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新项目
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { id, code, name, description } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "项目ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id, code FROM projects WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 注意：项目代码不允许修改（code字段在编辑时应该是disabled的，但这里也做保护）
    // 如果前端传了code且与现有code不同，则拒绝更新
    if (code !== undefined && code !== existingCheck[0].code) {
      return NextResponse.json(
        { success: false, error: "项目代码不允许修改" },
        { status: 400 }
      );
    }

    if (name !== undefined) {
      if (name.length > 100) {
        return NextResponse.json(
          { success: false, error: "项目名称不能超过100个字符" },
          { status: 400 }
        );
      }
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      if (description && description.length > 1000) {
        return NextResponse.json(
          { success: false, error: "项目描述不能超过1000个字符" },
          { status: 400 }
        );
      }
      updates.push(`description = $${paramIndex}`);
      values.push(description || null);
      paramIndex++;
    }

    // 更新 updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有要更新的字段" },
        { status: 400 }
      );
    }

    values.push(id);
    const updateQuery = `
      UPDATE projects
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
    console.error("[projects] 更新项目失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除项目
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
        { success: false, error: "项目ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM projects WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    // 检查是否有其他表引用该项目（外键约束）
    // 注意：如果数据库中有外键约束，删除时会自动检查，这里可以提前检查以避免错误
    // 由于 projects 表可能被其他表引用，我们需要检查是否有依赖
    // 但为了简化，这里直接尝试删除，如果失败会返回错误

    // 删除记录
    const deleteQuery = `DELETE FROM projects WHERE id = $1 RETURNING *`;
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
    console.error("[projects] 删除项目失败:", error);
    // 处理外键约束错误
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "该项目被其他数据引用，无法删除" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

