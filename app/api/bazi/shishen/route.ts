import { NextRequest, NextResponse } from "next/server";
import { calculateAndSaveShishen, ShishenRequest } from "./utils";

interface ShishenResponse {
  success: boolean;
  data?: {
    summary_id: number;
    details: Array<{
      pillar: string;
      item_type: "stem" | "hidden_stem";
      target_stem: string;
      target_element: string;
      target_yinyang: string;
      tenshen: string;
      rel_to_dm: string;
      same_yinyang: boolean;
      source_branch?: string;
      hidden_role?: string;
    }>;
  };
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ShishenResponse>> {
  try {
    const body = (await req.json()) as ShishenRequest;
    console.log("[shishen] input ok:", body);
    const { chart_id, four_pillars } = body;

    if (!chart_id || !four_pillars) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必要参数：chart_id 和 four_pillars",
        },
        { status: 400 }
      );
    }

    // 验证四柱格式
    const pillars = [four_pillars.year, four_pillars.month, four_pillars.day, four_pillars.hour];
    for (const pillar of pillars) {
      if (!pillar || pillar.length !== 2) {
        return NextResponse.json(
          {
            success: false,
            error: `四柱格式不正确：${pillar}，应为两个字符（天干+地支）`,
          },
          { status: 400 }
        );
      }
    }

    // 计算并保存十神
    const result = await calculateAndSaveShishen(chart_id, four_pillars);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[十神计算API] 错误:", error);
    console.error("[十神计算API] 错误堆栈:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "计算十神失败",
      },
      { status: 500 }
    );
  }
}

