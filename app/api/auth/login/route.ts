import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

// 使用 require 导入 bcryptjs（与注册一致）
const bcrypt = require("bcryptjs");

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json();

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

    // 生成 session（此处简单使用邮箱；与 /api/user/me 中的解析一致）
    const cookieStore = await cookies();
    // 记住我：持久化更久；未选中：会话级（不设置 maxAge，即浏览器会话结束失效）
    const baseCookie = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as "lax",
      path: "/",
    };
    if (rememberMe) {
      cookieStore.set("session", user.email, {
        ...baseCookie,
        // 记住我：30天
        maxAge: 60 * 60 * 24 * 30,
      });
    } else {
      // 会话cookie：不设置 maxAge/expires
      cookieStore.set("session", user.email, {
        ...baseCookie,
      });
    }

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
      rememberMe: !!rememberMe,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "登录失败" },
      { status: 500 }
    );
  }
}

