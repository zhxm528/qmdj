import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

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
          membership_level: string | null;
          membership_no: string | null;
          is_paid: boolean | null;
          last_paid_at: string | null;
          status: string | null;
          is_email_verified: boolean | null;
        }>
      | null = null;

    // 尝试按邮箱查询
    try {
      userRows = await query(
        `SELECT id,email,name,role,avatar,phone,address,created_at,updated_at,
                membership_level,membership_no,is_paid,last_paid_at,status,is_email_verified
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
        `SELECT id,email,name,role,avatar,phone,address,created_at,updated_at,
                membership_level,membership_no,is_paid,last_paid_at,status,is_email_verified
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
      console.log("[user/me] 获取用户信息:", {
        id: u.id,
        email: u.email,
        name: u.name,
        status: u.status,
        isEmailVerified: u.is_email_verified,
      });
    } catch {}
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
      membership: {
        level: u.membership_level,
        no: u.membership_no,
        isPaid: u.is_paid,
        lastPaidAt: u.last_paid_at,
      },
      status: u.status,
      isEmailVerified: u.is_email_verified,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "获取用户信息失败" },
      { status: 500 }
    );
  }
}

