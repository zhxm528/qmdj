import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query, transaction } from "@/lib/db";

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
    console.error("[prompt/context] 获取用户ID失败:", error);
    return null;
  }
}

// 支持的表格列表
const TABLES = [
  "projects",
  "prompt_templates",
  "prompt_template_versions",
  "prompt_template_variables",
  "prompt_tags",
  "prompt_template_tags",
  "environments",
  "prompt_env_versions",
  "prompt_flows",
  "prompt_flow_steps",
];

// GET: 查询数据
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const id = searchParams.get("id");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    if (!table || !TABLES.includes(table)) {
      return NextResponse.json(
        { error: "无效的表名" },
        { status: 400 }
      );
    }

    // 如果提供了 id，查询单条记录
    if (id) {
      const result = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      return NextResponse.json({
        success: true,
        data: result.length > 0 ? result[0] : null,
      });
    }

    // 查询列表
    const offset = (page - 1) * pageSize;
    const limit = pageSize === -1 ? null : pageSize;

    let countQuery = `SELECT COUNT(*) as total FROM ${table}`;
    const countResult = await query(countQuery, []);
    const total = parseInt(countResult[0]?.total || "0", 10);

    let dataQuery = `SELECT * FROM ${table} ORDER BY created_at DESC`;
    if (limit !== null) {
      dataQuery += ` LIMIT $1 OFFSET $2`;
      const result = await query(dataQuery, [limit, offset]);
      return NextResponse.json({
        success: true,
        data: result,
        total,
        page,
        pageSize,
      });
    } else {
      dataQuery += ` OFFSET $1`;
      const result = await query(dataQuery, [offset]);
      return NextResponse.json({
        success: true,
        data: result,
        total,
        page,
        pageSize: total,
      });
    }
  } catch (error: any) {
    console.error("[prompt/context] GET 失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST: 创建数据
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { table, data } = body;

    if (!table || !TABLES.includes(table)) {
      return NextResponse.json(
        { error: "无效的表名" },
        { status: 400 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "无效的数据" },
        { status: 400 }
      );
    }

    // 构建插入语句
    const keys = Object.keys(data).filter((key) => data[key] !== undefined);
    const values = keys.map((key) => data[key]);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");

    const insertQuery = `
      INSERT INTO ${table} (${keys.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await query(insertQuery, values);

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error("[prompt/context] POST 失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT: 更新数据
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { table, id, data } = body;

    if (!table || !TABLES.includes(table)) {
      return NextResponse.json(
        { error: "无效的表名" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "缺少ID参数" },
        { status: 400 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "无效的数据" },
        { status: 400 }
      );
    }

    // 构建更新语句
    const keys = Object.keys(data).filter(
      (key) => data[key] !== undefined && key !== "id"
    );
    const values = keys.map((key) => data[key]);
    const setClause = keys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");

    const updateQuery = `
      UPDATE ${table}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;

    const result = await query(updateQuery, [...values, id]);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "记录不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error("[prompt/context] PUT 失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE: 删除数据
export async function DELETE(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const id = searchParams.get("id");

    if (!table || !TABLES.includes(table)) {
      return NextResponse.json(
        { error: "无效的表名" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "缺少ID参数" },
        { status: 400 }
      );
    }

    const deleteQuery = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
    const result = await query(deleteQuery, [id]);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "记录不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error("[prompt/context] DELETE 失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

