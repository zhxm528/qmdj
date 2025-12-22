import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

// 强制标记为动态路由，避免任何缓存行为
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 使用 require 导入 bcryptjs（在 Next.js 中更可靠）
const bcrypt = require("bcryptjs");

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    // 解析 session（简单策略）：优先当作 email 查询；若失败再尝试作为 ID
    const token = session.value?.trim();
    if (!token) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const { password } = await request.json();

    // 验证必填项
    if (!password) {
      return NextResponse.json(
        { success: false, error: "密码为必填项" },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "密码长度至少为6位" },
        { status: 400 }
      );
    }

    // 查询用户
    let userRows:
      | Array<{
          id: number;
          email: string;
        }>
      | null = null;

    // 尝试按邮箱查询
    try {
      userRows = await query(
        `SELECT id, email FROM users WHERE email = $1 LIMIT 1`,
        [token.toLowerCase()]
      );
    } catch {
      userRows = null;
    }

    // 若未命中，且 token 是数字，按 ID 查询
    if ((!userRows || userRows.length === 0) && /^\d+$/.test(token)) {
      userRows = await query(
        `SELECT id, email FROM users WHERE id = $1 LIMIT 1`,
        [parseInt(token, 10)]
      );
    }

    if (!userRows || userRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    const user = userRows[0];

    // 加密新密码
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(password, saltRounds);

    // 更新密码
    await query(
      `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
      [hashedPassword, user.id]
    );

    console.log("[account/change-password] 密码修改成功:", {
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      message: "密码修改成功",
    });
  } catch (error: any) {
    console.error("[account/change-password] 修改密码失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "修改密码失败" },
      { status: 500 }
    );
  }
}
