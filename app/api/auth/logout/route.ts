import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session");

    // 清空 session 后重定向到首页
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "退出失败" },
      { status: 500 }
    );
  }
}

