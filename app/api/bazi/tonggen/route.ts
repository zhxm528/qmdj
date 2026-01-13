import { NextRequest, NextResponse } from "next/server";
import { calculateAndSaveTonggen, getTonggenFromDB } from "./utils";

/**
 * GET: 获取通根表数据
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    console.log("[tonggen] input ok:", Object.fromEntries(searchParams.entries()));
    const stemCode = searchParams.get("stem_code") || undefined;
    const branchCode = searchParams.get("branch_code") || undefined;

    const results = await getTonggenFromDB(stemCode, branchCode);
    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error("[tonggen] 获取通根表失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取通根表失败",
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 计算并保存通根表
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    console.log("[tonggen] input ok:", {});
    const results = await calculateAndSaveTonggen();
    return NextResponse.json({
      success: true,
      data: results,
      message: `成功计算并保存 ${results.length} 条通根记录`,
    });
  } catch (error: any) {
    console.error("[tonggen] 计算通根表失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "计算通根表失败",
      },
      { status: 500 }
    );
  }
}

