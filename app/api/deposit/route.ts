import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query, transaction } from "@/lib/db";

/**
 * 获取当前用户信息（从session cookie）
 */
async function getCurrentUser(): Promise<{ id: number; email: string; name: string | null } | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session?.value) {
      return null;
    }

    const token = session.value.trim();
    // 尝试按邮箱查询
    const userRows = await query<{ id: number; email: string; name: string | null }>(
      `SELECT id, email, name FROM users WHERE email = $1 LIMIT 1`,
      [token.toLowerCase()]
    );

    if (userRows && userRows.length > 0) {
      return userRows[0];
    }

    // 若未命中且token是数字，按ID查询
    if (/^\d+$/.test(token)) {
      const userRowsById = await query<{ id: number; email: string; name: string | null }>(
        `SELECT id, email, name FROM users WHERE id = $1 LIMIT 1`,
        [parseInt(token, 10)]
      );
      if (userRowsById && userRowsById.length > 0) {
        return userRowsById[0];
      }
    }

    return null;
  } catch (error) {
    console.error("[deposit] 获取用户信息失败:", error);
    return null;
  }
}

/**
 * 根据用户邮箱查询会员信息
 */
async function getMemberByEmail(email: string) {
  const memberRows = await query<{
    member_id: number;
    member_code: string | null;
    full_name: string | null;
    mobile: string | null;
    email: string;
    gender: string | null;
    birth_date: string | null;
    status: number;
    level_id: number | null;
    total_points: number;
    available_points: number;
    remark: string | null;
    registered_at: string;
    updated_at: string;
  }>(
    `SELECT member_id, member_code, full_name, mobile, email, gender, birth_date, 
            status, level_id, total_points, available_points, remark, 
            registered_at, updated_at
     FROM member
     WHERE email = $1
     LIMIT 1`,
    [email.toLowerCase()]
  );

  return memberRows && memberRows.length > 0 ? memberRows[0] : null;
}

/**
 * 获取会员完整信息（包括账户、等级等）
 */
async function getMemberFullInfo(memberId: number) {
  // 获取会员基本信息
  const memberRows = await query<{
    member_id: number;
    member_code: string | null;
    full_name: string | null;
    mobile: string | null;
    email: string;
    gender: string | null;
    birth_date: string | null;
    status: number;
    level_id: number | null;
    total_points: number;
    available_points: number;
    remark: string | null;
    registered_at: string;
    updated_at: string;
  }>(
    `SELECT member_id, member_code, full_name, mobile, email, gender, birth_date, 
            status, level_id, total_points, available_points, remark, 
            registered_at, updated_at
     FROM member
     WHERE member_id = $1
     LIMIT 1`,
    [memberId]
  );

  if (!memberRows || memberRows.length === 0) {
    return null;
  }

  const member = memberRows[0];

  // 获取会员等级信息（如果有）
  let levelInfo = null;
  if (member.level_id) {
    const levelRows = await query<{
      level_id: number;
      level_code: string;
      level_name: string;
      min_points: number;
      max_points: number | null;
      discount_rate: string;
    }>(
      `SELECT level_id, level_code, level_name, min_points, max_points, discount_rate
       FROM membership_level
       WHERE level_id = $1
       LIMIT 1`,
      [member.level_id]
    );
    if (levelRows && levelRows.length > 0) {
      levelInfo = levelRows[0];
    }
  }

  return {
    member,
    level: levelInfo,
  };
}

/**
 * 获取充值记录（支持分页）
 */
async function getRechargeRecords(memberId: number, page: number = 1, pageSize: number = 10) {
  const offset = (page - 1) * pageSize;

  // 获取总数
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM recharge_transaction
     WHERE member_id = $1`,
    [memberId]
  );
  const total = parseInt(countResult[0]?.count || "0", 10);

  // 获取分页数据
  const records = await query<{
    recharge_id: number;
    member_id: number;
    card_id: number | null;
    amount: string;
    bonus_points: number;
    payment_method: string;
    status: number;
    external_order_no: string | null;
    operator_id: string | null;
    remark: string | null;
    created_at: string;
  }>(
    `SELECT recharge_id, member_id, card_id, amount, bonus_points, payment_method, 
            status, external_order_no, operator_id, remark, created_at
     FROM recharge_transaction
     WHERE member_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [memberId, pageSize, offset]
  );

  return {
    records: records || [],
    total,
    page,
    pageSize,
  };
}

