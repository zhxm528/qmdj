import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

// 使用 require 导入 bcryptjs（与注册一致）
const bcrypt = require("bcryptjs");

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "邮箱和密码为必填项" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // 从数据库获取用户
    const rows = await query(
      `SELECT id, email, name, password, is_email_verified 
       FROM users 
       WHERE email = $1 
       LIMIT 1`,
      [normalizedEmail]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const user = rows[0] as {
      id: number;
      email: string;
      name: string | null;
      password: string;
      is_email_verified: boolean;
    };

    // 校验密码
    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 登录时检查会员卡有效期，过期超过24小时则降级为SILVER
    try {
      const memberRows = await query<{ member_id: number; level_id: number | null }>(
        `SELECT member_id, level_id FROM member WHERE email = $1 LIMIT 1`,
        [user.email.toLowerCase()]
      );
      if (memberRows && memberRows.length > 0) {
        const member = memberRows[0];
        const cardRows = await query<{ expired_at: string | null }>(
          `SELECT expired_at FROM member_card WHERE member_id = $1 AND is_primary = TRUE LIMIT 1`,
          [member.member_id]
        );
        const expiredAtStr = cardRows && cardRows.length > 0 ? cardRows[0].expired_at : null;
        if (expiredAtStr) {
          const expiredAt = new Date(expiredAtStr);
          if (!Number.isNaN(expiredAt.getTime())) {
            const now = new Date();
            const graceMs = 24 * 60 * 60 * 1000;
            if (now.getTime() > expiredAt.getTime() + graceMs) {
              const silverRows = await query<{ level_id: number }>(
                `SELECT level_id FROM membership_level WHERE level_code = 'SILVER' LIMIT 1`
              );
              if (silverRows && silverRows.length > 0) {
                const silverLevelId = silverRows[0].level_id;
                if (member.level_id !== silverLevelId) {
                  await query(
                    `UPDATE member SET level_id = $1, updated_at = NOW() WHERE member_id = $2`,
                    [silverLevelId, member.member_id]
                  );
                }
              }
            }
          }
        }
      }
    } catch (levelError) {
      console.error("[auth/login] 会员等级检查失败:", levelError);
    }

    // 生成 session（此处简单使用邮箱；与 /api/user/me 中的解析一致）
    const cookieStore = await cookies();
    // 会话级cookie：不设置 maxAge/expires，浏览器会话结束失效
    cookieStore.set("session", user.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as "lax",
      path: "/",
    });

    // 日志
    console.log("[auth/login] 用户登录成功:", {
      id: user.id,
      email: user.email,
      name: user.name,
      verified: user.is_email_verified,
    });

    return NextResponse.json({
      message: "登录成功",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.is_email_verified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "登录失败" },
      { status: 500 }
    );
  }
}

