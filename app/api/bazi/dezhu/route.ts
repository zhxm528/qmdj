import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";


export interface DezhuDetail {
  chart_id: string;
  pillar: "year" | "month" | "day" | "hour";
  source_type: "stem" | "hidden_stem";
  stem: string;
  element: string;
  ten_god: string | null;
  support_type: "same_class" | "shengfu";
  hidden_rank: string | null;
  base_score: number;
  position_weight: number;
  hidden_weight: number;
  final_score: number;
  evidence_json: any;
}

export interface DezhuSummary {
  chart_id: string;
  same_class_score: number;
  shengfu_score: number;
  total_support_score: number;
  ruleset_id: string;
  evidence_json: any;
}

export interface DezhuResult {
  chart_id: string;
  details: DezhuDetail[];
  summary: DezhuSummary;
}

const DEFAULT_RULESET = {
  ruleset_id: "default",
  base_score_same_class: 1.0,
  base_score_shengfu: 1.0,
  stem_position_weights: {
    year: 1.0,
    month: 1.3,
    day: 0.0,
    hour: 1.1,
  },
  hidden_position_weights: {
    year: 0.8,
    month: 1.2,
    day: 1.0,
    hour: 0.9,
  },
  hidden_rank_weights: {
    main: 1.0,
    middle: 0.6,
    residual: 0.3,
    MAIN: 1.0,
    MID: 0.6,
    RES: 0.3,
    "主": 1.0,
    "中": 0.6,
    "余": 0.3,
  },
  include_day_stem: false,
};

const WUXING_SHENG: Record<string, string> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

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

async function getHiddenStemsFromDB(
  branches: string[]
): Promise<
  Record<
    string,
    Array<{
      stem: string;
      role: string;
    }>
  >
> {
  const rows = await query<{
    branch_code: string;
    stem_code: string;
    role: string;
  }>(
    `SELECT branch_code, stem_code, role
     FROM public.bazi_branch_hidden_stem_dict
     WHERE branch_code = ANY($1)
     ORDER BY branch_code, position`,
    [branches]
  );

  const mapping: Record<string, Array<{ stem: string; role: string }>> = {};

  rows.forEach((row) => {
    if (!mapping[row.branch_code]) {
      mapping[row.branch_code] = [];
    }
    mapping[row.branch_code].push({
      stem: row.stem_code,
      role: row.role,
    });
  });

  return mapping;
}

async function getHeavenlyStemElementMap(
  stems: string[]
): Promise<Record<string, string>> {
  if (stems.length === 0) {
    return {};
  }

  const rows = await query<{
    stem: string;
    wu_xing: string;
  }>(
    `SELECT stem, wu_xing
     FROM public.dict_heavenly_stem
     WHERE stem = ANY($1)`,
    [stems]
  );

  const mapping: Record<string, string> = {};
  rows.forEach((row) => {
    mapping[row.stem] = row.wu_xing;
  });

  return mapping;
}

async function getRulesetFromDB(rulesetId: string) {
  try {
    const rows = await query<{
      ruleset_id: string;
      base_score_same_class: number;
      base_score_shengfu: number;
      stem_position_weights: any;
      hidden_position_weights: any;
      hidden_rank_weights: any;
      include_day_stem: boolean;
    }>(
      `SELECT ruleset_id, base_score_same_class, base_score_shengfu,
              stem_position_weights, hidden_position_weights,
              hidden_rank_weights, include_day_stem
       FROM public.dict_support_ruleset
       WHERE ruleset_id = $1`,
      [rulesetId]
    );

    if (rows.length === 0) {
      console.log(`[dezhu] 规则集 ${rulesetId} 不存在，使用默认规则集`);
      return DEFAULT_RULESET;
    }

  const row = rows[0];
  return {
    ruleset_id: row.ruleset_id || DEFAULT_RULESET.ruleset_id,
    base_score_same_class:
      typeof row.base_score_same_class === "number"
        ? row.base_score_same_class
        : DEFAULT_RULESET.base_score_same_class,
    base_score_shengfu:
      typeof row.base_score_shengfu === "number"
        ? row.base_score_shengfu
        : DEFAULT_RULESET.base_score_shengfu,
    stem_position_weights: row.stem_position_weights || DEFAULT_RULESET.stem_position_weights,
    hidden_position_weights:
      row.hidden_position_weights || DEFAULT_RULESET.hidden_position_weights,
    hidden_rank_weights: row.hidden_rank_weights || DEFAULT_RULESET.hidden_rank_weights,
    include_day_stem:
      typeof row.include_day_stem === "boolean"
        ? row.include_day_stem
        : DEFAULT_RULESET.include_day_stem,
  };
  } catch (error: any) {
    // 如果表不存在或其他数据库错误，使用默认规则集
    console.warn(`[dezhu] 查询规则集失败（表可能不存在），使用默认规则集:`, error.message);
    return DEFAULT_RULESET;
  }
}

