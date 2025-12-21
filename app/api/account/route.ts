import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query, transaction } from "@/lib/db";

// 强制标记为动态路由，避免任何缓存行为
export const dynamic = 'force-dynamic';
export const revalidate = 0; // 可选：避免任何缓存行为

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    // 解析 session（简单策略）：优先当作 email 查询；若失败再尝试作为 ID
    const token = session.value?.trim();
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    let userRows:
      | Array<{
          id: number;
          email: string;
          name: string | null;
          role: string | null;
          avatar: string | null;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
          status: string | null;
          is_email_verified: boolean | null;
        }>
      | null = null;

    // 尝试按邮箱查询
    try {
      userRows = await query(
        `SELECT id,email,name,role,avatar,phone,address,created_at,updated_at,status,is_email_verified
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [token.toLowerCase()]
      );
    } catch {
      userRows = null;
    }

    // 若未命中，且 token 是数字，按 ID 查询
    if ((!userRows || userRows.length === 0) && /^\d+$/.test(token)) {
      userRows = await query(
        `SELECT id,email,name,role,avatar,phone,address,created_at,updated_at,status,is_email_verified
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [parseInt(token, 10)]
      );
    }

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const u = userRows[0];
    // 后台日志：打印用户关键信息
    try {
      console.log("[account] 获取用户信息:", {
        id: u.id,
        email: u.email,
        name: u.name,
        status: u.status,
        isEmailVerified: u.is_email_verified,
      });
    } catch {}
    
    // 查询会员信息
    let memberLevel = null;
    let cardExpiredAt: string | null = null;
    let memberRegisteredAt: string | null = null;
    const memberRows = await query<{
      member_id: number;
      level_id: number | null;
      registered_at: string;
    }>(
      `SELECT member_id, level_id, registered_at FROM member WHERE email = $1 LIMIT 1`,
      [u.email.toLowerCase()]
    );

    if (memberRows && memberRows.length > 0) {
      const member = memberRows[0];
      memberRegisteredAt = member.registered_at;
      
      // 查询主卡信息（包括card_id和expired_at）
      const cardRows = await query<{
        card_id: number;
        expired_at: string | null;
      }>(
        `SELECT card_id, expired_at FROM member_card WHERE member_id = $1 AND is_primary = TRUE LIMIT 1`,
        [member.member_id]
      );
      
      if (cardRows && cardRows.length > 0) {
        const card = cardRows[0];
        cardExpiredAt = card.expired_at;
        
        // 如果会员卡有效期为空，设置默认值
        if (!cardExpiredAt) {
          // 获取注册日期，如果为空则使用当天
          let registeredDate: Date;
          if (member.registered_at) {
            registeredDate = new Date(member.registered_at);
          } else {
            // 如果注册日期为空，使用用户表的创建日期，如果也为空则使用当天
            registeredDate = u.created_at ? new Date(u.created_at) : new Date();
          }
          
          // 计算注册日期后一个月
          const expiredDate = new Date(registeredDate);
          expiredDate.setMonth(expiredDate.getMonth() + 1);
          
          // 更新会员卡过期时间
          await query(
            `UPDATE member_card SET expired_at = $1 WHERE card_id = $2`,
            [expiredDate.toISOString(), card.card_id]
          );
          
          cardExpiredAt = expiredDate.toISOString();
        }
      }
      
      // 如果会员没有等级，设置默认的"白银会员"（银卡）等级
      if (!member.level_id) {
        // 获取"银卡"（SILVER）的level_id
        const silverLevelRows = await query<{ level_id: number }>(
          `SELECT level_id FROM membership_level WHERE level_code = 'SILVER' LIMIT 1`
        );
        
        if (silverLevelRows && silverLevelRows.length > 0) {
          const silverLevelId = silverLevelRows[0].level_id;
          
          // 更新会员等级
          await query(
            `UPDATE member SET level_id = $1, updated_at = NOW() WHERE member_id = $2`,
            [silverLevelId, member.member_id]
          );
          
          // 获取更新后的等级信息
          const levelRows = await query<{
            level_id: number;
            level_code: string;
            level_name: string;
          }>(
            `SELECT level_id, level_code, level_name FROM membership_level WHERE level_id = $1 LIMIT 1`,
            [silverLevelId]
          );
          
          if (levelRows && levelRows.length > 0) {
            memberLevel = {
              levelId: levelRows[0].level_id,
              levelCode: levelRows[0].level_code,
              levelName: levelRows[0].level_name,
            };
          }
        }
      } else {
        // 如果已有等级，获取等级信息
        const levelRows = await query<{
          level_id: number;
          level_code: string;
          level_name: string;
        }>(
          `SELECT level_id, level_code, level_name FROM membership_level WHERE level_id = $1 LIMIT 1`,
          [member.level_id]
        );
        
        if (levelRows && levelRows.length > 0) {
          memberLevel = {
            levelId: levelRows[0].level_id,
            levelCode: levelRows[0].level_code,
            levelName: levelRows[0].level_name,
          };
        }
      }
    }
    
    // 返回用户信息和会员等级
    return NextResponse.json({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      avatar: u.avatar,
      phone: u.phone,
      address: u.address,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      status: u.status,
      isEmailVerified: u.is_email_verified,
      memberLevel: memberLevel,
      cardExpiredAt: cardExpiredAt,
      memberRegisteredAt: memberRegisteredAt,
    });
  } catch (error) {
    console.error("Get account error:", error);
    return NextResponse.json(
      { error: "获取用户信息失败" },
      { status: 500 }
    );
  }
}