/**
 * GET /api/deposit
 * 获取会员信息和充值记录
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    // 获取分页参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    // 查询会员信息
    const member = await getMemberByEmail(user.email);

    if (!member) {
      return NextResponse.json(
        { error: "会员不存在，请先注册会员" },
        { status: 404 }
      );
    }

    // 获取完整会员信息
    const fullInfo = await getMemberFullInfo(member.member_id);
    if (!fullInfo) {
      return NextResponse.json(
        { error: "获取会员信息失败" },
        { status: 500 }
      );
    }

    // 获取充值记录（支持分页）
    const rechargeData = await getRechargeRecords(member.member_id, page, pageSize);

    return NextResponse.json({
      success: true,
      data: {
        member: {
          memberId: fullInfo.member.member_id,
          memberCode: fullInfo.member.member_code,
          fullName: fullInfo.member.full_name,
          mobile: fullInfo.member.mobile,
          email: fullInfo.member.email,
          gender: fullInfo.member.gender,
          birthDate: fullInfo.member.birth_date,
          status: fullInfo.member.status,
          levelId: fullInfo.member.level_id,
          totalPoints: fullInfo.member.total_points,
          availablePoints: fullInfo.member.available_points,
          remark: fullInfo.member.remark,
          registeredAt: fullInfo.member.registered_at,
          updatedAt: fullInfo.member.updated_at,
        },
        level: fullInfo.level ? {
          levelId: fullInfo.level.level_id,
          levelCode: fullInfo.level.level_code,
          levelName: fullInfo.level.level_name,
          minPoints: fullInfo.level.min_points,
          maxPoints: fullInfo.level.max_points,
          discountRate: parseFloat(fullInfo.level.discount_rate),
        } : null,
        rechargeRecords: rechargeData.records.map(record => ({
          rechargeId: record.recharge_id,
          memberId: record.member_id,
          cardId: record.card_id,
          amount: parseFloat(record.amount),
          bonusPoints: record.bonus_points,
          paymentMethod: record.payment_method,
          status: record.status,
          externalOrderNo: record.external_order_no,
          operatorId: record.operator_id,
          remark: record.remark,
          createdAt: record.created_at,
        })),
        rechargePagination: {
          total: rechargeData.total,
          page: rechargeData.page,
          pageSize: rechargeData.pageSize,
        },
      },
    });
  } catch (error: any) {
    console.error("[deposit] 获取会员信息失败:", error);
    return NextResponse.json(
      { error: "获取会员信息失败: " + (error.message || "未知错误") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deposit
 * 提交充值
 */
export async function POST(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { amount } = body;

    // 验证金额
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "充值金额必须大于0" },
        { status: 400 }
      );
    }

    // 查询会员信息
    const member = await getMemberByEmail(user.email);

    if (!member) {
      return NextResponse.json(
        { error: "会员不存在，请先注册会员" },
        { status: 404 }
      );
    }

    // 提取 member_id 到局部变量
    const memberId = member.member_id;

    // 获取主卡
    const cardRows = await query<{ card_id: number }>(
      `SELECT card_id FROM member_card WHERE member_id = $1 AND is_primary = TRUE LIMIT 1`,
      [memberId]
    );
    const cardId = cardRows && cardRows.length > 0 ? cardRows[0].card_id : null;

    // 计算积分：1元 = 1积分
    const points = Math.floor(amount);

    // 执行充值事务
    const result = await transaction(async (client) => {
      // 1. 创建充值记录
      const rechargeResult = await client.query(
        `INSERT INTO recharge_transaction 
         (member_id, card_id, amount, bonus_points, payment_method, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 1, NOW())
         RETURNING recharge_id, member_id, card_id, amount, bonus_points, payment_method, status, created_at`,
        [memberId, cardId, amount, 0, "ONLINE"]
      );

      const recharge = rechargeResult.rows[0];

      // 2. 更新会员账户余额
      await client.query(
        `UPDATE member_account 
         SET balance = balance + $1, updated_at = NOW()
         WHERE member_id = $2`,
        [amount, memberId]
      );

      // 3. 更新会员积分
      await client.query(
        `UPDATE member 
         SET total_points = total_points + $1, 
             available_points = available_points + $1,
             updated_at = NOW()
         WHERE member_id = $2`,
        [points, memberId]
      );

      // 4. 获取更新后的积分余额
      const memberAfter = await client.query(
        `SELECT available_points FROM member WHERE member_id = $1`,
        [memberId]
      );
      const balanceAfter = memberAfter.rows[0].available_points;

      // 5. 创建积分交易记录
      await client.query(
        `INSERT INTO points_transaction 
         (member_id, card_id, change_type, change_points, balance_after, related_type, related_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          memberId,
          cardId,
          "EARN",
          points,
          balanceAfter,
          "RECHARGE",
          recharge.recharge_id,
        ]
      );

      return {
        recharge: {
          rechargeId: recharge.recharge_id,
          memberId: recharge.member_id,
          cardId: recharge.card_id,
          amount: parseFloat(recharge.amount),
          bonusPoints: recharge.bonus_points,
          paymentMethod: recharge.payment_method,
          status: recharge.status,
          createdAt: recharge.created_at,
        },
        pointsAdded: points,
      };
    });

    console.log(`[deposit] 充值成功: member_id=${memberId}, amount=${amount}, points=${points}`);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[deposit] 充值失败:", error);
    return NextResponse.json(
      { error: "充值失败: " + (error.message || "未知错误") },
      { status: 500 }
    );
  }
}