function normalizeHiddenRank(role: string | null): string | null {
  if (!role) return null;
  if (role === "主气" || role === "主" || role === "main") return "MAIN";
  if (role === "中气" || role === "中" || role === "middle") return "MID";
  if (role === "余气" || role === "余" || role === "residual") return "RES";
  return role;
}

function getHiddenRankWeight(
  hiddenRank: string | null,
  weights: Record<string, number>
): number {
  if (!hiddenRank) return 1.0;
  const direct = weights[hiddenRank];
  if (typeof direct === "number") {
    return direct;
  }
  return 1.0;
}

function getPositionWeight(
  pillar: "year" | "month" | "day" | "hour",
  weights: Record<string, number>
): number {
  const weight = weights[pillar];
  return typeof weight === "number" ? weight : 1.0;
}

function determineSupportTypeFromElement(
  dmElement: string,
  targetElement: string
): "same_class" | "shengfu" | null {
  if (dmElement === targetElement) {
    return "same_class";
  }
  if (WUXING_SHENG[targetElement] === dmElement) {
    return "shengfu";
  }
  return null;
}

function determineSupportTypeFromTenGod(
  tenGod: string
): "same_class" | "shengfu" | null {
  if (tenGod === "比肩" || tenGod === "劫财") {
    return "same_class";
  }
  if (tenGod === "正印" || tenGod === "偏印") {
    return "shengfu";
  }
  return null;
}

async function getTenshenDetailsFromDB(chartId: string) {
  const rows = await query<{
    pillar: "year" | "month" | "day" | "hour";
    item_type: "stem" | "hidden_stem";
    target_stem: string;
    target_element: string;
    source_branch: string | null;
    hidden_role: string | null;
    tenshen: string;
  }>(
    `SELECT pillar, item_type, target_stem, target_element,
            source_branch, hidden_role, tenshen
     FROM public.bazi_tenshen_detail_tbl
     WHERE chart_id = $1`,
    [chartId]
  );

  return rows;
}

