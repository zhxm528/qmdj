import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * 天干五行阴阳表API
 * 返回天干五行阴阳映射表
 * 数据从数据库表 dict_heavenly_stem 读取
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

/**
 * 从数据库获取天干五行阴阳映射表
 * @param filterGans 可选：指定要查询的天干列表
 * @returns 天干五行阴阳映射表
 */
async function getGanMetaFromDB(
  filterGans?: string[]
): Promise<Record<string, { yin_yang: string; wu_xing: string }>> {
  let sql = `
    SELECT 
      stem,
      yin_yang,
      wu_xing
    FROM public.dict_heavenly_stem
  `;

  const params: any[] = [];

  // 如果提供了过滤条件，添加WHERE子句
  if (filterGans && filterGans.length > 0) {
    sql += ` WHERE stem = ANY($1)`;
    params.push(filterGans);
  }

  // 按显示顺序排序
  sql += ` ORDER BY display_order`;

  // 输出查询SQL和参数用于调试

  const rows = await query<{
    stem: string;
    yin_yang: string;
    wu_xing: string;
  }>(sql, params);

  // 输出原始查询结果

  // 将查询结果转换为 Record<string, { yin_yang: string; wu_xing: string }> 格式
  const mapping: Record<string, { yin_yang: string; wu_xing: string }> = {};

  rows.forEach((row) => {
    mapping[row.stem] = {
      yin_yang: row.yin_yang,
      wu_xing: row.wu_xing,
    };
  });

  // 输出转换后的映射结果

  return mapping;
}

export async function GET() {
  try {
    console.log("[wuxingyinyang] input ok:", {});
    // GET请求：返回完整的天干五行阴阳映射表
    const mapping = await getGanMetaFromDB();
    return NextResponse.json({
      success: true,
      mapping,
    });
  } catch (error: any) {
    console.error("[天干五行阴阳表API] GET错误:", error);
    console.error("[天干五行阴阳表API] 错误堆栈:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取天干五行阴阳表失败",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<WuxingyinyangResponse>> {
  try {
    const body = (await req.json()) as WuxingyinyangRequest;
    console.log("[wuxingyinyang] input ok:", body);
    const { gans } = body;

    // 如果没有提供gans，返回完整映射表
    if (!gans || gans.length === 0) {
      const fullMapping = await getGanMetaFromDB();
      const response = {
        success: true,
        mapping: fullMapping,
      };
      console.log("[wuxingyinyang] response ok:", { success: true });
      return NextResponse.json(response);
    }

    // 如果提供了gans，只查询这些天干的数据
    const result = await getGanMetaFromDB(gans);

    // 同时获取完整映射表作为参考
    const fullMapping = await getGanMetaFromDB();

    const response = {
      success: true,
      mapping: fullMapping, // 也返回完整映射表作为参考
      result, // 返回查询结果
    };
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[天干五行阴阳表API] POST错误:", error);
    console.error("[天干五行阴阳表API] 错误堆栈:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取天干五行阴阳表失败",
      },
      { status: 500 }
    );
  }
}

