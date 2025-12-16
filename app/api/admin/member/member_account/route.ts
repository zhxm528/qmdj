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
    console.error("[member/member_account] 获取用户ID失败:", error);
    return null;
  }
}

interface MemberAccountQueryParams {
  page?: number;
  pageSize?: number;
}

// GET：查询会员账户列表
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // 如果提供了 member_id 参数，查询单个会员账户
    const memberId = searchParams.get("member_id");
    if (memberId) {
      const accountQuery = `
        SELECT
          ma.member_id,
          ma.balance,
          ma.frozen_balance,
          ma.updated_at AT TIME ZONE 'UTC' AS updated_at,
          m.full_name,
          m.mobile
        FROM member_account ma
        LEFT JOIN member m ON ma.member_id = m.member_id
        WHERE ma.member_id = $1
      `;
      console.log("[member_account] 查询单个会员账户 SQL:", {
        query: accountQuery.trim(),
        params: [memberId],
      });
      const accountResult = await query(accountQuery, [memberId]);
      if (accountResult && accountResult.length > 0) {
        return NextResponse.json({
          success: true,
          data: accountResult[0],
        });
      } else {
        return NextResponse.json(
          { success: false, error: "会员账户不存在" },
          { status: 404 }
        );
      }
    }

    // 查询会员账户列表
    const params: MemberAccountQueryParams = {
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
    const countQuery = `SELECT COUNT(*) as total FROM member_account`;
    console.log("[member_account] 查询总数 SQL:", {
      query: countQuery.trim(),
      params: [],
    });
    const countResult = await query(countQuery, []);
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        member_id,
        balance,
        frozen_balance,
        updated_at AT TIME ZONE 'UTC' AS updated_at
      FROM member_account
      ORDER BY updated_at DESC
    `;

    const values: any[] = [];
    if (limit !== null) {
      dataQuery += ` LIMIT $1 OFFSET $2`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $1`;
      values.push(offset);
    }

    console.log("[member_account] 查询会员账户列表 SQL:", {
      query: dataQuery.trim(),
      params: values,
    });
    const accounts = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: accounts,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[member_account] 查询会员账户列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：初始化会员账户
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { member_id, balance, frozen_balance } = body;

    // 验证必填字段
    if (!member_id) {
      return NextResponse.json(
        { success: false, error: "会员ID不能为空" },
        { status: 400 }
      );
    }

    if (balance === undefined || balance === null) {
      return NextResponse.json(
        { success: false, error: "可用余额不能为空" },
        { status: 400 }
      );
    }

    if (balance < 0) {
      return NextResponse.json(
        { success: false, error: "可用余额不能小于0" },
        { status: 400 }
      );
    }

    if (frozen_balance === undefined || frozen_balance === null) {
      return NextResponse.json(
        { success: false, error: "冻结余额不能为空" },
        { status: 400 }
      );
    }

    if (frozen_balance < 0) {
      return NextResponse.json(
        { success: false, error: "冻结余额不能小于0" },
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

    // 检查账户是否已存在
    const accountCheck = await query(
      `SELECT member_id FROM member_account WHERE member_id = $1`,
      [member_id]
    );
    if (accountCheck && accountCheck.length > 0) {
      return NextResponse.json(
        { success: false, error: "该会员账户已存在，请使用编辑功能" },
        { status: 400 }
      );
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO member_account (
        member_id,
        balance,
        frozen_balance
      ) VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      member_id,
      balance,
      frozen_balance || 0,
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
    console.error("[member_account] 创建会员账户失败:", error);
    // 处理主键冲突错误
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "该会员账户已存在" },
        { status: 400 }
      );
    }
    // 处理外键约束错误
    if (error.code === "23503") {
      return NextResponse.json(
        { success: false, error: "会员不存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新会员账户
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { member_id, balance, frozen_balance } = body;

    if (!member_id) {
      return NextResponse.json(
        { success: false, error: "会员ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT member_id FROM member_account WHERE member_id = $1`,
      [member_id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "会员账户不存在" },
        { status: 404 }
      );
    }

    // 验证余额
    if (balance !== undefined && balance !== null) {
      if (balance < 0) {
        return NextResponse.json(
          { success: false, error: "可用余额不能小于0" },
          { status: 400 }
        );
      }
    }

    if (frozen_balance !== undefined && frozen_balance !== null) {
      if (frozen_balance < 0) {
        return NextResponse.json(
          { success: false, error: "冻结余额不能小于0" },
          { status: 400 }
        );
      }
    }

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (balance !== undefined) {
      updates.push(`balance = $${paramIndex}`);
      values.push(balance);
      paramIndex++;
    }
    if (frozen_balance !== undefined) {
      updates.push(`frozen_balance = $${paramIndex}`);
      values.push(frozen_balance);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有要更新的字段" },
        { status: 400 }
      );
    }

    // 自动更新 updated_at
    updates.push(`updated_at = NOW()`);

    values.push(member_id);
    const updateQuery = `
      UPDATE member_account
      SET ${updates.join(", ")}
      WHERE member_id = $${paramIndex}
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
    console.error("[member_account] 更新会员账户失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除会员账户
export async function DELETE(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const member_id = searchParams.get("member_id");

    if (!member_id) {
      return NextResponse.json(
        { success: false, error: "会员ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT member_id FROM member_account WHERE member_id = $1`,
      [member_id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "会员账户不存在" },
        { status: 404 }
      );
    }

    // 检查是否有余额（建议保留账户，只清零余额）
    const accountInfo = await query(
      `SELECT balance, frozen_balance FROM member_account WHERE member_id = $1`,
      [member_id]
    );
    if (accountInfo && accountInfo.length > 0) {
      const account = accountInfo[0] as { balance: number; frozen_balance: number };
      const totalBalance = Number(account.balance) + Number(account.frozen_balance);
      if (totalBalance > 0) {
        return NextResponse.json(
          { success: false, error: `账户仍有余额 ¥${totalBalance.toFixed(2)}，请先清零后再删除` },
          { status: 400 }
        );
      }
    }

    // 删除记录
    const deleteQuery = `DELETE FROM member_account WHERE member_id = $1 RETURNING *`;
    const result = await query(deleteQuery, [member_id]);

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
    console.error("[member_account] 删除会员账户失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

