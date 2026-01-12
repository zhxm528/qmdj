import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";
import { getDelingFromDB } from "../deling/route";
import { getDayMasterElement } from "../rizhuwuxing/route";

/**
 * 根气明细记录
 */
export interface RootQiDetail {
  chart_id: string;
  target_pillar: "Y" | "M" | "D" | "H";
  target_stem: string;
  root_pillar: "Y" | "M" | "D" | "H";
  root_branch: string;
  hit_hidden_stem: string;
  hidden_rank: "MAIN" | "MID" | "RES";
  root_type: "SAME_STEM" | "SAME_ELEMENT" | "KU_GRAVE";
  w_hidden_rank: number;
  w_pillar_pos: number;
  w_season_element: number;
  root_score: number;
  is_root: boolean;
  evidence_json: any;
}

/**
 * 根气汇总记录
 */
export interface RootQiSummary {
  chart_id: string;
  target_pillar: "Y" | "M" | "D" | "H";
  target_stem: string;
  total_root_score: number;
  root_level: "NONE" | "WEAK" | "MEDIUM" | "STRONG" | "UNKNOWN";
  root_count: number;
  best_root_pillar: "Y" | "M" | "D" | "H" | null;
  best_root_branch: string | null;
  evidence_json: any;
}

/**
 * 根气计算结果
 */
