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
    console.error("[term] 获取用户ID失败:", error);
    return null;
  }
}

interface QueryParams {
  page?: number;
  pageSize?: number;
}

// GET：查询术语列表
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
      `SELECT COUNT(*) as total FROM term`,
      []
    );
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据（包含分类名称）
    let dataQuery = `
      SELECT
        t.id,
        t.term_key,
        t.name,
        t.alias,
        t.pinyin,
        t.category_id,
        tc.name as category_name,
        t.short_desc,
        t.full_desc,
        t.status,
        t.sort_order,
        t.created_at,
        t.updated_at
      FROM term t
      LEFT JOIN term_category tc ON t.category_id = tc.id
      ORDER BY t.sort_order ASC, t.id ASC
    `;

    const values: any[] = [];
    if (limit !== null) {
      dataQuery += ` LIMIT $1 OFFSET $2`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $1`;
      values.push(offset);
    }

    const terms = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: terms,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[term] 查询列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增术语
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const {
      term_key,
      name,
      alias,
      pinyin,
      category_id,
      short_desc,
      full_desc,
      status,
      sort_order,
    } = body;

    // 验证必填字段
    if (!term_key) {
      return NextResponse.json(
        { success: false, error: "术语Key不能为空" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: "名称不能为空" },
        { status: 400 }
      );
    }

    // 验证字段长度
    if (term_key.length > 128) {
      return NextResponse.json(
        { success: false, error: "术语Key不能超过128个字符" },
        { status: 400 }
      );
    }

    if (name.length > 256) {
      return NextResponse.json(
        { success: false, error: "名称不能超过256个字符" },
        { status: 400 }
      );
    }

    if (alias && alias.length > 512) {
      return NextResponse.json(
        { success: false, error: "别名不能超过512个字符" },
        { status: 400 }
      );
    }

    if (pinyin && pinyin.length > 512) {
      return NextResponse.json(
        { success: false, error: "拼音不能超过512个字符" },
        { status: 400 }
      );
    }

    if (short_desc && short_desc.length > 512) {
      return NextResponse.json(
        { success: false, error: "简要说明不能超过512个字符" },
        { status: 400 }
      );
    }

    // 验证编码格式
    if (!/^[a-z][a-z0-9_]*$/.test(term_key)) {
      return NextResponse.json(
        { success: false, error: "术语Key只能包含小写字母、数字和下划线，且必须以字母开头" },
        { status: 400 }
      );
    }

    // 验证分类ID是否存在（如果提供了）
    if (category_id) {
      const categoryCheck = await query(
        `SELECT id FROM term_category WHERE id = $1`,
        [category_id]
      );
      if (!categoryCheck || categoryCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "分类不存在" },
          { status: 400 }
        );
      }
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO term (term_key, name, alias, pinyin, category_id, short_desc, full_desc, status, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      term_key,
      name,
      alias || null,
      pinyin || null,
      category_id || null,
      short_desc || null,
      full_desc || null,
      status ?? 1,
      sort_order ?? 1000,
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
    console.error("[term] 创建失败:", error);
    // 处理唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "术语Key已存在" },
        { status: 400 }
      );
    }
    // 处理外键约束错误
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "分类不存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新术语
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      term_key,
      name,
      alias,
      pinyin,
      category_id,
      short_desc,
      full_desc,
      status,
      sort_order,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "术语ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM term WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "术语不存在" },
        { status: 404 }
      );
    }

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (term_key !== undefined) {
      if (!term_key) {
        return NextResponse.json(
          { success: false, error: "术语Key不能为空" },
          { status: 400 }
        );
      }
      if (term_key.length > 128) {
        return NextResponse.json(
          { success: false, error: "术语Key不能超过128个字符" },
          { status: 400 }
        );
      }
      if (!/^[a-z][a-z0-9_]*$/.test(term_key)) {
        return NextResponse.json(
          { success: false, error: "术语Key只能包含小写字母、数字和下划线，且必须以字母开头" },
          { status: 400 }
        );
      }
      updates.push(`term_key = $${paramIndex}`);
      values.push(term_key);
      paramIndex++;
    }

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json(
          { success: false, error: "名称不能为空" },
          { status: 400 }
        );
      }
      if (name.length > 256) {
        return NextResponse.json(
          { success: false, error: "名称不能超过256个字符" },
          { status: 400 }
        );
      }
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (alias !== undefined) {
      if (alias && alias.length > 512) {
        return NextResponse.json(
          { success: false, error: "别名不能超过512个字符" },
          { status: 400 }
        );
      }
      updates.push(`alias = $${paramIndex}`);
      values.push(alias || null);
      paramIndex++;
    }

    if (pinyin !== undefined) {
      if (pinyin && pinyin.length > 512) {
        return NextResponse.json(
          { success: false, error: "拼音不能超过512个字符" },
          { status: 400 }
        );
      }
      updates.push(`pinyin = $${paramIndex}`);
      values.push(pinyin || null);
      paramIndex++;
    }

    if (category_id !== undefined) {
      // 验证分类ID是否存在（如果提供了非空值）
      if (category_id) {
        const categoryCheck = await query(
          `SELECT id FROM term_category WHERE id = $1`,
          [category_id]
        );
        if (!categoryCheck || categoryCheck.length === 0) {
          return NextResponse.json(
            { success: false, error: "分类不存在" },
            { status: 400 }
          );
        }
      }
      updates.push(`category_id = $${paramIndex}`);
      values.push(category_id || null);
      paramIndex++;
    }

    if (short_desc !== undefined) {
      if (short_desc && short_desc.length > 512) {
        return NextResponse.json(
          { success: false, error: "简要说明不能超过512个字符" },
          { status: 400 }
        );
      }
      updates.push(`short_desc = $${paramIndex}`);
      values.push(short_desc || null);
      paramIndex++;
    }

    if (full_desc !== undefined) {
      updates.push(`full_desc = $${paramIndex}`);
      values.push(full_desc || null);
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status ?? 1);
      paramIndex++;
    }

    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex}`);
      values.push(sort_order ?? 1000);
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
      UPDATE term
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
    console.error("[term] 更新失败:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "术语Key已存在" },
        { status: 400 }
      );
    }
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "分类不存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除术语
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
        { success: false, error: "术语ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM term WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "术语不存在" },
        { status: 404 }
      );
    }

    // 删除记录
    const deleteQuery = `DELETE FROM term WHERE id = $1 RETURNING *`;
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
    console.error("[term] 删除失败:", error);
    // 处理外键约束错误
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "该术语被其他数据引用，无法删除" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}
