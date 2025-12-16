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
    console.error("[member] 获取用户信息失败:", error);
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
 * 自动创建会员记录
 */
async function createMember(user: { id: number; email: string; name: string | null }) {
  return await transaction(async (client) => {
    // 1. 创建会员记录
    const memberResult = await client.query(
      `INSERT INTO member (email, full_name, status, total_points, available_points, registered_at, updated_at)
       VALUES ($1, $2, 1, 0, 0, NOW(), NOW())
       RETURNING member_id, member_code, full_name, mobile, email, gender, birth_date, 
                 status, level_id, total_points, available_points, remark, 
                 registered_at, updated_at`,
      [user.email.toLowerCase(), user.name || ""]
    );

    const member = memberResult.rows[0];

    // 2. 创建会员账户
    await client.query(
      `INSERT INTO member_account (member_id, balance, frozen_balance, updated_at)
       VALUES ($1, 0.00, 0.00, NOW())`,
      [member.member_id]
    );

    // 3. 创建会员卡（主卡）
    // 生成卡号：QM + yyyyMMddHHmmss + 4位随机数字
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
    const random4 = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const cardNo = `QM${timestamp}${random4}`;
    
    await client.query(
      `INSERT INTO member_card (card_no, member_id, is_primary, status, issued_at)
       VALUES ($1, $2, TRUE, 1, NOW())`,
      [cardNo, member.member_id]
    );

    return member;
  });
}

/**
 * 获取会员完整信息（包括账户、卡片等）
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

  // 获取会员账户信息
  const accountRows = await query<{
    member_id: number;
    balance: string;
    frozen_balance: string;
    updated_at: string;
  }>(
    `SELECT member_id, balance, frozen_balance, updated_at
     FROM member_account
     WHERE member_id = $1
     LIMIT 1`,
    [memberId]
  );

  // 获取会员卡信息
  const cardRows = await query<{
    card_id: number;
    card_no: string;
    member_id: number;
    is_primary: boolean;
    status: number;
    issued_at: string;
    expired_at: string | null;
    remark: string | null;
  }>(
    `SELECT card_id, card_no, member_id, is_primary, status, issued_at, expired_at, remark
     FROM member_card
     WHERE member_id = $1
     ORDER BY is_primary DESC, issued_at DESC`,
    [memberId]
  );

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
    account: accountRows && accountRows.length > 0 ? accountRows[0] : null,
    cards: cardRows || [],
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
 * 获取消费记录（支持分页）
 */