export interface RootQiResult {
  chart_id: string;
  details: RootQiDetail[];
  summaries: RootQiSummary[];
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
 * 从数据库获取地支藏干字典
 */
async function getHiddenStemsFromDB(): Promise<
  Record<
    string,
    Array<{
      stem_code: string;
      position: number;
      role: string;
      weight: number | null;
    }>
  >
> {
  const rows = await query<{
    branch_code: string;
    stem_code: string;
    position: number;
    role: string;
    weight: number | null;
  }>(
    `SELECT branch_code, stem_code, position, role, weight
     FROM public.bazi_branch_hidden_stem_dict
     ORDER BY branch_code, position`,
    []
  );

  const mapping: Record<
    string,
    Array<{
      stem_code: string;
      position: number;
      role: string;
      weight: number | null;
    }>
  > = {};

  rows.forEach((row) => {
    if (!mapping[row.branch_code]) {
      mapping[row.branch_code] = [];
    }
    mapping[row.branch_code].push({
      stem_code: row.stem_code,
      position: row.position,
      role: row.role,
      weight: row.weight,
    });
  });

  return mapping;
}

/**
 * 从数据库获取天干五行映射
 */
async function getHeavenlyStemElement(): Promise<Record<string, string>> {
  const rows = await query<{
    stem: string;
    wu_xing: string;
  }>(
    `SELECT stem, wu_xing
     FROM public.dict_heavenly_stem`,
    []
  );

  const mapping: Record<string, string> = {};
  rows.forEach((row) => {
    mapping[row.stem] = row.wu_xing;
  });

  return mapping;
}

/**
 * 从数据库获取得令结果（用于获取季节元素状态）
 */
async function getDelingSnapshotFromDB(
  chartId: string,
  rulesetId: string = "default"
): Promise<Record<string, { state: string; score: number }>> {
  const rows = await query<{
    element: string;
    state: string;
    score: number;
  }>(
    `SELECT element, state, score
     FROM public.bazi_season_element_state_snapshot_tbl
     WHERE chart_id = $1 AND ruleset_id = $2`,
    [chartId, rulesetId]
  );

  const mapping: Record<string, { state: string; score: number }> = {};
  rows.forEach((row) => {
    mapping[row.element] = {
      state: row.state,
      score: typeof row.score === "number" ? row.score : parseFloat(String(row.score)),
    };
  });

  return mapping;
}

/**
 * 将柱位置转换为代码
 */
function pillarToCode(pillar: "year" | "month" | "day" | "hour"): "Y" | "M" | "D" | "H" {
  const map: Record<string, "Y" | "M" | "D" | "H"> = {
    year: "Y",
    month: "M",
    day: "D",
    hour: "H",
  };
  return map[pillar] || "Y";
}

/**
 * 将藏干角色转换为等级
 */
function roleToRank(role: string): "MAIN" | "MID" | "RES" {
  if (role === "主气") return "MAIN";
  if (role === "中气") return "MID";
  if (role === "余气") return "RES";
  return "MAIN"; // 默认
}

/**
 * 获取藏干层级权重
 */
function getHiddenRankWeight(rank: "MAIN" | "MID" | "RES"): number {
  const weights: Record<"MAIN" | "MID" | "RES", number> = {
    MAIN: 1.0,
    MID: 0.6,
    RES: 0.3,
  };
  return weights[rank];
}

/**
 * 获取支位权重
 */
function getPillarPositionWeight(pillar: "Y" | "M" | "D" | "H"): number {
  const weights: Record<"Y" | "M" | "D" | "H", number> = {
    M: 1.0, // 月支
    D: 0.8, // 日支
    H: 0.6, // 时支
    Y: 0.4, // 年支
  };
  return weights[pillar];
}

/**
 * 获取季节元素权重（旺相休囚死）
 */
function getSeasonElementWeight(state: string): number {
  const weights: Record<string, number> = {
    旺: 1.2,
    相: 1.0,
    休: 0.7,
    囚: 0.5,
    死: 0.3,
  };
  return weights[state] || 1.0; // 默认1.0
}

/**
 * 计算根气分数
 */
function calculateRootScore(
  hiddenRank: "MAIN" | "MID" | "RES",
  pillarPos: "Y" | "M" | "D" | "H",
  seasonState: string
): number {
  const wHiddenRank = getHiddenRankWeight(hiddenRank);
  const wPillarPos = getPillarPositionWeight(pillarPos);
  const wSeasonElement = getSeasonElementWeight(seasonState);

  return wHiddenRank * wPillarPos * wSeasonElement;
}

/**
 * 从数据库获取根气分级阈值
 */
async function getRootLevelThresholds(
  ruleSet: string = "DEFAULT"
): Promise<
  Array<{
    level_code: "NONE" | "WEAK" | "MEDIUM" | "STRONG";
    min_score: number;
    max_score: number;
  }>
> {
  const rows = await query<{
    level_code: "NONE" | "WEAK" | "MEDIUM" | "STRONG";
    min_score: number;
    max_score: number;
  }>(
    `SELECT level_code, min_score, max_score
     FROM public.bazi_root_qi_level_threshold_dict
     WHERE rule_set = $1 AND is_active = true
     ORDER BY level_order`,
    [ruleSet]
  );

  return rows.map((row) => ({
    level_code: row.level_code,
    min_score: typeof row.min_score === "number" ? row.min_score : parseFloat(String(row.min_score)),
    max_score: typeof row.max_score === "number" ? row.max_score : parseFloat(String(row.max_score)),
  }));
}

/**
 * 根据总分确定根气等级
 */
function determineRootLevel(
  totalScore: number,
  thresholds: Array<{
    level_code: "NONE" | "WEAK" | "MEDIUM" | "STRONG";
    min_score: number;
    max_score: number;
  }>
): "NONE" | "WEAK" | "MEDIUM" | "STRONG" | "UNKNOWN" {
  for (const threshold of thresholds) {
    if (totalScore >= threshold.min_score && totalScore < threshold.max_score) {
      return threshold.level_code;
    }
  }
  return "UNKNOWN";
}

/**
 * 计算并保存根气结果到数据库
 */
export async function calculateAndSaveRootqi(
  chartId: string,
  rulesetId: string = "default"
): Promise<RootQiResult> {
  return await transaction(async (client) => {

    // 1. 获取四柱数据
    const pillars = await getFourPillarsFromDB(chartId);
    if (pillars.length !== 4) {
      throw new Error(`四柱数据不完整，期望4条，实际${pillars.length}条`);
    }

    // 2. 获取地支藏干字典
    const hiddenStemsDict = await getHiddenStemsFromDB();

    // 3. 获取天干五行映射
    const stemElementMap = await getHeavenlyStemElement();

    // 4. 获取季节元素状态（得令快照）
    const seasonElementStates = await getDelingSnapshotFromDB(chartId, rulesetId);

    // 5. 获取根气分级阈值
    const thresholds = await getRootLevelThresholds("DEFAULT");

    // 6. Step 1 & 2: 找根并计算分数
    const details: RootQiDetail[] = [];

    // 遍历每个目标天干（年干/月干/日干/时干）
    for (const targetPillar of pillars) {
      const targetStem = targetPillar.stem;
      const targetPillarCode = pillarToCode(targetPillar.pillar);
      const targetElement = stemElementMap[targetStem];

      if (!targetElement) {
        continue;
      }

      // 遍历所有四个地支，查找根
      for (const rootPillar of pillars) {
        const rootBranch = rootPillar.branch;
        const rootPillarCode = pillarToCode(rootPillar.pillar);
        const hiddenStems = hiddenStemsDict[rootBranch];

        if (!hiddenStems || hiddenStems.length === 0) {
          continue;
        }

        // 检查该地支的每个藏干
        for (const hiddenStem of hiddenStems) {
          const hiddenStemCode = hiddenStem.stem_code;
          const hiddenElement = stemElementMap[hiddenStemCode];

          if (!hiddenElement) {
            continue;
          }

          // 判断是否找到根
          let rootType: "SAME_STEM" | "SAME_ELEMENT" | "KU_GRAVE" | null = null;

          // 同干根（最硬的根）
          if (hiddenStemCode === targetStem) {
            rootType = "SAME_STEM";
          }
          // 同气根（同五行）
          else if (hiddenElement === targetElement) {
            rootType = "SAME_ELEMENT";
          }

          if (rootType) {
            const hiddenRank = roleToRank(hiddenStem.role);

            // 获取季节元素状态（如果不存在，使用默认值）
            const elementState = seasonElementStates[targetElement];
            const seasonState = elementState?.state || "相"; // 默认相
            const seasonScore = elementState?.score || 0.5;

            // 计算权重
            const wHiddenRank = getHiddenRankWeight(hiddenRank);
            const wPillarPos = getPillarPositionWeight(rootPillarCode);
            const wSeasonElement = getSeasonElementWeight(seasonState);

            // 计算根气分数
            const rootScore = calculateRootScore(hiddenRank, rootPillarCode, seasonState);

            // 构建证据JSON
            const evidenceJson = {
              target_stem: targetStem,
              target_element: targetElement,
              root_branch: rootBranch,
              hidden_stem: hiddenStemCode,
              hidden_element: hiddenElement,
              hidden_role: hiddenStem.role,
              season_state: seasonState,
              season_score: seasonScore,
              weights: {
                hidden_rank: wHiddenRank,
                pillar_pos: wPillarPos,
                season_element: wSeasonElement,
              },
              root_type: rootType,
            };

            details.push({
              chart_id: chartId,
              target_pillar: targetPillarCode,
              target_stem: targetStem,
              root_pillar: rootPillarCode,
              root_branch: rootBranch,
              hit_hidden_stem: hiddenStemCode,
              hidden_rank: hiddenRank,
              root_type: rootType,
              w_hidden_rank: wHiddenRank,
              w_pillar_pos: wPillarPos,
              w_season_element: wSeasonElement,
              root_score: rootScore,
              is_root: true,
              evidence_json: evidenceJson,
            });
          }
        }
      }
    }

    // 7. Step 3: 汇总每个目标天干的根气
    const summaries: RootQiSummary[] = [];

    // 按目标天干分组
    const detailsByTarget: Record<string, RootQiDetail[]> = {};
    for (const detail of details) {
      const key = `${detail.target_pillar}_${detail.target_stem}`;
      if (!detailsByTarget[key]) {
        detailsByTarget[key] = [];
      }
      detailsByTarget[key].push(detail);
    }

    // 为每个目标天干生成汇总
    for (const [key, targetDetails] of Object.entries(detailsByTarget)) {
      const [targetPillar, targetStem] = key.split("_");
      const validDetails = targetDetails.filter((d) => d.is_root);

      // 计算总分
      const totalRootScore = validDetails.reduce((sum, d) => sum + d.root_score, 0);

      // 确定根气等级
      const rootLevel = determineRootLevel(totalRootScore, thresholds);

      // 找到最佳根（分数最高的）
      let bestRoot: RootQiDetail | null = null;
      if (validDetails.length > 0) {
        bestRoot = validDetails.reduce((best, current) =>
          current.root_score > best.root_score ? current : best
        );
      }

      // 构建汇总证据JSON
      const summaryEvidenceJson = {
        total_root_score: totalRootScore,
        root_level: rootLevel,
        root_count: validDetails.length,
        best_root: bestRoot
          ? {
              pillar: bestRoot.root_pillar,
              branch: bestRoot.root_branch,
              hidden_stem: bestRoot.hit_hidden_stem,
              score: bestRoot.root_score,
            }
          : null,
        thresholds: thresholds,
        details_count: validDetails.length,
      };

      summaries.push({
        chart_id: chartId,
        target_pillar: targetPillar as "Y" | "M" | "D" | "H",
        target_stem: targetStem,
        total_root_score: totalRootScore,
        root_level: rootLevel,
        root_count: validDetails.length,
        best_root_pillar: bestRoot ? bestRoot.root_pillar : null,
        best_root_branch: bestRoot ? bestRoot.root_branch : null,
        evidence_json: summaryEvidenceJson,
      });
    }

    // 8. 保存明细表
    if (details.length > 0) {
      // 先删除旧的明细记录
      await client.query(
        `DELETE FROM public.bazi_root_qi_detail_tbl WHERE chart_id = $1`,
        [chartId]
      );

      // 批量插入新记录
      const detailPlaceholders: string[] = [];
      const detailValues: any[] = [];
      let paramIndex = 1;

      for (const detail of details) {
        detailPlaceholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, $${paramIndex + 13})`
        );
        detailValues.push(
          chartId,
          detail.target_pillar,
          detail.target_stem,
          detail.root_pillar,
          detail.root_branch,
          detail.hit_hidden_stem,
          detail.hidden_rank,
          detail.root_type,
          detail.w_hidden_rank,
          detail.w_pillar_pos,
          detail.w_season_element,
          detail.root_score,
          detail.is_root,
          JSON.stringify(detail.evidence_json)
        );
        paramIndex += 14;
      }

      await client.query(
        `INSERT INTO public.bazi_root_qi_detail_tbl(
          chart_id, target_pillar, target_stem, root_pillar, root_branch,
          hit_hidden_stem, hidden_rank, root_type,
          w_hidden_rank, w_pillar_pos, w_season_element, root_score, is_root, evidence_json
        ) VALUES ${detailPlaceholders.join(",")}`,
        detailValues
      );
    }

    // 9. 保存汇总表
    if (summaries.length > 0) {
      for (const summary of summaries) {
        await client.query(
          `INSERT INTO public.bazi_root_qi_summary_tbl(
            chart_id, target_pillar, target_stem, total_root_score, root_level,
            root_count, best_root_pillar, best_root_branch, evidence_json
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (chart_id, target_pillar, target_stem) DO UPDATE SET
            total_root_score = EXCLUDED.total_root_score,
            root_level = EXCLUDED.root_level,
            root_count = EXCLUDED.root_count,
            best_root_pillar = EXCLUDED.best_root_pillar,
            best_root_branch = EXCLUDED.best_root_branch,
            evidence_json = EXCLUDED.evidence_json,
            created_at = NOW()`,
          [
            summary.chart_id,
            summary.target_pillar,
            summary.target_stem,
            summary.total_root_score,
            summary.root_level,
            summary.root_count,
            summary.best_root_pillar,
            summary.best_root_branch,
            JSON.stringify(summary.evidence_json),
          ]
        );
      }
    }

    // 10. 返回结果
    return {
      chart_id: chartId,
      details,
      summaries,
    };
  });
}

/**
 * 从数据库获取根气结果
 */
export async function getRootQiFromDB(
  chartId: string
): Promise<RootQiResult | null> {
  // 获取明细
  const detailRows = await query<{
    chart_id: string;
    target_pillar: string;
    target_stem: string;
    root_pillar: string;
    root_branch: string;
    hit_hidden_stem: string;
    hidden_rank: string;
    root_type: string;
    w_hidden_rank: number;
    w_pillar_pos: number;
    w_season_element: number;
    root_score: number;
    is_root: boolean;
    evidence_json: any;
  }>(
    `SELECT chart_id, target_pillar, target_stem, root_pillar, root_branch,
            hit_hidden_stem, hidden_rank, root_type,
            w_hidden_rank, w_pillar_pos, w_season_element, root_score, is_root, evidence_json
     FROM public.bazi_root_qi_detail_tbl
     WHERE chart_id = $1
     ORDER BY target_pillar, target_stem, root_score DESC`,
    [chartId]
  );

  // 获取汇总
  const summaryRows = await query<{
    chart_id: string;
    target_pillar: string;
    target_stem: string;
    total_root_score: number;
    root_level: string;
    root_count: number;
    best_root_pillar: string | null;
    best_root_branch: string | null;
    evidence_json: any;
  }>(
    `SELECT chart_id, target_pillar, target_stem, total_root_score, root_level,
            root_count, best_root_pillar, best_root_branch, evidence_json
     FROM public.bazi_root_qi_summary_tbl
     WHERE chart_id = $1
     ORDER BY target_pillar, target_stem`,
    [chartId]
  );

  if (detailRows.length === 0 && summaryRows.length === 0) {
    return null;
  }

  const details: RootQiDetail[] = detailRows.map((row) => ({
    chart_id: row.chart_id,
    target_pillar: row.target_pillar as "Y" | "M" | "D" | "H",
    target_stem: row.target_stem,
    root_pillar: row.root_pillar as "Y" | "M" | "D" | "H",
    root_branch: row.root_branch,
    hit_hidden_stem: row.hit_hidden_stem,
    hidden_rank: row.hidden_rank as "MAIN" | "MID" | "RES",
    root_type: row.root_type as "SAME_STEM" | "SAME_ELEMENT" | "KU_GRAVE",
    w_hidden_rank: typeof row.w_hidden_rank === "number" ? row.w_hidden_rank : parseFloat(String(row.w_hidden_rank)),
    w_pillar_pos: typeof row.w_pillar_pos === "number" ? row.w_pillar_pos : parseFloat(String(row.w_pillar_pos)),
    w_season_element: typeof row.w_season_element === "number" ? row.w_season_element : parseFloat(String(row.w_season_element)),
    root_score: typeof row.root_score === "number" ? row.root_score : parseFloat(String(row.root_score)),
    is_root: row.is_root,
    evidence_json: typeof row.evidence_json === "string" ? JSON.parse(row.evidence_json) : row.evidence_json,
  }));

  const summaries: RootQiSummary[] = summaryRows.map((row) => ({
    chart_id: row.chart_id,
    target_pillar: row.target_pillar as "Y" | "M" | "D" | "H",
    target_stem: row.target_stem,
    total_root_score: typeof row.total_root_score === "number" ? row.total_root_score : parseFloat(String(row.total_root_score)),
    root_level: row.root_level as "NONE" | "WEAK" | "MEDIUM" | "STRONG" | "UNKNOWN",
    root_count: row.root_count,
    best_root_pillar: row.best_root_pillar as "Y" | "M" | "D" | "H" | null,
    best_root_branch: row.best_root_branch,
    evidence_json: typeof row.evidence_json === "string" ? JSON.parse(row.evidence_json) : row.evidence_json,
  }));

  return {
    chart_id: chartId,
    details,
    summaries,
  };
}

/**
 * GET API: 获取根气结果
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    console.log("[rootqi] input ok:", Object.fromEntries(searchParams.entries()));
    const chartId = searchParams.get("chart_id");

    if (!chartId) {
      return NextResponse.json(
        {
          success: false,
          error: "请提供 chart_id 参数",
        },
        { status: 400 }
      );
    }

    const result = await getRootQiFromDB(chartId);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "未找到根气结果",
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[rootqi] GET API错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取根气结果失败",
      },
      { status: 500 }
    );
  }
}

/**
 * POST API: 计算并保存根气结果
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    console.log("[rootqi] input ok:", body);
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

    const result = await calculateAndSaveRootqi(chart_id, ruleset_id);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[rootqi] POST API错误:", error);
    console.error("[rootqi] 错误堆栈:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "计算根气结果失败",
      },
      { status: 500 }
    );
  }
}

