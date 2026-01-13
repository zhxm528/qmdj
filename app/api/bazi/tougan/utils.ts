import { query, transaction } from "@/lib/db";

/**
 * 透干计算结果
 */
export interface TouganResult {
  chart_id: string;
  pillar: "year" | "month" | "day" | "hour";
  sort_order: number;
  branch_code: string;
  hidden_stem: string;
  hidden_position: number;
  hidden_role: string;
  hidden_weight: number | null;
  is_tougan: boolean;
  tougan_pillars: Array<"year" | "month" | "day" | "hour"> | null;
  tougan_count: number;
  evidence_json?: any;
}

/**
 * 从数据库获取四柱数据
 */
async function getFourPillarsFromDB(
  chartId: string
): Promise<
  Array<{
    pillar: "year" | "month" | "day" | "hour";
    sort_order: number;
    stem: string;
    branch: string;
  }>
> {
  const rows = await query<{
    pillar: "year" | "month" | "day" | "hour";
    sort_order: number;
    stem: string;
    branch: string;
  }>(
    `SELECT pillar, sort_order, stem, branch
     FROM public.bazi_pillar_tbl
     WHERE chart_id = $1
     ORDER BY sort_order`,
    [chartId]
  );

  return rows;
}

/**
 * 从数据库获取地支藏干信息（兼容两种表结构）
 */
async function getBranchHiddenStemsFromDB(
  branches: string[]
): Promise<
  Record<
    string,
    Array<{
      hidden_stem: string;
      hidden_position: number;
      hidden_role: string;
      hidden_weight: number | null;
    }>
  >
> {
  const mapping: Record<
    string,
    Array<{
      hidden_stem: string;
      hidden_position: number;
      hidden_role: string;
      hidden_weight: number | null;
    }>
  > = {};

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
       WHERE branch_code = ANY($1)
       ORDER BY branch_code, weight DESC`,
      [branches]
    );

    if (rows && rows.length > 0) {
      // 转换hidden_level格式：主->主气，中->中气，余->余气
      const levelMap: Record<string, string> = {
        主: "主气",
        中: "中气",
        余: "余气",
      };

      // 根据hidden_level确定position（主=1，中=2，余=3）
      const positionMap: Record<string, number> = {
        主: 1,
        中: 2,
        余: 3,
      };

      rows.forEach((row) => {
        if (!mapping[row.branch_code]) {
          mapping[row.branch_code] = [];
        }
        mapping[row.branch_code].push({
          hidden_stem: row.hidden_stem_code,
          hidden_position: positionMap[row.hidden_level] || 1,
          hidden_role: levelMap[row.hidden_level] || row.hidden_level,
          hidden_weight: row.weight,
        });
      });

      return mapping;
    }
  } catch (error) {
  }

  // 兼容模式：使用12_cangganbiao.sql的表结构（stem_code, role, position）
  try {
    const rows = await query<{
      branch_code: string;
      stem_code: string;
      position: number;
      role: string; // 主气/中气/余气
      weight: number | null;
    }>(
      `SELECT branch_code, stem_code, position, role, weight
       FROM public.bazi_branch_hidden_stem_dict
       WHERE branch_code = ANY($1)
       ORDER BY branch_code, position`,
      [branches]
    );

    if (rows && rows.length > 0) {
      // 如果没有weight，根据role设置默认值
      const weightMap: Record<string, number> = {
        主气: 1.0,
        中气: 0.6,
        余气: 0.3,
      };

      rows.forEach((row) => {
        if (!mapping[row.branch_code]) {
          mapping[row.branch_code] = [];
        }
        mapping[row.branch_code].push({
          hidden_stem: row.stem_code,
          hidden_position: row.position,
          hidden_role: row.role,
          hidden_weight: row.weight || weightMap[row.role] || 1.0,
        });
      });

      return mapping;
    }
  } catch (error) {
    console.error("[tougan] 获取地支藏干信息失败:", error);
    throw error;
  }

  return mapping;
}

/**
 * 计算并保存透干表到数据库
 */
export async function calculateAndSaveTougan(
  chartId: string
): Promise<TouganResult[]> {
  return await transaction(async (client) => {

    // 1. 获取四柱数据
    const pillars = await getFourPillarsFromDB(chartId);
    if (pillars.length !== 4) {
      throw new Error(`四柱数据不完整，期望4条，实际${pillars.length}条`);
    }

    // 2. 收集四柱天干集合
    const fourStems = pillars.map((p) => p.stem);
    const stemSet = new Set(fourStems);

    // 3. 获取所有地支
    const allBranches = pillars.map((p) => p.branch);
    const uniqueBranches = Array.from(new Set(allBranches));

    // 4. 获取所有地支的藏干信息
    const branchHiddenStems = await getBranchHiddenStemsFromDB(uniqueBranches);

    // 5. 生成透干记录
    const results: TouganResult[] = [];

    for (const pillar of pillars) {
      const hiddenStems = branchHiddenStems[pillar.branch] || [];

      for (const hidden of hiddenStems) {
        // 判断是否透干
        const isTougan = stemSet.has(hidden.hidden_stem);

        // 找出透出在哪些柱位
        const touganPillars: Array<"year" | "month" | "day" | "hour"> = [];
        if (isTougan) {
          pillars.forEach((p) => {
            if (p.stem === hidden.hidden_stem) {
              touganPillars.push(p.pillar);
            }
          });
        }

        // 计算透出次数
        const touganCount = touganPillars.length;

        // 构建证据JSON
        const evidenceJson = {
          four_stems: fourStems,
          match_rule: isTougan
            ? `藏干${hidden.hidden_stem}在四柱天干中出现`
            : `藏干${hidden.hidden_stem}未在四柱天干中出现`,
          matched_pillars: touganPillars,
        };

        const result: TouganResult = {
          chart_id: chartId,
          pillar: pillar.pillar,
          sort_order: pillar.sort_order,
          branch_code: pillar.branch,
          hidden_stem: hidden.hidden_stem,
          hidden_position: hidden.hidden_position,
          hidden_role: hidden.hidden_role,
          hidden_weight: hidden.hidden_weight,
          is_tougan: isTougan,
          tougan_pillars: touganPillars.length > 0 ? touganPillars : null,
          tougan_count: touganCount,
          evidence_json: evidenceJson,
        };

        results.push(result);
      }
    }

    // 6. 删除旧的透干记录（如果存在）
    await client.query(
      `DELETE FROM public.bazi_tougan_result_tbl WHERE chart_id = $1`,
      [chartId]
    );

    // 7. 批量插入透干记录
    if (results.length > 0) {
      // 使用参数化查询，分批插入以避免参数过多
      const batchSize = 50;
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const result of batch) {
          placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}::public.bazi_pillar_enum[], $${paramIndex + 10}, $${paramIndex + 11})`
          );
          values.push(
            result.chart_id,
            result.pillar,
            result.sort_order,
            result.branch_code,
            result.hidden_stem,
            result.hidden_position,
            result.hidden_role,
            result.hidden_weight,
            result.is_tougan,
            result.tougan_pillars || null, // PostgreSQL数组，null或数组
            result.tougan_count,
            JSON.stringify(result.evidence_json)
          );
          paramIndex += 12;
        }

        const sql = `
          INSERT INTO public.bazi_tougan_result_tbl(
            chart_id, pillar, sort_order, branch_code, hidden_stem, hidden_position,
            hidden_role, hidden_weight, is_tougan, tougan_pillars, tougan_count, evidence_json
          )
          VALUES ${placeholders.join(",")}
        `;

        await client.query(sql, values);
      }
    }

    return results;
  });
}

