import { NextRequest, NextResponse } from "next/server";
import { calculateAndSaveRootqi, getRootQiFromDB } from "./utils";

/**
 * GET API: 获取根气结果
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    console.log("[rootqi] input ok:", Object.fromEntries(searchParams.entries()));
    const chartId = searchParams.get("chart_id");

    if (!chartId) {
      return NextResponse.json(
        {
          success: false,
          error: "请提供 chart_id 参数",
        },
        { status: 400 }
      );
    }

    const result = await getRootQiFromDB(chartId);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "未找到根气结果",
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[rootqi] GET API错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取根气结果失败",
      },
      { status: 500 }
    );
  }
}

/**
 * POST API: 计算并保存根气结果
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    console.log("[rootqi] input ok:", body);
    const { chart_id, ruleset_id = "default" } = body;

    if (!chart_id) {
      return NextResponse.json(
        {
          success: false,
          error: "请提供 chart_id 参数",
        },
        { status: 400 }
      );
    }

    const result = await calculateAndSaveRootqi(chart_id, ruleset_id);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[rootqi] POST API错误:", error);
    console.error("[rootqi] 错误堆栈:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "计算根气结果失败",
      },
      { status: 500 }
    );
  }
}

