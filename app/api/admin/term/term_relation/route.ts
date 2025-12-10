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
    console.error("[term_relation] 获取用户ID失败:", error);
    return null;
  }
}

interface QueryParams {
  page?: number;
  pageSize?: number;
}

// GET：查询术语关系列表
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
      `SELECT COUNT(*) as total FROM term_relation`,
      []
    );
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据（包含术语名称）
    let dataQuery = `
      SELECT
        tr.id,
        tr.from_term_id,
        tr.to_term_id,
        ft.name as from_term_name,
        tt.name as to_term_name,
        tr.relation_type,
        tr.created_at,
        tr.updated_at
      FROM term_relation tr
      LEFT JOIN term ft ON tr.from_term_id = ft.id
      LEFT JOIN term tt ON tr.to_term_id = tt.id
      ORDER BY tr.created_at DESC
    `;

    const values: any[] = [];
    if (limit !== null) {
      dataQuery += ` LIMIT $1 OFFSET $2`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $1`;
      values.push(offset);
    }

    const relations = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: relations,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[term_relation] 查询列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增术语关系
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { from_term_id, to_term_id, relation_type } = body;

    // 验证必填字段
    if (!from_term_id) {
      return NextResponse.json(
        { success: false, error: "源术语ID不能为空" },
        { status: 400 }
      );
    }

    if (!to_term_id) {
      return NextResponse.json(
        { success: false, error: "目标术语ID不能为空" },
        { status: 400 }
      );
    }

    // 验证源术语和目标术语不能相同
    if (from_term_id === to_term_id) {
      return NextResponse.json(
        { success: false, error: "源术语和目标术语不能相同" },
        { status: 400 }
      );
    }

    // 验证关系类型
    const validRelationTypes = ["related", "parent", "child", "synonym", "antonym"];
    const finalRelationType = relation_type || "related";
    if (!validRelationTypes.includes(finalRelationType)) {
      return NextResponse.json(
        { success: false, error: "无效的关系类型" },
        { status: 400 }
      );
    }

    // 验证字段长度
    if (finalRelationType.length > 32) {
      return NextResponse.json(
        { success: false, error: "关系类型不能超过32个字符" },
        { status: 400 }
      );
    }

    // 检查源术语是否存在
    const fromTermCheck = await query(
      `SELECT id FROM term WHERE id = $1`,
      [from_term_id]
    );
    if (!fromTermCheck || fromTermCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "源术语不存在" },
        { status: 400 }
      );
    }

    // 检查目标术语是否存在
    const toTermCheck = await query(
      `SELECT id FROM term WHERE id = $1`,
      [to_term_id]
    );
    if (!toTermCheck || toTermCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "目标术语不存在" },
        { status: 400 }
      );
    }

    // 检查关系是否已存在
    const existingCheck = await query(
      `SELECT id FROM term_relation WHERE from_term_id = $1 AND to_term_id = $2 AND relation_type = $3`,
      [from_term_id, to_term_id, finalRelationType]
    );
    if (existingCheck && existingCheck.length > 0) {
      return NextResponse.json(
        { success: false, error: "该关系已存在" },
        { status: 400 }
      );
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO term_relation (from_term_id, to_term_id, relation_type)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      from_term_id,
      to_term_id,
      finalRelationType,
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
    console.error("[term_relation] 创建失败:", error);
    // 处理唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "该关系已存在" },
        { status: 400 }
      );
    }
    // 处理外键约束错误
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "术语不存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新术语关系
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { id, from_term_id, to_term_id, relation_type } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "关系ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM term_relation WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "关系不存在" },
        { status: 404 }
      );
    }

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (from_term_id !== undefined) {
      if (!from_term_id) {
        return NextResponse.json(
          { success: false, error: "源术语ID不能为空" },
          { status: 400 }
        );
      }
      // 检查源术语是否存在
      const fromTermCheck = await query(
        `SELECT id FROM term WHERE id = $1`,
        [from_term_id]
      );
      if (!fromTermCheck || fromTermCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "源术语不存在" },
          { status: 400 }
        );
      }
      updates.push(`from_term_id = $${paramIndex}`);
      values.push(from_term_id);
      paramIndex++;
    }

    if (to_term_id !== undefined) {
      if (!to_term_id) {
        return NextResponse.json(
          { success: false, error: "目标术语ID不能为空" },
          { status: 400 }
        );
      }
      // 检查目标术语是否存在
      const toTermCheck = await query(
        `SELECT id FROM term WHERE id = $1`,
        [to_term_id]
      );
      if (!toTermCheck || toTermCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "目标术语不存在" },
          { status: 400 }
        );
      }
      updates.push(`to_term_id = $${paramIndex}`);
      values.push(to_term_id);
      paramIndex++;
    }

    // 验证源术语和目标术语不能相同
    if (from_term_id !== undefined && to_term_id !== undefined) {
      if (from_term_id === to_term_id) {
        return NextResponse.json(
          { success: false, error: "源术语和目标术语不能相同" },
          { status: 400 }
        );
      }
    }

    if (relation_type !== undefined) {
      const validRelationTypes = ["related", "parent", "child", "synonym", "antonym"];
      if (!validRelationTypes.includes(relation_type)) {
        return NextResponse.json(
          { success: false, error: "无效的关系类型" },
          { status: 400 }
        );
      }
      if (relation_type.length > 32) {
        return NextResponse.json(
          { success: false, error: "关系类型不能超过32个字符" },
          { status: 400 }
        );
      }
      updates.push(`relation_type = $${paramIndex}`);
      values.push(relation_type);
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
      UPDATE term_relation
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
    console.error("[term_relation] 更新失败:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "该关系已存在" },
        { status: 400 }
      );
    }
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "术语不存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除术语关系
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
        { success: false, error: "关系ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT id FROM term_relation WHERE id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "关系不存在" },
        { status: 404 }
      );
    }

    // 删除记录
    const deleteQuery = `DELETE FROM term_relation WHERE id = $1 RETURNING *`;
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
    console.error("[term_relation] 删除失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}