export async function calculateAndSaveDezhu(
  chartId: string,
  rulesetId: string = "default"
): Promise<DezhuResult> {
  return await transaction(async (client) => {
    console.log(`[dezhu] 开始计算得助，chart_id: ${chartId}, ruleset_id: ${rulesetId}`);

    const ruleset = await getRulesetFromDB(rulesetId);

    const pillars = await getFourPillarsFromDB(chartId);
    if (pillars.length !== 4) {
      throw new Error(`四柱数据不完整，期望4条，实际${pillars.length}条`);
    }

    const dayPillar = pillars.find((pillar) => pillar.pillar === "day");
    if (!dayPillar) {
      throw new Error("无法找到日柱信息");
    }

    const details: DezhuDetail[] = [];

    const tenshenDetails = await getTenshenDetailsFromDB(chartId);
    if (tenshenDetails.length > 0) {
      console.log(`[dezhu] 使用十神明细计算得助，数量: ${tenshenDetails.length}`);

      for (const item of tenshenDetails) {
        if (!ruleset.include_day_stem && item.item_type === "stem" && item.pillar === "day") {
          continue;
        }

        const supportType = determineSupportTypeFromTenGod(item.tenshen);
        if (!supportType) {
          continue;
        }

        const baseScore =
          supportType === "same_class"
            ? ruleset.base_score_same_class
            : ruleset.base_score_shengfu;
        const positionWeight =
          item.item_type === "stem"
            ? getPositionWeight(item.pillar, ruleset.stem_position_weights)
            : getPositionWeight(item.pillar, ruleset.hidden_position_weights);
        const hiddenRank = normalizeHiddenRank(item.hidden_role);
        const hiddenWeight =
          item.item_type === "hidden_stem"
            ? getHiddenRankWeight(hiddenRank, ruleset.hidden_rank_weights)
            : 1.0;
        const finalScore = baseScore * positionWeight * hiddenWeight;

        details.push({
          chart_id: chartId,
          pillar: item.pillar,
          source_type: item.item_type,
          stem: item.target_stem,
          element: item.target_element,
          ten_god: item.tenshen,
          support_type: supportType,
          hidden_rank: hiddenRank,
          base_score: baseScore,
          position_weight: positionWeight,
          hidden_weight: hiddenWeight,
          final_score: finalScore,
          evidence_json: {
            ruleset_id: ruleset.ruleset_id,
            source: "tenshen",
            pillar: item.pillar,
            item_type: item.item_type,
            stem: item.target_stem,
            element: item.target_element,
            ten_god: item.tenshen,
            hidden_role: item.hidden_role,
            weights: {
              base_score: baseScore,
              position_weight: positionWeight,
              hidden_weight: hiddenWeight,
            },
          },
        });
      }
    } else {
      console.log("[dezhu] 未找到十神明细，使用五行关系计算得助");

      const stems = pillars.map((pillar) => pillar.stem);
      const branches = pillars.map((pillar) => pillar.branch);
      const hiddenStemsMap = await getHiddenStemsFromDB(branches);
      const hiddenStems = Object.values(hiddenStemsMap)
        .flat()
        .map((item) => item.stem);
      const allStems = Array.from(new Set([...stems, ...hiddenStems]));
      const stemElementMap = await getHeavenlyStemElementMap(allStems);
      const dayMasterElement = stemElementMap[dayPillar.stem];

      if (!dayMasterElement) {
        throw new Error("无法获取日主五行信息");
      }

      for (const pillar of pillars) {
        if (!ruleset.include_day_stem && pillar.pillar === "day") {
          continue;
        }
        const element = stemElementMap[pillar.stem];
        if (!element) continue;

        const supportType = determineSupportTypeFromElement(dayMasterElement, element);
        if (!supportType) continue;

        const baseScore =
          supportType === "same_class"
            ? ruleset.base_score_same_class
            : ruleset.base_score_shengfu;
        const positionWeight = getPositionWeight(pillar.pillar, ruleset.stem_position_weights);
        const finalScore = baseScore * positionWeight;

        details.push({
          chart_id: chartId,
          pillar: pillar.pillar,
          source_type: "stem",
          stem: pillar.stem,
          element,
          ten_god: null,
          support_type: supportType,
          hidden_rank: null,
          base_score: baseScore,
          position_weight: positionWeight,
          hidden_weight: 1.0,
          final_score: finalScore,
          evidence_json: {
            ruleset_id: ruleset.ruleset_id,
            source: "element_relation",
            pillar: pillar.pillar,
            stem: pillar.stem,
            element,
            day_master_element: dayMasterElement,
            weights: {
              base_score: baseScore,
              position_weight: positionWeight,
            },
          },
        });
      }

      for (const pillar of pillars) {
        const hiddenList = hiddenStemsMap[pillar.branch] || [];
        for (const hidden of hiddenList) {
          const element = stemElementMap[hidden.stem];
          if (!element) continue;

          const supportType = determineSupportTypeFromElement(dayMasterElement, element);
          if (!supportType) continue;

          const baseScore =
            supportType === "same_class"
              ? ruleset.base_score_same_class
              : ruleset.base_score_shengfu;
          const positionWeight = getPositionWeight(
            pillar.pillar,
            ruleset.hidden_position_weights
          );
          const hiddenRank = normalizeHiddenRank(hidden.role);
          const hiddenWeight = getHiddenRankWeight(hiddenRank, ruleset.hidden_rank_weights);
          const finalScore = baseScore * positionWeight * hiddenWeight;

          details.push({
            chart_id: chartId,
            pillar: pillar.pillar,
            source_type: "hidden_stem",
            stem: hidden.stem,
            element,
            ten_god: null,
            support_type: supportType,
            hidden_rank: hiddenRank,
            base_score: baseScore,
            position_weight: positionWeight,
            hidden_weight: hiddenWeight,
            final_score: finalScore,
            evidence_json: {
              ruleset_id: ruleset.ruleset_id,
              source: "element_relation",
              pillar: pillar.pillar,
              branch: pillar.branch,
              stem: hidden.stem,
              element,
              day_master_element: dayMasterElement,
              hidden_role: hidden.role,
              weights: {
                base_score: baseScore,
                position_weight: positionWeight,
                hidden_weight: hiddenWeight,
              },
            },
          });
        }
      }
    }

    const sameClassScore = details
      .filter((detail) => detail.support_type === "same_class")
      .reduce((sum, detail) => sum + detail.final_score, 0);
    const shengfuScore = details
      .filter((detail) => detail.support_type === "shengfu")
      .reduce((sum, detail) => sum + detail.final_score, 0);
    const totalSupportScore = sameClassScore + shengfuScore;

    const summary: DezhuSummary = {
      chart_id: chartId,
      same_class_score: sameClassScore,
      shengfu_score: shengfuScore,
      total_support_score: totalSupportScore,
      ruleset_id: ruleset.ruleset_id,
      evidence_json: {
        ruleset,
        detail_count: details.length,
      },
    };

    // 尝试保存到数据库，如果表不存在则跳过保存
    try {
      await client.query(`DELETE FROM public.bazi_support_detail_tbl WHERE chart_id = $1`, [
        chartId,
      ]);
      await client.query(`DELETE FROM public.bazi_support_summary_tbl WHERE chart_id = $1`, [
        chartId,
      ]);

      if (details.length > 0) {
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const detail of details) {
          placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, $${paramIndex + 13})`
          );
          values.push(
            detail.chart_id,
            detail.pillar,
            detail.source_type,
            detail.stem,
            detail.element,
            detail.ten_god,
            detail.support_type,
            detail.hidden_rank,
            detail.base_score,
            detail.position_weight,
            detail.hidden_weight,
            detail.final_score,
            JSON.stringify(detail.evidence_json),
            new Date()
          );
          paramIndex += 14;
        }

        await client.query(
          `INSERT INTO public.bazi_support_detail_tbl(
            chart_id, pillar, source_type, stem, element, ten_god,
            support_type, hidden_rank, base_score, position_weight,
            hidden_weight, final_score, evidence_json, created_at
          ) VALUES ${placeholders.join(",")}`,
          values
        );
      }

      await client.query(
        `INSERT INTO public.bazi_support_summary_tbl(
          chart_id, same_class_score, shengfu_score, total_support_score,
          ruleset_id, evidence_json, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          summary.chart_id,
          summary.same_class_score,
          summary.shengfu_score,
          summary.total_support_score,
          summary.ruleset_id,
          JSON.stringify(summary.evidence_json),
          new Date(),
        ]
      );

      console.log(`[dezhu] 成功保存 ${details.length} 条明细和 1 条汇总记录到数据库`);
    } catch (dbError: any) {
      // 如果表不存在，只记录警告，不抛出错误
      if (dbError.code === '42P01') {
        console.warn(`[dezhu] 数据库表不存在，跳过保存（表需要从 md/database/22_dezhu.sql 创建）:`, dbError.message);
      } else {
        // 其他数据库错误也记录但不中断流程
        console.warn(`[dezhu] 保存到数据库失败，但计算结果仍然返回:`, dbError.message);
      }
    }

    console.log(
      `[dezhu] 得助计算完成 same_class=${sameClassScore.toFixed(
        4
      )}, shengfu=${shengfuScore.toFixed(4)}, total=${totalSupportScore.toFixed(4)}`
    );

    return {
      chart_id: chartId,
      details,
      summary,
    };
  });
}

