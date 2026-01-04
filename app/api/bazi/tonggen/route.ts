import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";

/**
 * 通根表计算结果
 */
export interface TonggenResult {
  stem_code: string;
  branch_code: string;
  root_from_hidden_stem_code: string;
  root_position: number; // 1=主气, 2=中气, 3=余气
  root_role: string; // 主气/中气/余气
  weight: number;
  is_same_stem: boolean;
  is_same_element: boolean;
  note?: string;
}

/**
 * 从数据库获取地支藏干信息（兼容两种表结构）
 */
async function getBranchHiddenStemsFromDB(): Promise<
  Array<{
    branch_code: string;
    hidden_stem_code: string;
    hidden_level: string; // 主/中/余
    weight: number;
  }>
> {
  // 尝试使用18_tonggen.sql的表结构（hidden_stem_code, hidden_level）
  try {
    const rows = await query<{
      branch_code: string;
      hidden_stem_code: string;
      hidden_level: string;
      weight: number;
    }>(
      `SELECT branch_code, hidden_stem_code, hidden_level, weight
       FROM public.bazi_branch_hidden_stem_dict
       ORDER BY branch_code, weight DESC`
    );

    if (rows && rows.length > 0) {
      return rows.map((row) => ({
        branch_code: row.branch_code,
        hidden_stem_code: row.hidden_stem_code,
        hidden_level: row.hidden_level,
        weight: row.weight,
      }));
    }
  } catch (error) {
    console.log("[tonggen] 尝试使用18_tonggen.sql表结构失败，尝试兼容模式");
  }

  // 兼容模式：使用12_cangganbiao.sql的表结构（stem_code, role）
  try {
    const rows = await query<{
      branch_code: string;
      stem_code: string;
      role: string; // 主气/中气/余气
      weight: number | null;
    }>(
      `SELECT branch_code, stem_code, role, weight
       FROM public.bazi_branch_hidden_stem_dict
       ORDER BY branch_code, position`
    );

    if (rows && rows.length > 0) {
      // 转换role格式：主气->主，中气->中，余气->余
      const roleMap: Record<string, string> = {
        主气: "主",
        中气: "中",
        余气: "余",
      };

      // 如果没有weight，根据role设置默认值
      const weightMap: Record<string, number> = {
        主气: 1.0,
        中气: 0.6,
        余气: 0.3,
      };

      return rows.map((row) => ({
        branch_code: row.branch_code,
        hidden_stem_code: row.stem_code,
        hidden_level: roleMap[row.role] || row.role,
        weight: row.weight || weightMap[row.role] || 1.0,
      }));
    }
  } catch (error) {
    console.error("[tonggen] 获取地支藏干信息失败:", error);
    throw error;
  }

  return [];
}

/**
 * 计算并保存通根表到数据库
 * 生成逻辑：对每个地支的每个藏干，生成一条"同干通根"记录
 */
export async function calculateAndSaveTonggen(): Promise<TonggenResult[]> {
  return await transaction(async (client) => {
    console.log("[tonggen] 开始计算通根表");

    // 1. 获取所有地支藏干信息
    const hiddenStems = await getBranchHiddenStemsFromDB();
    console.log(`[tonggen] 获取到 ${hiddenStems.length} 条藏干记录`);

    if (hiddenStems.length === 0) {
      console.warn("[tonggen] 未找到藏干数据，请先初始化地支藏干表");
      return [];
    }

    // 2. 清空现有通根表数据（可选，如果表已通过SQL初始化，可以跳过）
    // 这里我们使用 UPSERT 策略，避免重复插入
    console.log("[tonggen] 准备插入/更新通根表数据");

    // 3. 生成通根记录并批量插入
    const results: TonggenResult[] = [];

    for (const hidden of hiddenStems) {
      const stemCode = hidden.hidden_stem_code;
      const branchCode = hidden.branch_code;
      const rootLevel = hidden.hidden_level;
      const weight = hidden.weight;

      // 生成"同干通根"记录
      // 转换hidden_level为root_role和root_position
      const roleMap: Record<string, string> = {
        主: "主气",
        中: "中气",
        余: "余气",
      };
      const positionMap: Record<string, number> = {
        主: 1,
        中: 2,
        余: 3,
      };
      const rootRole = roleMap[rootLevel] || rootLevel;
      const rootPosition = positionMap[rootLevel] || 1;

      const result: TonggenResult = {
        stem_code: stemCode,
        branch_code: branchCode,
        root_from_hidden_stem_code: stemCode,
        root_position: rootPosition,
        root_role: rootRole,
        weight: weight,
        is_same_stem: true,
        is_same_element: false,
        note: "同干通根：地支藏干包含该天干",
      };

      results.push(result);
    }

    // 4. 批量插入（使用 ON CONFLICT 处理重复）
    if (results.length > 0) {
      // 使用参数化查询，分批插入以避免参数过多
      const batchSize = 100;
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const result of batch) {
          placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`
          );
          values.push(
            result.stem_code,
            result.branch_code,
            result.root_from_hidden_stem_code,
            result.root_position,
            result.root_role,
            result.weight,
            result.is_same_stem,
            result.is_same_element,
            result.note || "同干通根：地支藏干包含该天干"
          );
          paramIndex += 9;
        }

        const sql = `
          INSERT INTO public.bazi_stem_root_dict(
            stem_code, branch_code, root_from_hidden_stem_code, root_position, root_role, weight, 
            is_same_stem, is_same_element, note
          )
          VALUES ${placeholders.join(",")}
          ON CONFLICT (stem_code, branch_code, root_from_hidden_stem_code, is_same_stem, is_same_element)
          DO UPDATE SET
            root_position = EXCLUDED.root_position,
            root_role = EXCLUDED.root_role,
            weight = EXCLUDED.weight,
            note = EXCLUDED.note
        `;

        await client.query(sql, values);
      }
      console.log(`[tonggen] 成功插入/更新 ${results.length} 条通根记录`);
    }

    return results;
  });
}

/**
 * 从数据库获取通根表数据
 */
export async function getTonggenFromDB(
  stemCode?: string,
  branchCode?: string
): Promise<TonggenResult[]> {
  let sql = `
    SELECT 
      stem_code,
      branch_code,
      root_from_hidden_stem_code,
      root_position,
      root_role,
      weight,
      is_same_stem,
      is_same_element,
      note
    FROM public.bazi_stem_root_dict
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramIndex = 1;

  if (stemCode) {
    sql += ` AND stem_code = $${paramIndex}`;
    params.push(stemCode);
    paramIndex++;
  }

  if (branchCode) {
    sql += ` AND branch_code = $${paramIndex}`;
    params.push(branchCode);
    paramIndex++;
  }

  sql += ` ORDER BY branch_code, weight DESC, stem_code`;

  const rows = await query<{
    stem_code: string;
    branch_code: string;
    root_from_hidden_stem_code: string;
    root_position: number;
    root_role: string;
    weight: number;
    is_same_stem: boolean;
    is_same_element: boolean;
    note: string | null;
  }>(sql, params);

  return rows.map((row) => ({
    stem_code: row.stem_code,
    branch_code: row.branch_code,
    root_from_hidden_stem_code: row.root_from_hidden_stem_code,
    root_position: row.root_position,
    root_role: row.root_role,
    weight: row.weight,
    is_same_stem: row.is_same_stem,
    is_same_element: row.is_same_element,
    note: row.note || undefined,
  }));
}

/**
 * GET: 获取通根表数据
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
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

