import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // 仅记录关键字段，避免日志过大
    const payload = {
      id: data?.id ?? null,
      email: data?.email ?? null,
      name: data?.name ?? null,
      time: new Date().toISOString(),
      source: "Layout",
    };
    console.log("[user-login] 用户登录信息:", payload);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[user-login] 日志记录失败:", error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}


