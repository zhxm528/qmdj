import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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

    // TODO: 从数据库获取用户信息
    // 示例：返回模拟用户数据
    return NextResponse.json({
      email: "user@example.com",
      id: "mock_user_id",
      createdAt: new Date().toISOString(),
      subscription: {
        plan: "免费版",
        status: "active",
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "获取用户信息失败" },
      { status: 500 }
    );
  }
}

