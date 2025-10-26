import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "5");

    // TODO: 实现实际的数据库查询
    // 示例：返回最近的查询记录
    const history = Array.from({ length: limit }, (_, i) => ({
      id: i + 1,
      subject: `查询${i + 1}`,
      date: new Date().toISOString().split("T")[0],
      time: "12:00",
      createdAt: new Date().toISOString(),
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json(
      { error: "获取历史记录失败" },
      { status: 500 }
    );
  }
}

