import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { transaction, query } from "@/lib/db";

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
    console.error("[issue_card] 获取用户ID失败:", error);
    return null;
  }
}

/**
 * 生成会员卡号
 * 格式：QM + yyyyMMddHHmmss + 4位随机数字
 */
function generateCardNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
  const random4 = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `QM${timestamp}${random4}`;
}

/**
 * 为用户执行发卡操作
 * 1. 检查是否存在对应的 member（通过 email）
 * 2. 如果不存在，创建 member、member_account 和 member_card（设置初始等级为 GOLD）
 * 3. 如果已存在，确保有主卡
 * 4. 执行发卡操作：设置 issued_at 为当天 00:00:00，expired_at 为发卡日期 + 3650 天 23:59:59
 */
async function issueCardForUser(email: string, userName: string): Promise<void> {
  await transaction(async (client) => {
    // 1. 检查是否存在对应的 member
    const memberCheck = await client.query(
      `SELECT member_id FROM member WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()]
    );

    let memberId: number;
    let cardId: number;

    if (memberCheck.rows && memberCheck.rows.length > 0) {
      // 会员已存在，获取 member_id
      memberId = memberCheck.rows[0].member_id;

      // 检查是否已有主卡
      const cardCheck = await client.query(
        `SELECT card_id FROM member_card WHERE member_id = $1 AND is_primary = TRUE LIMIT 1`,
        [memberId]
      );

      if (cardCheck.rows && cardCheck.rows.length > 0) {
        cardId = cardCheck.rows[0].card_id;
      } else {
        // 创建主卡
        let cardNo = generateCardNo();
        // 确保 card_no 唯一
        let cardExists = await client.query(
          `SELECT card_id FROM member_card WHERE card_no = $1 LIMIT 1`,
          [cardNo]
        );
        while (cardExists.rows && cardExists.rows.length > 0) {
          cardNo = generateCardNo();
          cardExists = await client.query(
            `SELECT card_id FROM member_card WHERE card_no = $1 LIMIT 1`,
            [cardNo]
          );
        }

        const cardResult = await client.query(
          `INSERT INTO member_card (card_no, member_id, is_primary, status, issued_at)
           VALUES ($1, $2, TRUE, 1, NOW())
           RETURNING card_id`,
          [cardNo, memberId]
        );
        cardId = cardResult.rows[0].card_id;
      }
    } else {
      // 2. 创建 member
      // 获取 GOLD 等级
      const levelResult = await client.query(
        `SELECT level_id, level_name FROM membership_level WHERE level_code = 'GOLD' LIMIT 1`
      );
      if (!levelResult.rows || levelResult.rows.length === 0) {
        throw new Error("未找到 GOLD 会员等级");
      }
      const initLevelId = levelResult.rows[0].level_id;

      // 生成会员编码
      const memberCode = email.split("@")[0];
      const memberResult = await client.query(
        `INSERT INTO member (
          member_code, email, full_name, status,
          level_id, total_points, available_points, registered_at, updated_at
        ) VALUES ($1, $2, $3, 1, $4, 200, 200, NOW(), NOW())
        RETURNING member_id`,
        [memberCode, email.toLowerCase(), userName, initLevelId]
      );
      memberId = memberResult.rows[0].member_id;

      // 3. 创建 member_account
      await client.query(
        `INSERT INTO member_account (member_id, balance, frozen_balance, updated_at)
         VALUES ($1, 0.00, 0.00, NOW())`,
        [memberId]
      );

      // 4. 创建 member_card
      let cardNo = generateCardNo();
      // 确保 card_no 唯一
      let cardExists = await client.query(
        `SELECT card_id FROM member_card WHERE card_no = $1 LIMIT 1`,
        [cardNo]
      );
      while (cardExists.rows && cardExists.rows.length > 0) {
        cardNo = generateCardNo();
        cardExists = await client.query(
          `SELECT card_id FROM member_card WHERE card_no = $1 LIMIT 1`,
          [cardNo]
        );
      }

      const cardResult = await client.query(
        `INSERT INTO member_card (card_no, member_id, is_primary, status, issued_at)
         VALUES ($1, $2, TRUE, 1, NOW())
         RETURNING card_id`,
        [cardNo, memberId]
      );
      cardId = cardResult.rows[0].card_id;
    }

    // 5. 执行发卡操作：设置 issued_at 和 expired_at
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // 发卡日期：当天 00:00:00
    const issuedAt = new Date(year, month - 1, day, 0, 0, 0, 0);
    // 有效日期：发卡日期 + 3650 天 23:59:59
    const expiredAt = new Date(year, month - 1, day + 3650, 23, 59, 59, 999);

    // 格式化日期为 PostgreSQL 可接受的格式 (YYYY-MM-DD HH:mm:ss)
    const formatDateTime = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const h = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      const s = String(date.getSeconds()).padStart(2, "0");
      return `${y}-${m}-${d} ${h}:${min}:${s}`;
    };

    const issuedAtStr = formatDateTime(issuedAt);
    const expiredAtStr = formatDateTime(expiredAt);

    // 更新会员卡的发卡日期和有效日期
    await client.query(
      `UPDATE member_card
       SET issued_at = $1, expired_at = $2
       WHERE card_id = $3`,
      [issuedAtStr, expiredAtStr, cardId]
    );

    console.log(`[issue_card] 发卡操作完成: member_id=${memberId}, card_id=${cardId}, issued_at=${issuedAtStr}, expired_at=${expiredAtStr}`);
  });
}

/**
 * POST /api/admin/system/users/issue_card
 * 为用户执行发卡操作
 */
export async function POST(request: NextRequest) {
  try {
    // 检查管理员权限
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, email, name } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数：userId 和 email" },
        { status: 400 }
      );
    }

    // 获取用户信息
    const userRows = await query<{ id: number; email: string; name: string | null }>(
      `SELECT id, email, name FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    const user = userRows[0] as { id: number; email: string; name: string | null };
    const userName = name || user.name || user.email.split("@")[0];

    // 执行发卡操作
    await issueCardForUser(user.email, userName);

    return NextResponse.json({
      success: true,
      message: "发卡操作成功",
    });
  } catch (error: any) {
    console.error("[issue_card] 发卡操作失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "发卡操作失败",
      },
      { status: 500 }
    );
  }
}
