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
    console.error("[member/membership_level] 获取用户ID失败:", error);
    return null;
  }
}

interface MembershipLevelQueryParams {
  page?: number;
  pageSize?: number;
}

// GET：查询会员等级列表
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params: MembershipLevelQueryParams = {
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
      `SELECT COUNT(*) as total FROM membership_level`,
      []
    );
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        level_id,
        level_code,
        level_name,
        min_points,
        max_points,
        discount_rate,
        created_at,
        updated_at
      FROM membership_level
      ORDER BY min_points ASC
    `;

    const values: any[] = [];
    if (limit !== null) {
      dataQuery += ` LIMIT $1 OFFSET $2`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $1`;
      values.push(offset);
    }

    const levels = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: levels,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[membership_level] 查询会员等级列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增会员等级
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { level_code, level_name, min_points, max_points, discount_rate } = body;

    // 验证必填字段
    if (!level_code) {
      return NextResponse.json(
        { success: false, error: "等级代码不能为空" },
        { status: 400 }
      );
    }

    if (!level_name) {
      return NextResponse.json(
        { success: false, error: "等级名称不能为空" },
        { status: 400 }
      );
    }

    if (min_points === undefined || min_points === null) {
      return NextResponse.json(
        { success: false, error: "最低积分不能为空" },
        { status: 400 }
      );
    }

    if (min_points < 0) {
      return NextResponse.json(
        { success: false, error: "最低积分不能小于0" },
        { status: 400 }
      );
    }

    if (max_points !== null && max_points !== undefined && max_points < 0) {
      return NextResponse.json(
        { success: false, error: "最高积分不能小于0" },
        { status: 400 }
      );
    }

    if (max_points !== null && max_points !== undefined && max_points < min_points) {
      return NextResponse.json(
        { success: false, error: "最高积分不能小于最低积分" },
        { status: 400 }
      );
    }

    if (discount_rate === undefined || discount_rate === null) {
      return NextResponse.json(
        { success: false, error: "折扣率不能为空" },
        { status: 400 }
      );
    }

    if (discount_rate < 0 || discount_rate > 1) {
      return NextResponse.json(
        { success: false, error: "折扣率必须在0-1之间" },
        { status: 400 }
      );
    }

    // 检查等级代码是否已存在
    const codeCheck = await query(
      `SELECT level_id FROM membership_level WHERE level_code = $1`,
      [level_code]
    );
    if (codeCheck && codeCheck.length > 0) {
      return NextResponse.json(
        { success: false, error: "等级代码已存在" },
        { status: 400 }
      );
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO membership_level (
        level_code,
        level_name,
        min_points,
        max_points,
        discount_rate
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      level_code,
      level_name,
      min_points,
      max_points || null,
      discount_rate,
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
    console.error("[membership_level] 创建会员等级失败:", error);
    // 处理唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "等级代码已存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新会员等级
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const {
      level_id,
      level_code,
      level_name,
      min_points,
      max_points,
      discount_rate,
    } = body;

    if (!level_id) {
      return NextResponse.json(
        { success: false, error: "会员等级ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT level_id FROM membership_level WHERE level_id = $1`,
      [level_id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "会员等级不存在" },
        { status: 404 }
      );
    }

    // 如果更新等级代码，检查是否与其他记录冲突
    if (level_code) {
      const codeCheck = await query(
        `SELECT level_id FROM membership_level WHERE level_code = $1 AND level_id != $2`,
        [level_code, level_id]
      );
      if (codeCheck && codeCheck.length > 0) {
        return NextResponse.json(
          { success: false, error: "等级代码已存在" },
          { status: 400 }
        );
      }
    }

    // 验证积分范围
    if (min_points !== undefined && min_points !== null && min_points < 0) {
      return NextResponse.json(
        { success: false, error: "最低积分不能小于0" },
        { status: 400 }
      );
    }

    if (max_points !== null && max_points !== undefined && max_points < 0) {
      return NextResponse.json(
        { success: false, error: "最高积分不能小于0" },
        { status: 400 }
      );
    }

    // 如果同时更新了 min_points 和 max_points，需要验证范围
    if (
      min_points !== undefined &&
      max_points !== null &&
      max_points !== undefined &&
      max_points < min_points
    ) {
      return NextResponse.json(
        { success: false, error: "最高积分不能小于最低积分" },
        { status: 400 }
      );
    }

    // 验证折扣率
    if (discount_rate !== undefined && discount_rate !== null) {
      if (discount_rate < 0 || discount_rate > 1) {
        return NextResponse.json(
          { success: false, error: "折扣率必须在0-1之间" },
          { status: 400 }
        );
      }
    }

    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (level_code !== undefined) {
      updates.push(`level_code = $${paramIndex}`);
      values.push(level_code);
      paramIndex++;
    }
    if (level_name !== undefined) {
      updates.push(`level_name = $${paramIndex}`);
      values.push(level_name);
      paramIndex++;
    }
    if (min_points !== undefined) {
      updates.push(`min_points = $${paramIndex}`);
      values.push(min_points);
      paramIndex++;
    }
    if (max_points !== undefined) {
      updates.push(`max_points = $${paramIndex}`);
      values.push(max_points || null);
      paramIndex++;
    }
    if (discount_rate !== undefined) {
      updates.push(`discount_rate = $${paramIndex}`);
      values.push(discount_rate);
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

    values.push(level_id);
    const updateQuery = `
      UPDATE membership_level
      SET ${updates.join(", ")}
      WHERE level_id = $${paramIndex}
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
    console.error("[membership_level] 更新会员等级失败:", error);
    // 处理唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "等级代码已存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除会员等级
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
        { success: false, error: "会员等级ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT level_id FROM membership_level WHERE level_id = $1`,
      [id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "会员等级不存在" },
        { status: 404 }
      );
    }

    // 检查是否有会员使用该等级
    const memberCheck = await query(
      `SELECT COUNT(*) as count FROM member WHERE level_id = $1`,
      [id]
    );
    const memberCount = parseInt(memberCheck[0]?.count || "0", 10);
    if (memberCount > 0) {
      return NextResponse.json(
        { success: false, error: `该等级正在被 ${memberCount} 个会员使用，无法删除` },
        { status: 400 }
      );
    }

    // 删除记录
    const deleteQuery = `DELETE FROM membership_level WHERE level_id = $1 RETURNING *`;
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
    console.error("[membership_level] 删除会员等级失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

