import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { resendVerificationEmail } from "../resend_email";

// 强制标记为动态路由，避免任何缓存行为
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      // 检查是否为管理员
      if (user.role === "qmdj") {
        return user.id;
      }
    }
    return null;
  } catch (error) {
    console.error("[resend_email] 获取用户ID失败:", error);
    return null;
  }
}

/**
 * POST /api/admin/system/users/resend_email
 * 重发注册验证邮件
 */
export async function POST(request: NextRequest) {
  try {
    // 检查管理员权限
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "缺少用户ID参数" },
        { status: 400 }
      );
    }

    // 调用重发邮件函数
    const result = await resendVerificationEmail(userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || "验证邮件已重新发送",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "重发邮件失败",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[resend_email] 重发邮件失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "重发邮件失败",
      },
      { status: 500 }
    );
  }
}
