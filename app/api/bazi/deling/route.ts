import { NextRequest, NextResponse } from "next/server";
import { calculateAndSaveDeling, getDelingFromDB } from "./utils";

/**
 * GET API: 获取得令结果
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    console.log("[deling] input ok:", Object.fromEntries(searchParams.entries()));
    const chartId = searchParams.get("chart_id");
    const rulesetId = searchParams.get("ruleset_id") || "default";

    if (!chartId) {
      return NextResponse.json(
        {
          success: false,
          error: "请提供 chart_id 参数",
        },
        { status: 400 }
      );
    }

    const result = await getDelingFromDB(chartId, rulesetId);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "未找到得令结果",
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[deling] GET API错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取得令结果失败",
      },
      { status: 500 }
    );
  }
}

/**
 * POST API: 计算并保存得令结果
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    console.log("[deling] input ok:", body);
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

    const result = await calculateAndSaveDeling(chart_id, ruleset_id);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[deling] POST API错误:", error);
    console.error("[deling] 错误堆栈:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "计算得令结果失败",
      },
      { status: 500 }
    );
  }
}

