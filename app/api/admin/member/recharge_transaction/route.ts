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
    console.error("[member/recharge_transaction] 获取用户ID失败:", error);
    return null;
  }
}

interface RechargeTransactionQueryParams {
  page?: number;
  pageSize?: number;
  member_id?: number;
  card_no?: string;
  payment_method?: string; // comma-separated values
  status?: string; // comma-separated values
}

// GET：查询充值记录列表
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params: RechargeTransactionQueryParams = {
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "10", 10),
      member_id: searchParams.get("member_id") ? parseInt(searchParams.get("member_id")!, 10) : undefined,
      card_no: searchParams.get("card_no") || undefined,
      payment_method: searchParams.get("payment_method") || undefined,
      status: searchParams.get("status") || undefined,
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

    // 构建 WHERE 条件
    const whereConditions: string[] = [];
    const queryValues: any[] = [];
    let paramIndex = 1;

    // 会员ID过滤
    if (params.member_id) {
      whereConditions.push(`rt.member_id = $${paramIndex}`);
      queryValues.push(params.member_id);
      paramIndex++;
    }

    // 会员卡号模糊查询
    if (params.card_no) {
      whereConditions.push(`mc.card_no ILIKE $${paramIndex}`);
      queryValues.push(`%${params.card_no}%`);
      paramIndex++;
    }

    // 支付方式多选过滤
    if (params.payment_method) {
      const paymentMethods = params.payment_method.split(",").filter(Boolean);
      if (paymentMethods.length > 0) {
        whereConditions.push(`rt.payment_method = ANY($${paramIndex})`);
        queryValues.push(paymentMethods);
        paramIndex++;
      }
    }

    // 状态多选过滤
    if (params.status) {
      const statuses = params.status.split(",").filter(Boolean).map(s => parseInt(s, 10));
      if (statuses.length > 0) {
        whereConditions.push(`rt.status = ANY($${paramIndex})`);
        queryValues.push(statuses);
        paramIndex++;
      }
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // 计算总数
    let countQuery = `SELECT COUNT(*) as total FROM recharge_transaction rt`;
    if (params.card_no) {
      countQuery += ` LEFT JOIN member_card mc ON rt.card_id = mc.card_id`;
    }
    countQuery += ` ${whereClause}`;

    const countResult = await query(countQuery, queryValues);
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        rt.recharge_id,
        rt.member_id,
        rt.card_id,
        rt.amount,
        rt.bonus_points,
        rt.payment_method,
        rt.status,
        rt.external_order_no,
        rt.operator_id,
        rt.remark,
        rt.created_at
      FROM recharge_transaction rt
    `;

    if (params.card_no) {
      dataQuery += ` LEFT JOIN member_card mc ON rt.card_id = mc.card_id`;
    }

    dataQuery += ` ${whereClause} ORDER BY rt.created_at DESC`;

    const dataValues = [...queryValues];
    if (limit !== null) {
      dataQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      dataValues.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $${paramIndex}`;
      dataValues.push(offset);
    }

    const transactions = await query(dataQuery, dataValues);

    return NextResponse.json({
      success: true,
      data: transactions,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[recharge_transaction] 查询充值记录列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增充值记录
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
      amount,
      bonus_points,
      payment_method,
      status,
      external_order_no,
      operator_id,
      remark,
    } = body;

    // 验证必填字段
    if (!member_id) {
      return NextResponse.json(
        { success: false, error: "会员ID不能为空" },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: "充值金额不能为空" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: "充值金额必须大于0" },
        { status: 400 }
      );
    }

    if (!payment_method) {
      return NextResponse.json(
        { success: false, error: "支付方式不能为空" },
        { status: 400 }
      );
    }

    if (bonus_points === undefined || bonus_points === null) {
      return NextResponse.json(
        { success: false, error: "赠送积分不能为空" },
        { status: 400 }
      );
    }

    if (bonus_points < 0) {
      return NextResponse.json(
        { success: false, error: "赠送积分不能小于0" },
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
      INSERT INTO recharge_transaction (
        member_id,
        card_id,
        amount,
        bonus_points,
        payment_method,
        status,
        external_order_no,
        operator_id,
        remark
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      member_id,
      card_id || null,
      amount,
      bonus_points || 0,
      payment_method,
      status ?? 1,
      external_order_no || null,
      operator_id || null,
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
    console.error("[recharge_transaction] 创建充值记录失败:", error);
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

// PUT：更新充值记录
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const {
      recharge_id,
      member_id,
      card_id,
      amount,
      bonus_points,
      payment_method,
      status,
      external_order_no,
      operator_id,
      remark,
    } = body;

    if (!recharge_id) {
      return NextResponse.json(
        { success: false, error: "充值记录ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT recharge_id FROM recharge_transaction WHERE recharge_id = $1`,
      [recharge_id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "充值记录不存在" },
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

    // 验证金额
    if (amount !== undefined && amount !== null) {
      if (amount <= 0) {
        return NextResponse.json(
          { success: false, error: "充值金额必须大于0" },
          { status: 400 }
        );
      }
    }

    if (bonus_points !== undefined && bonus_points !== null && bonus_points < 0) {
      return NextResponse.json(
        { success: false, error: "赠送积分不能小于0" },
        { status: 400 }
      );
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
    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      values.push(amount);
      paramIndex++;
    }
    if (bonus_points !== undefined) {
      updates.push(`bonus_points = $${paramIndex}`);
      values.push(bonus_points);
      paramIndex++;
    }
    if (payment_method !== undefined) {
      updates.push(`payment_method = $${paramIndex}`);
      values.push(payment_method);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (external_order_no !== undefined) {
      updates.push(`external_order_no = $${paramIndex}`);
      values.push(external_order_no || null);
      paramIndex++;
    }
    if (operator_id !== undefined) {
      updates.push(`operator_id = $${paramIndex}`);
      values.push(operator_id || null);
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

    values.push(recharge_id);
    const updateQuery = `
      UPDATE recharge_transaction
      SET ${updates.join(", ")}
      WHERE recharge_id = $${paramIndex}
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
    console.error("[recharge_transaction] 更新充值记录失败:", error);
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

// DELETE：删除充值记录
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
        { success: false, error: "充值记录ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT recharge_id FROM recharge_transaction WHERE recharge_id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "充值记录不存在" },
        { status: 404 }
      );
    }

    // 删除记录
    const deleteQuery = `DELETE FROM recharge_transaction WHERE recharge_id = $1 RETURNING *`;
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
    console.error("[recharge_transaction] 删除充值记录失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