async function getConsumptionRecords(memberId: number, page: number = 1, pageSize: number = 10) {
  const offset = (page - 1) * pageSize;

  // 获取总数
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM consumption_transaction
     WHERE member_id = $1`,
    [memberId]
  );
  const total = parseInt(countResult[0]?.count || "0", 10);

  // 获取分页数据
  const records = await query<{
    consumption_id: number;
    member_id: number;
    card_id: number | null;
    original_amount: string;
    discount_amount: string;
    payable_amount: string;
    paid_amount: string;
    pay_channel: string;
    status: number;
    points_used: number;
    points_earned: number;
    external_order_no: string | null;
    remark: string | null;
    created_at: string;
  }>(
    `SELECT consumption_id, member_id, card_id, original_amount, discount_amount, 
            payable_amount, paid_amount, pay_channel, status, points_used, points_earned,
            external_order_no, remark, created_at
     FROM consumption_transaction
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
    const rechargePage = parseInt(searchParams.get("rechargePage") || searchParams.get("page") || "1", 10);
    const rechargePageSize = parseInt(searchParams.get("rechargePageSize") || searchParams.get("pageSize") || "10", 10);
    const consumptionPage = parseInt(searchParams.get("consumptionPage") || "1", 10);
    const consumptionPageSize = parseInt(searchParams.get("consumptionPageSize") || "10", 10);

    // 查询会员信息
    let member = await getMemberByEmail(user.email);

    // 如果用户还不是会员，自动创建
    if (!member) {
      try {
        member = await createMember(user);
        if (member) {
          console.log(`[member] 自动创建会员记录: member_id=${member.member_id}, email=${user.email}`);
        }
      } catch (error: any) {
        console.error("[member] 创建会员记录失败:", error);
        return NextResponse.json(
          { error: "创建会员记录失败: " + (error.message || "未知错误") },
          { status: 500 }
        );
      }
    }

    // 确保 member 不为 null
    if (!member) {
      return NextResponse.json(
        { error: "获取会员信息失败" },
        { status: 500 }
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
    const rechargeData = await getRechargeRecords(member.member_id, rechargePage, rechargePageSize);
    
    // 获取消费记录（支持分页）
    const consumptionData = await getConsumptionRecords(member.member_id, consumptionPage, consumptionPageSize);

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
        account: fullInfo.account ? {
          memberId: fullInfo.account.member_id,
          balance: parseFloat(fullInfo.account.balance),
          frozenBalance: parseFloat(fullInfo.account.frozen_balance),
          updatedAt: fullInfo.account.updated_at,
        } : null,
        cards: fullInfo.cards.map(card => ({
          cardId: card.card_id,
          cardNo: card.card_no,
          memberId: card.member_id,
          isPrimary: card.is_primary,
          status: card.status,
          issuedAt: card.issued_at,
          expiredAt: card.expired_at,
          remark: card.remark,
        })),
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
        consumptionRecords: consumptionData.records.map(record => ({
          consumptionId: record.consumption_id,
          memberId: record.member_id,
          cardId: record.card_id,
          originalAmount: parseFloat(record.original_amount),
          discountAmount: parseFloat(record.discount_amount),
          payableAmount: parseFloat(record.payable_amount),
          paidAmount: parseFloat(record.paid_amount),
          payChannel: record.pay_channel,
          status: record.status,
          pointsUsed: record.points_used,
          pointsEarned: record.points_earned,
          externalOrderNo: record.external_order_no,
          remark: record.remark,
          createdAt: record.created_at,
        })),
        consumptionPagination: {
          total: consumptionData.total,
          page: consumptionData.page,
          pageSize: consumptionData.pageSize,
        },
      },
    });
  } catch (error: any) {
    console.error("[member] 获取会员信息失败:", error);
    return NextResponse.json(
      { error: "获取会员信息失败: " + (error.message || "未知错误") },
      { status: 500 }
    );
  }
}

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
    let member = await getMemberByEmail(user.email);

    // 如果用户还不是会员，自动创建
    if (!member) {
      try {
        member = await createMember(user);
        if (member) {
          console.log(`[member] 自动创建会员记录: member_id=${member.member_id}, email=${user.email}`);
        }
      } catch (error: any) {
        console.error("[member] 创建会员记录失败:", error);
        return NextResponse.json(
          { error: "创建会员记录失败: " + (error.message || "未知错误") },
          { status: 500 }
        );
      }
    }

    // 确保 member 不为 null
    if (!member) {
      return NextResponse.json(
        { error: "获取会员信息失败" },
        { status: 500 }
      );
    }

    // 提取 member_id 到局部变量，避免闭包问题
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

    console.log(`[member] 充值成功: member_id=${memberId}, amount=${amount}, points=${points}`);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[member] 充值失败:", error);
    return NextResponse.json(
      { error: "充值失败: " + (error.message || "未知错误") },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { fullName, mobile, gender, birthDate } = body;

    // 查询会员信息
    let member = await getMemberByEmail(user.email);

    // 如果用户还不是会员，返回错误
    if (!member) {
      return NextResponse.json(
        { error: "会员不存在" },
        { status: 404 }
      );
    }

    // 验证手机号唯一性
    if (mobile !== undefined && mobile !== null && mobile.trim() !== "") {
      const trimmedMobile = mobile.trim();
      // 如果手机号与当前会员的不同，检查是否已被其他会员使用
      if (trimmedMobile !== member.mobile) {
        const existingMobile = await query<{ member_id: number }>(
          `SELECT member_id FROM member WHERE mobile = $1 AND member_id != $2 LIMIT 1`,
          [trimmedMobile, member.member_id]
        );
        if (existingMobile && existingMobile.length > 0) {
          return NextResponse.json(
            { error: "该手机号已被其他会员使用" },
            { status: 400 }
          );
        }
      }
    }

    // 验证姓名唯一性
    if (fullName !== undefined && fullName !== null && fullName.trim() !== "") {
      const trimmedFullName = fullName.trim();
      // 如果姓名与当前会员的不同，检查是否已被其他会员使用
      if (trimmedFullName !== member.full_name) {
        const existingFullName = await query<{ member_id: number }>(
          `SELECT member_id FROM member WHERE full_name = $1 AND member_id != $2 LIMIT 1`,
          [trimmedFullName, member.member_id]
        );
        if (existingFullName && existingFullName.length > 0) {
          return NextResponse.json(
            { error: "该姓名已被其他会员使用" },
            { status: 400 }
          );
        }
      }
    }

    // 构建更新字段
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramIndex}`);
      values.push(fullName && fullName.trim() !== "" ? fullName.trim() : null);
      paramIndex++;
    }

    if (mobile !== undefined) {
      updates.push(`mobile = $${paramIndex}`);
      values.push(mobile && mobile.trim() !== "" ? mobile.trim() : null);
      paramIndex++;
    }

    if (gender !== undefined) {
      updates.push(`gender = $${paramIndex}`);
      values.push(gender || null);
      paramIndex++;
    }

    if (birthDate !== undefined) {
      updates.push(`birth_date = $${paramIndex}`);
      values.push(birthDate || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "没有要更新的字段" },
        { status: 400 }
      );
    }

    // 添加 updated_at
    updates.push(`updated_at = NOW()`);

    // 执行更新
    const updateQuery = `
      UPDATE member
      SET ${updates.join(", ")}
      WHERE member_id = $${paramIndex}
      RETURNING member_id, member_code, full_name, mobile, email, gender, birth_date, 
                status, level_id, total_points, available_points, remark, 
                registered_at, updated_at
    `;

    values.push(member.member_id);
    const result = await query(updateQuery, values);

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "更新失败" },
        { status: 500 }
      );
    }

    const updatedMember = result[0];

    return NextResponse.json({
      success: true,
      data: {
        memberId: updatedMember.member_id,
        memberCode: updatedMember.member_code,
        fullName: updatedMember.full_name,
        mobile: updatedMember.mobile,
        email: updatedMember.email,
        gender: updatedMember.gender,
        birthDate: updatedMember.birth_date,
        status: updatedMember.status,
        levelId: updatedMember.level_id,
        totalPoints: updatedMember.total_points,
        availablePoints: updatedMember.available_points,
        remark: updatedMember.remark,
        registeredAt: updatedMember.registered_at,
        updatedAt: updatedMember.updated_at,
      },
    });
  } catch (error: any) {
    console.error("[member] 更新会员信息失败:", error);
    return NextResponse.json(
      { error: "更新会员信息失败: " + (error.message || "未知错误") },
      { status: 500 }
    );
  }
}
