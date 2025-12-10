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
    console.error("[member/points_transaction] 获取用户ID失败:", error);
    return null;
  }
}

interface PointsTransactionQueryParams {
  page?: number;
  pageSize?: number;
}

// GET：查询积分变动记录列表
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params: PointsTransactionQueryParams = {
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
      `SELECT COUNT(*) as total FROM points_transaction`,
      []
    );
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        points_txn_id,
        member_id,
        card_id,
        change_type,
        change_points,
        balance_after,
        related_type,
        related_id,
        remark,
        created_at
      FROM points_transaction
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

    const transactions = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: transactions,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[points_transaction] 查询积分变动记录列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增积分变动记录
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const {
      member_id,
      card_id,
      change_type,
      change_points,
      balance_after,
      related_type,
      related_id,
      remark,
    } = body;

    // 验证必填字段
    if (!member_id) {
      return NextResponse.json(
        { success: false, error: "会员ID不能为空" },
        { status: 400 }
      );
    }

    if (!change_type) {
      return NextResponse.json(
        { success: false, error: "变动类型不能为空" },
        { status: 400 }
      );
    }

    if (change_points === undefined || change_points === null) {
      return NextResponse.json(
        { success: false, error: "变动积分不能为空" },
        { status: 400 }
      );
    }

    if (balance_after === undefined || balance_after === null) {
      return NextResponse.json(
        { success: false, error: "变动后余额不能为空" },
        { status: 400 }
      );
    }

    if (balance_after < 0) {
      return NextResponse.json(
        { success: false, error: "变动后余额不能小于0" },
        { status: 400 }
      );
    }

    // 检查会员是否存在
    const memberCheck = await query(
      `SELECT member_id FROM member WHERE member_id = $1`,
      [member_id]
    );
    if (!memberCheck || memberCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "会员不存在" },
        { status: 400 }
      );
    }

    // 如果提供了 card_id，检查卡是否存在
    if (card_id) {
      const cardCheck = await query(
        `SELECT card_id FROM member_card WHERE card_id = $1`,
        [card_id]
      );
      if (!cardCheck || cardCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "会员卡不存在" },
          { status: 400 }
        );
      }
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO points_transaction (
        member_id,
        card_id,
        change_type,
        change_points,
        balance_after,
        related_type,
        related_id,
        remark
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      member_id,
      card_id || null,
      change_type,
      change_points,
      balance_after,
      related_type || null,
      related_id || null,
      remark || null,
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
    console.error("[points_transaction] 创建积分变动记录失败:", error);
    // 处理外键约束错误
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "会员或会员卡不存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新积分变动记录
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const {
      points_txn_id,
      member_id,
      card_id,
      change_type,
      change_points,
      balance_after,
      related_type,
      related_id,
      remark,
    } = body;

    if (!points_txn_id) {
      return NextResponse.json(
        { success: false, error: "积分变动记录ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT points_txn_id FROM points_transaction WHERE points_txn_id = $1`,
      [points_txn_id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "积分变动记录不存在" },
        { status: 404 }
      );
    }

    // 如果更新了 member_id，检查会员是否存在
    if (member_id) {
      const memberCheck = await query(
        `SELECT member_id FROM member WHERE member_id = $1`,
        [member_id]
      );
      if (!memberCheck || memberCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "会员不存在" },
          { status: 400 }
        );
      }
    }

    // 如果更新了 card_id，检查卡是否存在
    if (card_id !== undefined && card_id !== null) {
      const cardCheck = await query(
        `SELECT card_id FROM member_card WHERE card_id = $1`,
        [card_id]
      );
      if (!cardCheck || cardCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "会员卡不存在" },
          { status: 400 }
        );
      }
    }

    // 验证余额
    if (balance_after !== undefined && balance_after !== null) {
      if (balance_after < 0) {
        return NextResponse.json(
          { success: false, error: "变动后余额不能小于0" },
          { status: 400 }
        );
      }
    }

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (member_id !== undefined) {
      updates.push(`member_id = $${paramIndex}`);
      values.push(member_id);
      paramIndex++;
    }
    if (card_id !== undefined) {
      updates.push(`card_id = $${paramIndex}`);
      values.push(card_id || null);
      paramIndex++;
    }
    if (change_type !== undefined) {
      updates.push(`change_type = $${paramIndex}`);
      values.push(change_type);
      paramIndex++;
    }
    if (change_points !== undefined) {
      updates.push(`change_points = $${paramIndex}`);
      values.push(change_points);
      paramIndex++;
    }
    if (balance_after !== undefined) {
      updates.push(`balance_after = $${paramIndex}`);
      values.push(balance_after);
      paramIndex++;
    }
    if (related_type !== undefined) {
      updates.push(`related_type = $${paramIndex}`);
      values.push(related_type || null);
      paramIndex++;
    }
    if (related_id !== undefined) {
      updates.push(`related_id = $${paramIndex}`);
      values.push(related_id || null);
      paramIndex++;
    }
    if (remark !== undefined) {
      updates.push(`remark = $${paramIndex}`);
      values.push(remark || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有要更新的字段" },
        { status: 400 }
      );
    }

    values.push(points_txn_id);
    const updateQuery = `
      UPDATE points_transaction
      SET ${updates.join(", ")}
      WHERE points_txn_id = $${paramIndex}
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
    console.error("[points_transaction] 更新积分变动记录失败:", error);
    // 处理外键约束错误
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "会员或会员卡不存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除积分变动记录
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
        { success: false, error: "积分变动记录ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT points_txn_id FROM points_transaction WHERE points_txn_id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "积分变动记录不存在" },
        { status: 404 }
      );
    }

    // 删除记录
    const deleteQuery = `DELETE FROM points_transaction WHERE points_txn_id = $1 RETURNING *`;
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
    console.error("[points_transaction] 删除积分变动记录失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

