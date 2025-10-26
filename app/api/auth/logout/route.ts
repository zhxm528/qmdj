import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session");

    return NextResponse.json({ message: "退出成功" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "退出失败" },
      { status: 500 }
    );
  }
}

