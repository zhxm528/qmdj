import { NextRequest, NextResponse } from "next/server";

/**
 * 地支藏干表API
 * 返回地支藏干映射表，按"主气→中气→余气"顺序
 */

interface DizhicangganRequest {
  branches?: string[]; // 可选：指定要查询的地支列表，如不提供则返回完整映射表
}

interface DizhicangganResponse {
  success: boolean;
  mapping?: Record<string, string[]>; // 完整的地支藏干映射表
  result?: Record<string, string[]>; // 如果提供了branches，则返回对应的结果
  error?: string;
}

// 地支藏干表（按"主气→中气→余气"顺序）
const BRANCH_HIDDEN_STEMS: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "戊", "庚"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

export async function GET() {
  // GET请求：返回完整的地支藏干映射表
  return NextResponse.json({
    success: true,
    mapping: BRANCH_HIDDEN_STEMS,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse<DizhicangganResponse>> {
  try {
    const body = (await req.json()) as DizhicangganRequest;
    const { branches } = body;

    // 如果没有提供branches，返回完整映射表
    if (!branches || branches.length === 0) {
      return NextResponse.json({
        success: true,
        mapping: BRANCH_HIDDEN_STEMS,
      });
    }

    // 如果提供了branches，返回对应的结果
    const result: Record<string, string[]> = {};
    branches.forEach((branch) => {
      if (BRANCH_HIDDEN_STEMS[branch]) {
        result[branch] = BRANCH_HIDDEN_STEMS[branch];
      }
    });

    return NextResponse.json({
      success: true,
      mapping: BRANCH_HIDDEN_STEMS, // 也返回完整映射表作为参考
      result, // 返回查询结果
    });
  } catch (error: any) {
    console.error("地支藏干表API错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取地支藏干表失败",
      },
      { status: 500 }
    );
  }
}
