import { NextRequest, NextResponse } from "next/server";
import { calculateAndSaveTougan, getTouganFromDB } from "./utils";

/**
 * GET: 获取透干表数据
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    console.log("[tougan] input ok:", Object.fromEntries(searchParams.entries()));
    const chartId = searchParams.get("chart_id");

    if (!chartId) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少 chart_id 参数",
        },
        { status: 400 }
      );
    }

    const isTouganOnly = searchParams.get("is_tougan_only") === "true";

    const results = await getTouganFromDB(chartId, isTouganOnly);
    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error("[tougan] 获取透干表失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取透干表失败",
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 计算并保存透干表
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    console.log("[tougan] input ok:", body);
    const { chart_id } = body;

    if (!chart_id) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少 chart_id 参数",
        },
        { status: 400 }
      );
    }

    const results = await calculateAndSaveTougan(chart_id);
    return NextResponse.json({
      success: true,
      data: results,
      message: `成功计算并保存 ${results.length} 条透干记录`,
    });
  } catch (error: any) {
    console.error("[tougan] 计算透干表失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "计算透干表失败",
      },
      { status: 500 }
    );
  }
}

