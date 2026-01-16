import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query, transaction } from "@/lib/db";
import { timezoneConfig } from "@/lib/config";

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

    // 查询数据（包含会员的 level_id 和等级名称）
    // 显示逻辑：先通过会员卡关联会员表获取会员等级ID，再关联会员等级表显示对应的名称
    let dataQuery = `
      SELECT
        mc.card_id,
        mc.card_no,
        mc.member_id,
        mc.is_primary,
        mc.status,
        mc.issued_at,
        mc.expired_at,
        mc.remark,
        m.level_id,
        ml.level_name
      FROM member_card mc
      -- 第一步：通过会员卡关联会员表，获取会员的等级ID
      LEFT JOIN member m ON mc.member_id = m.member_id
      -- 第二步：通过会员的等级ID关联会员等级表，获取等级名称
      LEFT JOIN membership_level ml ON m.level_id = ml.level_id
      ORDER BY mc.card_no DESC
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
    let { card_no, member_id, is_primary, status, expired_at, remark } = body;

    // 如果未提供卡号或卡号为空，则自动生成
    if (!card_no || card_no.trim() === "") {
      // 卡号规则：'QM' + yyyyMMddHHmmss + 4位随机数
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const dateStr = `${year}${month}${day}${hours}${minutes}${seconds}`;
      const randomNum = Math.floor(1000 + Math.random() * 9000); // 4位随机数（1000-9999）
      card_no = `QM${dateStr}${randomNum}`;
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

// PATCH：发卡操作（更新发卡日期和有效日期）
export async function PATCH(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { card_id, level_id } = body;

    if (!card_id) {
      return NextResponse.json(
        { success: false, error: "会员卡ID不能为空" },
        { status: 400 }
      );
    }

    // 检查会员卡是否存在，并获取会员ID
    const cardCheck = await query<{ card_id: number; member_id: number }>(
      `SELECT card_id, member_id FROM member_card WHERE card_id = $1`,
      [card_id]
    );
    if (!cardCheck || cardCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "会员卡不存在" },
        { status: 404 }
      );
    }
    const memberId = cardCheck[0].member_id;

    // 计算发卡日期（当前日期，时分秒为0）和有效日期（31天后）
    // 获取目标时区的当前日期（精确到天）
    const now = new Date();
    
    // 打印 now 的时间
    console.log("[member_card] 发卡操作 - 当前时间 (now):");
    console.log("  now (ISO):", now.toISOString());
    console.log("  now (本地时间):", now.toString());
    console.log("  now (时间戳):", now.getTime());
    
    // 获取服务器本地的当前日期（精确到天）
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() 返回 0-11，需要加1
    const day = now.getDate();
    
    // 构造目标时区当天的 00:00:00（不转换为 UTC，直接使用本地时间）
    const issuedAt = new Date(year, month - 1, day, 0, 0, 0, 0);
    
    // 有效日期：发卡日期 + 3650 天，时间设为 23:59:59
    const expiredAt = new Date(year, month - 1, day + 3650, 23, 59, 59, 999);

    // 格式化日期为 PostgreSQL 可接受的格式 (YYYY-MM-DD HH:mm:ss)
    const formatDateTime = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      const s = String(date.getSeconds()).padStart(2, '0');
      return `${y}-${m}-${d} ${h}:${min}:${s}`;
    };

    const issuedAtStr = formatDateTime(issuedAt);
    const expiredAtStr = formatDateTime(expiredAt);

    // 更新发卡日期和有效日期
    const updateQuery = `
      UPDATE member_card
      SET issued_at = $1, expired_at = $2
      WHERE card_id = $3
      RETURNING *
    `;
    
    // 打印 SQL 语句和参数
    console.log("[member_card] 发卡操作 - SQL 语句:");
    console.log("  SQL:", updateQuery);
    console.log("  参数:");
    console.log("    $1 (issued_at):", issuedAtStr);
    console.log("    $2 (expired_at):", expiredAtStr);
    console.log("    $3 (card_id):", card_id);
    console.log("  时区配置:", {
      timezone: timezoneConfig.timezone,
      utcOffset: timezoneConfig.utcOffset,
    });
    console.log("  服务器本地当前日期:", `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    console.log("  发卡日期 (服务器本地当天 00:00:00):", issuedAtStr);
    console.log("  有效日期 (发卡日期 + 3650 天 23:59:59):", expiredAtStr);
    console.log("  会员ID:", memberId);
    console.log("  会员等级ID:", level_id);

    // 使用事务更新会员卡和会员等级
    const result = await transaction(async (client) => {
      // 更新会员卡的发卡日期和有效日期
      const cardResult = await client.query(updateQuery, [
        issuedAtStr,
        expiredAtStr,
        card_id,
      ]);

      // 如果提供了 level_id，更新会员的等级
      if (level_id) {
        await client.query(
          `UPDATE member SET level_id = $1 WHERE member_id = $2`,
          [level_id, memberId]
        );
        console.log(`[member_card] 已更新会员等级: member_id=${memberId}, level_id=${level_id}`);
      }

      return cardResult;
    });

    // 处理返回结果（transaction 返回的是 QueryResult，需要访问 rows 属性）
    const resultRows = (result as any)?.rows || result;
    if (resultRows && resultRows.length > 0) {
      return NextResponse.json({
        success: true,
        data: resultRows[0],
        message: "发卡成功",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "发卡失败" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[member_card] 发卡失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "发卡失败" },
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
