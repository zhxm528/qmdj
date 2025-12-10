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
    console.error("[term_category] 获取用户ID失败:", error);
    return null;
  }
}

interface QueryParams {
  page?: number;
  pageSize?: number;
}

// GET：查询分类列表
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
      `SELECT COUNT(*) as total FROM term_category`,
      []
    );
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        id,
        name,
        code,
        description,
        sort_order,
        created_at,
        updated_at
      FROM term_category
      ORDER BY sort_order ASC, id ASC
    `;

    const values: any[] = [];
    if (limit !== null) {
      dataQuery += ` LIMIT $1 OFFSET $2`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $1`;
      values.push(offset);
    }

    const categories = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: categories,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[term_category] 查询列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增分类
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, description, sort_order } = body;

    // 验证必填字段
    if (!name) {
      return NextResponse.json(
        { success: false, error: "分类名称不能为空" },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { success: false, error: "分类编码不能为空" },
        { status: 400 }
      );
    }

    // 验证字段长度
    if (name.length > 128) {
      return NextResponse.json(
        { success: false, error: "分类名称不能超过128个字符" },
        { status: 400 }
      );
    }

    if (code.length > 64) {
      return NextResponse.json(
        { success: false, error: "分类编码不能超过64个字符" },
        { status: 400 }
      );
    }

    if (description && description.length > 512) {
      return NextResponse.json(
        { success: false, error: "分类说明不能超过512个字符" },
        { status: 400 }
      );
    }

    // 验证编码格式
    if (!/^[a-z][a-z0-9_]*$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "分类编码只能包含小写字母、数字和下划线，且必须以字母开头" },
        { status: 400 }
      );
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO term_category (name, code, description, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      name,
      code,
      description || null,
      sort_order ?? 100,
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
    console.error("[term_category] 创建失败:", error);
    // 处理唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "分类编码已存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新分类
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, code, description, sort_order } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "分类ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM term_category WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "分类不存在" },
        { status: 404 }
      );
    }

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json(
          { success: false, error: "分类名称不能为空" },
          { status: 400 }
        );
      }
      if (name.length > 128) {
        return NextResponse.json(
          { success: false, error: "分类名称不能超过128个字符" },
          { status: 400 }
        );
      }
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (code !== undefined) {
      if (!code) {
        return NextResponse.json(
          { success: false, error: "分类编码不能为空" },
          { status: 400 }
        );
      }
      if (code.length > 64) {
        return NextResponse.json(
          { success: false, error: "分类编码不能超过64个字符" },
          { status: 400 }
        );
      }
      if (!/^[a-z][a-z0-9_]*$/.test(code)) {
        return NextResponse.json(
          { success: false, error: "分类编码只能包含小写字母、数字和下划线，且必须以字母开头" },
          { status: 400 }
        );
      }
      updates.push(`code = $${paramIndex}`);
      values.push(code);
      paramIndex++;
    }

    if (description !== undefined) {
      if (description && description.length > 512) {
        return NextResponse.json(
          { success: false, error: "分类说明不能超过512个字符" },
          { status: 400 }
        );
      }
      updates.push(`description = $${paramIndex}`);
      values.push(description || null);
      paramIndex++;
    }

    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex}`);
      values.push(sort_order ?? 100);
      paramIndex++;
    }

    // 自动更新 updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有要更新的字段" },
        { status: 400 }
      );
    }

    values.push(id);
    const updateQuery = `
      UPDATE term_category
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
    console.error("[term_category] 更新失败:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "分类编码已存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除分类
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
        { success: false, error: "分类ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM term_category WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "分类不存在" },
        { status: 404 }
      );
    }

    // 删除记录
    const deleteQuery = `DELETE FROM term_category WHERE id = $1 RETURNING *`;
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
    console.error("[term_category] 删除失败:", error);
    // 处理外键约束错误
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "该分类被其他数据引用，无法删除" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}