export async function getDezhuFromDB(chartId: string): Promise<DezhuResult | null> {
  try {
    const detailRows = await query<{
      chart_id: string;
      pillar: "year" | "month" | "day" | "hour";
      source_type: "stem" | "hidden_stem";
      stem: string;
      element: string;
      ten_god: string | null;
      support_type: "same_class" | "shengfu";
      hidden_rank: string | null;
      base_score: number;
      position_weight: number;
      hidden_weight: number;
      final_score: number;
      evidence_json: any;
    }>(
      `SELECT chart_id, pillar, source_type, stem, element, ten_god, support_type,
              hidden_rank, base_score, position_weight, hidden_weight, final_score, evidence_json
       FROM public.bazi_support_detail_tbl
       WHERE chart_id = $1
       ORDER BY pillar, source_type`,
      [chartId]
    );

    const summaryRows = await query<{
      chart_id: string;
      same_class_score: number;
      shengfu_score: number;
      total_support_score: number;
      ruleset_id: string;
      evidence_json: any;
    }>(
      `SELECT chart_id, same_class_score, shengfu_score, total_support_score,
              ruleset_id, evidence_json
       FROM public.bazi_support_summary_tbl
       WHERE chart_id = $1`,
      [chartId]
    );

    if (detailRows.length === 0 && summaryRows.length === 0) {
      return null;
    }

  const details: DezhuDetail[] = detailRows.map((row) => ({
    chart_id: row.chart_id,
    pillar: row.pillar,
    source_type: row.source_type,
    stem: row.stem,
    element: row.element,
    ten_god: row.ten_god,
    support_type: row.support_type,
    hidden_rank: row.hidden_rank,
    base_score: typeof row.base_score === "number" ? row.base_score : parseFloat(String(row.base_score)),
    position_weight:
      typeof row.position_weight === "number"
        ? row.position_weight
        : parseFloat(String(row.position_weight)),
    hidden_weight:
      typeof row.hidden_weight === "number"
        ? row.hidden_weight
        : parseFloat(String(row.hidden_weight)),
    final_score:
      typeof row.final_score === "number"
        ? row.final_score
        : parseFloat(String(row.final_score)),
    evidence_json: typeof row.evidence_json === "string" ? JSON.parse(row.evidence_json) : row.evidence_json,
  }));

  const summaryRow = summaryRows[0];
  const summary: DezhuSummary = summaryRow
    ? {
        chart_id: summaryRow.chart_id,
        same_class_score:
          typeof summaryRow.same_class_score === "number"
            ? summaryRow.same_class_score
            : parseFloat(String(summaryRow.same_class_score)),
        shengfu_score:
          typeof summaryRow.shengfu_score === "number"
            ? summaryRow.shengfu_score
            : parseFloat(String(summaryRow.shengfu_score)),
        total_support_score:
          typeof summaryRow.total_support_score === "number"
            ? summaryRow.total_support_score
            : parseFloat(String(summaryRow.total_support_score)),
        ruleset_id: summaryRow.ruleset_id,
        evidence_json:
          typeof summaryRow.evidence_json === "string"
            ? JSON.parse(summaryRow.evidence_json)
            : summaryRow.evidence_json,
      }
    : {
        chart_id: chartId,
        same_class_score: 0,
        shengfu_score: 0,
        total_support_score: 0,
        ruleset_id: "default",
        evidence_json: null,
      };

    return {
      chart_id: chartId,
      details,
      summary,
    };
  } catch (error: any) {
    // 如果表不存在，返回 null
    if (error.code === '42P01') {
      console.warn(`[dezhu] 数据库表不存在，无法获取数据:`, error.message);
      return null;
    }
    // 其他错误也返回 null
    console.warn(`[dezhu] 从数据库获取数据失败:`, error.message);
    return null;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const chartId = searchParams.get("chart_id");

    if (!chartId) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少 chart_id 参数",
        },
        { status: 400 }
      );
    }

    const result = await getDezhuFromDB(chartId);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "未找到得助结果",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[dezhu] 获取得助结果失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取得助结果失败",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { chart_id, ruleset_id = "default" } = body;

    if (!chart_id) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少 chart_id 参数",
        },
        { status: 400 }
      );
    }

    const result = await calculateAndSaveDezhu(chart_id, ruleset_id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[dezhu] 计算得助失败:", error);
    console.error("[dezhu] 错误堆栈:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "计算得助失败",
      },
      { status: 500 }
    );
  }
}
