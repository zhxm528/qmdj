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
    console.error("[member/member_card] 获取用户ID失败:", error);
    return null;
  }
}

interface MemberCardQueryParams {
  page?: number;
  pageSize?: number;
}

// GET：查询会员卡列表
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params: MemberCardQueryParams = {
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
      `SELECT COUNT(*) as total FROM member_card`,
      []
    );
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        card_id,
        card_no,
        member_id,
        is_primary,
        status,
        issued_at,
        expired_at,
        remark
      FROM member_card
      ORDER BY issued_at DESC
    `;

    const values: any[] = [];
    if (limit !== null) {
      dataQuery += ` LIMIT $1 OFFSET $2`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $1`;
      values.push(offset);
    }

    const cards = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: cards,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[member_card] 查询会员卡列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增会员卡
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { card_no, member_id, is_primary, status, expired_at, remark } = body;

    // 验证必填字段
    if (!card_no) {
      return NextResponse.json(
        { success: false, error: "会员卡号不能为空" },
        { status: 400 }
      );
    }

    if (!member_id) {
      return NextResponse.json(
        { success: false, error: "会员ID不能为空" },
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

    // 检查卡号是否已存在
    const cardCheck = await query(
      `SELECT card_id FROM member_card WHERE card_no = $1`,
      [card_no]
    );
    if (cardCheck && cardCheck.length > 0) {
      return NextResponse.json(
        { success: false, error: "会员卡号已存在" },
        { status: 400 }
      );
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO member_card (
        card_no,
        member_id,
        is_primary,
        status,
        expired_at,
        remark
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      card_no,
      member_id,
      is_primary ?? true,
      status ?? 1,
      expired_at || null,
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
    console.error("[member_card] 创建会员卡失败:", error);
    // 处理唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "会员卡号已存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新会员卡
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const {
      card_id,
      card_no,
      member_id,
      is_primary,
      status,
      expired_at,
      remark,
    } = body;

    if (!card_id) {
      return NextResponse.json(
        { success: false, error: "会员卡ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT card_id FROM member_card WHERE card_id = $1`,
      [card_id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "会员卡不存在" },
        { status: 404 }
      );
    }

    // 如果更新卡号，检查是否与其他记录冲突
    if (card_no) {
      const cardCheck = await query(
        `SELECT card_id FROM member_card WHERE card_no = $1 AND card_id != $2`,
        [card_no, card_id]
      );
      if (cardCheck && cardCheck.length > 0) {
        return NextResponse.json(
          { success: false, error: "会员卡号已存在" },
          { status: 400 }
        );
      }
    }

    // 如果更新会员ID，检查会员是否存在
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

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (card_no !== undefined) {
      updates.push(`card_no = $${paramIndex}`);
      values.push(card_no);
      paramIndex++;
    }
    if (member_id !== undefined) {
      updates.push(`member_id = $${paramIndex}`);
      values.push(member_id);
      paramIndex++;
    }
    if (is_primary !== undefined) {
      updates.push(`is_primary = $${paramIndex}`);
      values.push(is_primary);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (expired_at !== undefined) {
      updates.push(`expired_at = $${paramIndex}`);
      values.push(expired_at || null);
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

    values.push(card_id);
    const updateQuery = `
      UPDATE member_card
      SET ${updates.join(", ")}
      WHERE card_id = $${paramIndex}
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
    console.error("[member_card] 更新会员卡失败:", error);
    // 处理唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "会员卡号已存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除会员卡
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
        { success: false, error: "会员卡ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT card_id FROM member_card WHERE card_id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "会员卡不存在" },
        { status: 404 }
      );
    }

    // 删除记录
    const deleteQuery = `DELETE FROM member_card WHERE card_id = $1 RETURNING *`;
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
    console.error("[member_card] 删除会员卡失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}
