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
    console.error("[member/member] 获取用户ID失败:", error);
    return null;
  }
}

interface MemberQueryParams {
  page?: number;
  pageSize?: number;
}

// GET：查询会员列表
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // 如果提供了 id 参数，查询单个会员
    const id = searchParams.get("id");
    if (id) {
      const memberQuery = `
        SELECT
          m.member_id,
          m.member_code,
          m.full_name,
          m.mobile,
          m.email,
          m.gender,
          m.birth_date,
          m.status,
          m.level_id,
          ml.level_name,
          ml.sale_price,
          ml.cost_price,
          m.total_points,
          m.available_points,
          m.remark,
          m.registered_at AT TIME ZONE 'UTC' AS registered_at,
          m.updated_at AT TIME ZONE 'UTC' AS updated_at
        FROM member m
        LEFT JOIN membership_level ml ON m.level_id = ml.level_id
        WHERE m.member_id = $1
      `;
      console.log("[member/member] 查询单个会员 SQL:", {
        query: memberQuery.trim(),
        params: [id],
      });
      const memberResult = await query(memberQuery, [id]);
      if (memberResult && memberResult.length > 0) {
        return NextResponse.json({
          success: true,
          data: memberResult[0],
        });
      } else {
        return NextResponse.json(
          { success: false, error: "会员不存在" },
          { status: 404 }
        );
      }
    }

    // 查询会员列表
    const params: MemberQueryParams = {
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
    const countQuery = `SELECT COUNT(*) as total FROM member`;
    console.log("[member/member] 查询会员总数 SQL:", {
      query: countQuery,
      params: [],
    });
    const countResult = await query(countQuery, []);
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据（包含会员等级名称及售价/成本价）
    // 注意：registered_at 和 updated_at 使用 AT TIME ZONE 'UTC' 返回 UTC 时间字符串，前端再按配置的时区转换展示
    let dataQuery = `
      SELECT
        m.member_id,
        m.member_code,
        m.full_name,
        m.mobile,
        m.email,
        m.gender,
        m.birth_date,
        m.status,
        m.level_id,
        ml.level_name,
        ml.sale_price,
        ml.cost_price,
        m.total_points,
        m.available_points,
        m.remark,
        m.registered_at AT TIME ZONE 'UTC' AS registered_at,
        m.updated_at AT TIME ZONE 'UTC' AS updated_at
      FROM member m
      LEFT JOIN membership_level ml ON m.level_id = ml.level_id
      ORDER BY m.registered_at DESC
    `;

    const values: any[] = [];
    if (limit !== null) {
      dataQuery += ` LIMIT $1 OFFSET $2`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $1`;
      values.push(offset);
    }

    console.log("[member/member] 查询会员列表 SQL:", {
      query: dataQuery.trim(),
      params: values,
    });
    const members = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: members,
      total,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error("[member/member] 查询会员列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增会员
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const {
      member_code,
      full_name,
      mobile,
      email,
      gender,
      birth_date,
      status,
      level_id,
      remark,
    } = body;

    const insertQuery = `
      INSERT INTO member (
        member_code,
        full_name,
        mobile,
        email,
        gender,
        birth_date,
        status,
        level_id,
        remark
      )
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 1), $8, $9)
      RETURNING
        member_id,
        member_code,
        full_name,
        mobile,
        email,
        gender,
        birth_date,
        status,
        level_id,
        total_points,
        available_points,
        remark,
        registered_at,
        updated_at
    `;

    const values = [
      member_code || null,
      full_name || null,
      mobile || null,
      email || null,
      gender || null,
      birth_date || null,
      status ?? null,
      level_id || null,
      remark || null,
    ];

    const result = await query(insertQuery, values);

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error("[member/member] 新增会员失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新会员
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { member_id, ...data } = body;

    if (!member_id) {
      return NextResponse.json(
        { success: false, error: "缺少 member_id" },
        { status: 400 }
      );
    }

    const allowedKeys = [
      "member_code",
      "full_name",
      "mobile",
      "email",
      "gender",
      "birth_date",
      "status",
      "level_id",
      "remark",
    ];

    const keys = Object.keys(data).filter(
      (key) => allowedKeys.includes(key) && data[key] !== undefined
    );

    if (keys.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有可更新的字段" },
        { status: 400 }
      );
    }

    const setClause = keys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");

    const values = keys.map((key) => data[key]);

    const updateQuery = `
      UPDATE member
      SET ${setClause}, updated_at = NOW()
      WHERE member_id = $${keys.length + 1}
      RETURNING
        member_id,
        member_code,
        full_name,
        mobile,
        email,
        gender,
        birth_date,
        status,
        level_id,
        total_points,
        available_points,
        remark,
        registered_at,
        updated_at
    `;

    const result = await query(updateQuery, [...values, member_id]);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "记录不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error("[member/member] 更新会员失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除会员
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
        { success: false, error: "缺少 id 参数" },
        { status: 400 }
      );
    }

    const result = await query(
      `DELETE FROM member WHERE member_id = $1 RETURNING member_id`,
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "记录不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error("[member/member] 删除会员失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

