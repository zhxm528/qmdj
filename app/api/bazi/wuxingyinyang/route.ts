import { NextRequest, NextResponse } from "next/server";

/**
 * 天干五行阴阳表API
 * 返回天干五行阴阳映射表
 */

interface WuxingyinyangRequest {
  gans?: string[]; // 可选：指定要查询的天干列表，如不提供则返回完整映射表
}

interface WuxingyinyangResponse {
  success: boolean;
  mapping?: Record<string, { yin_yang: string; wu_xing: string }>; // 完整的天干五行阴阳映射表
  result?: Record<string, { yin_yang: string; wu_xing: string }>; // 如果提供了gans，则返回对应的结果
  error?: string;
}

// 天干五行阴阳表（固定字典）
const GAN_META: Record<string, { yin_yang: string; wu_xing: string }> = {
  甲: { yin_yang: "阳", wu_xing: "木" },
  乙: { yin_yang: "阴", wu_xing: "木" },
  丙: { yin_yang: "阳", wu_xing: "火" },
  丁: { yin_yang: "阴", wu_xing: "火" },
  戊: { yin_yang: "阳", wu_xing: "土" },
  己: { yin_yang: "阴", wu_xing: "土" },
  庚: { yin_yang: "阳", wu_xing: "金" },
  辛: { yin_yang: "阴", wu_xing: "金" },
  壬: { yin_yang: "阳", wu_xing: "水" },
  癸: { yin_yang: "阴", wu_xing: "水" },
};

export async function GET() {
  // GET请求：返回完整的天干五行阴阳映射表
  return NextResponse.json({
    success: true,
    mapping: GAN_META,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse<WuxingyinyangResponse>> {
  try {
    const body = (await req.json()) as WuxingyinyangRequest;
    const { gans } = body;

    // 如果没有提供gans，返回完整映射表
    if (!gans || gans.length === 0) {
      return NextResponse.json({
        success: true,
        mapping: GAN_META,
      });
    }

    // 如果提供了gans，返回对应的结果
    const result: Record<string, { yin_yang: string; wu_xing: string }> = {};
    gans.forEach((gan) => {
      if (GAN_META[gan]) {
        result[gan] = GAN_META[gan];
      }
    });

    return NextResponse.json({
      success: true,
      mapping: GAN_META, // 也返回完整映射表作为参考
      result, // 返回查询结果
    });
  } catch (error: any) {
    console.error("天干五行阴阳表API错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取天干五行阴阳表失败",
      },
      { status: 500 }
    );
  }
}