/**
 * 从数据库获取透干表数据
 */
export async function getTouganFromDB(
  chartId: string,
  isTouganOnly?: boolean
): Promise<TouganResult[]> {
  let sql = `
    SELECT 
      chart_id,
      pillar,
      sort_order,
      branch_code,
      hidden_stem,
      hidden_position,
      hidden_role,
      hidden_weight,
      is_tougan,
      tougan_pillars,
      tougan_count,
      evidence_json
    FROM public.bazi_tougan_result_tbl
    WHERE chart_id = $1
  `;

  const params: any[] = [chartId];
  let paramIndex = 2;

  if (isTouganOnly) {
    sql += ` AND is_tougan = $${paramIndex}`;
    params.push(true);
    paramIndex++;
  }

  sql += ` ORDER BY sort_order, hidden_position`;

  const rows = await query<{
    chart_id: string;
    pillar: "year" | "month" | "day" | "hour";
    sort_order: number;
    branch_code: string;
    hidden_stem: string;
    hidden_position: number;
    hidden_role: string;
    hidden_weight: number | null;
    is_tougan: boolean;
    tougan_pillars: Array<"year" | "month" | "day" | "hour"> | null;
    tougan_count: number;
    evidence_json: any;
  }>(sql, params);

  return rows.map((row) => {
    // 确保 tougan_pillars 是数组类型（PostgreSQL 数组可能被解析为字符串）
    let touganPillars: Array<"year" | "month" | "day" | "hour"> | null = null;
    if (row.tougan_pillars) {
      if (Array.isArray(row.tougan_pillars)) {
        touganPillars = row.tougan_pillars;
      } else if (typeof row.tougan_pillars === 'string') {
        // 如果是字符串，尝试解析（PostgreSQL 数组格式：{year,month}）
        try {
          const strValue = String(row.tougan_pillars);
          const parsed = strValue
            .replace(/^{|}$/g, '')
            .split(',')
            .map((p: string) => {
              const trimmed = p.trim().replace(/"/g, '');
              return trimmed as "year" | "month" | "day" | "hour";
            })
            .filter((p): p is "year" | "month" | "day" | "hour" => 
              ['year', 'month', 'day', 'hour'].includes(p)
            );
          touganPillars = parsed.length > 0 ? parsed : null;
        } catch (e) {
          touganPillars = null;
        }
      }
    }

    return {
      chart_id: row.chart_id,
      pillar: row.pillar,
      sort_order: row.sort_order,
      branch_code: row.branch_code,
      hidden_stem: row.hidden_stem,
      hidden_position: row.hidden_position,
      hidden_role: row.hidden_role,
      hidden_weight: row.hidden_weight,
      is_tougan: row.is_tougan,
      tougan_pillars: touganPillars,
      tougan_count: row.tougan_count,
      evidence_json: row.evidence_json,
    };
  });
}
