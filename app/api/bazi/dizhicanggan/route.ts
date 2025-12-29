import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * 地支藏干表API
 * 返回地支藏干映射表，按"主气→中气→余气"顺序
 * 数据从数据库表 bazi_branch_hidden_stem_dict 读取
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

/**
 * 从数据库获取地支藏干映射表
 * @param filterBranches 可选：指定要查询的地支列表
 * @returns 地支藏干映射表，按"主气→中气→余气"顺序
 */
async function getBranchHiddenStemsFromDB(
  filterBranches?: string[]
): Promise<Record<string, string[]>> {
  let sql = `
    SELECT 
      branch_code,
      stem_code,
      position
    FROM public.bazi_branch_hidden_stem_dict
  `;

  const params: any[] = [];

  // 如果提供了过滤条件，添加WHERE子句
  if (filterBranches && filterBranches.length > 0) {
    sql += ` WHERE branch_code = ANY($1)`;
    params.push(filterBranches);
  }

  // 按地支和位置排序，确保主气→中气→余气的顺序
  sql += ` ORDER BY branch_code, position`;

  // 输出查询SQL和参数用于调试
  console.log("[地支藏干表] 查询SQL:", sql);
  console.log("[地支藏干表] 查询参数:", params);
  console.log("[地支藏干表] 过滤的地支:", filterBranches);

  const rows = await query<{
    branch_code: string;
    stem_code: string;
    position: number;
  }>(sql, params);

  // 输出原始查询结果
  console.log("[地支藏干表] 数据库查询结果行数:", rows.length);
  console.log("[地支藏干表] 数据库查询原始结果:", JSON.stringify(rows, null, 2));

  // 将查询结果转换为 Record<string, string[]> 格式
  const mapping: Record<string, string[]> = {};

  rows.forEach((row) => {
    if (!mapping[row.branch_code]) {
      mapping[row.branch_code] = [];
    }
    // 按position顺序添加，确保主气→中气→余气的顺序
    mapping[row.branch_code].push(row.stem_code);
  });

  // 输出转换后的映射结果
  console.log("[地支藏干表] 转换后的映射结果:", JSON.stringify(mapping, null, 2));

  return mapping;
}

export async function GET() {
  try {
    // GET请求：返回完整的地支藏干映射表
    const mapping = await getBranchHiddenStemsFromDB();

    return NextResponse.json({
      success: true,
      mapping,
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

export async function POST(req: NextRequest): Promise<NextResponse<DizhicangganResponse>> {
  try {
    const body = (await req.json()) as DizhicangganRequest;
    const { branches } = body;

    console.log("[地支藏干表API] POST请求收到:", JSON.stringify(body, null, 2));
    console.log("[地支藏干表API] 请求的地支列表:", branches);

    // 如果没有提供branches，返回完整映射表
    if (!branches || branches.length === 0) {
      console.log("[地支藏干表API] 未提供branches，返回完整映射表");
      const fullMapping = await getBranchHiddenStemsFromDB();
      const response = {
        success: true,
        mapping: fullMapping,
      };
      console.log("[地支藏干表API] 返回响应:", JSON.stringify(response, null, 2));
      return NextResponse.json(response);
    }

    // 如果提供了branches，只查询这些分支的数据
    console.log("[地支藏干表API] 查询指定的branches:", branches);
    const result = await getBranchHiddenStemsFromDB(branches);

    // 同时获取完整映射表作为参考
    const fullMapping = await getBranchHiddenStemsFromDB();

    const response = {
      success: true,
      mapping: fullMapping, // 也返回完整映射表作为参考
      result, // 返回查询结果
    };

    console.log("[地支藏干表API] 最终返回响应:", JSON.stringify(response, null, 2));
    console.log("[地支藏干表API] result字段内容:", JSON.stringify(result, null, 2));
    console.log("[地支藏干表API] result是否为空:", Object.keys(result).length === 0);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[地支藏干表API] 错误详情:", error);
    console.error("[地支藏干表API] 错误堆栈:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取地支藏干表失败",
      },
      { status: 500 }
    );
  }
}
