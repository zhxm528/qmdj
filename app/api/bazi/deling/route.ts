import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";
import { getYuelingStrengthFromDB } from "../yueling/route";
import { getDayMasterElement } from "../rizhuwuxing/route";

/**
 * 得令计算结果
 */
export interface DelingResult {
  chart_id: string;
  ruleset_id: string;
  month_branch: string;
  season_code: string;
  day_stem: string;
  day_master_element: string;
  day_master_state: string;
  day_master_score: number;
  is_deling: boolean;
  rule_text: string;
  evidence_json: any;
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
 * 将 state_rank (1-5) 转换为 score (0-1)
 */
function convertStateRankToScore(stateRank: number): number {
  return stateRank / 5.0;
}

/**
 * 计算并保存得令结果到数据库
 */
export async function calculateAndSaveDeling(
  chartId: string,
  rulesetId: string = "default"
): Promise<DelingResult> {
  return await transaction(async (client) => {
    console.log(`[deling] 开始计算得令，chart_id: ${chartId}, ruleset_id: ${rulesetId}`);

    // 1. 获取四柱数据
    const pillars = await getFourPillarsFromDB(chartId);
    if (pillars.length !== 4) {
      throw new Error(`四柱数据不完整，期望4条，实际${pillars.length}条`);
    }

    console.log(`[deling] 获取到 ${pillars.length} 条四柱数据`);

    // 2. 提取月支和日干
    const monthPillar = pillars.find((p) => p.pillar === "month");
    const dayPillar = pillars.find((p) => p.pillar === "day");

    if (!monthPillar || !dayPillar) {
      throw new Error("无法找到月柱或日柱数据");
    }

    const monthBranch = monthPillar.branch;
    const dayStem = dayPillar.stem;

    console.log(`[deling] 月支: ${monthBranch}, 日干: ${dayStem}`);

    // 3. 获取日主五行
    const dayMasterElement = getDayMasterElement(dayStem);
    if (!dayMasterElement) {
      throw new Error(`无法获取日干 ${dayStem} 对应的五行`);
    }

    console.log(`[deling] 日主五行: ${dayMasterElement}`);

    // 4. 调用 yueling/route.ts 获取月令强弱信息
    const yuelingData = await getYuelingStrengthFromDB(
      monthBranch,
      dayMasterElement,
      rulesetId
    );

    if (!yuelingData) {
      throw new Error("无法获取月令强弱信息");
    }

    console.log(`[deling] 月令强弱信息:`, JSON.stringify(yuelingData, null, 2));

    const season = yuelingData.season;
    const dayMasterState = yuelingData.day_master_state;
    const dayMasterStateRank = yuelingData.day_master_state_rank;
    const allElementsState = yuelingData.all_elements_state;
    const isOverride = yuelingData.is_override;
    const overrideNote = yuelingData.override_note;

    // 5. 查询得令判定规则集
    const rulesetRows = await client.query<{
      ruleset_id: string;
      ruleset_name: string;
      state_thresholds: string[] | null;
      score_min: number | null;
      note: string | null;
    }>(
      `SELECT ruleset_id, ruleset_name, state_thresholds, score_min, note
       FROM public.dict_deling_ruleset
       WHERE ruleset_id = $1`,
      [rulesetId]
    );

    if (rulesetRows.rows.length === 0) {
      throw new Error(`未找到规则集 ${rulesetId}`);
    }

    const ruleset = rulesetRows.rows[0];
    console.log(`[deling] 规则集信息:`, JSON.stringify(ruleset, null, 2));

    // 6. 将 state_rank 转换为 score
    const dayMasterScore = convertStateRankToScore(dayMasterStateRank);
    console.log(`[deling] 日主状态: ${dayMasterState}, 状态值: ${dayMasterStateRank}, 转换后分数: ${dayMasterScore}`);

    // 7. 查询覆盖规则表，判断每个五行是否有覆盖规则
    const overrideRows = await client.query<{
      element: string;
      state: string;
      state_rank: number;
      note: string;
    }>(
      `SELECT element, state, state_rank, note
       FROM public.dict_month_branch_override
       WHERE rule_set = $1 AND branch = $2 AND is_enabled = true
       ORDER BY priority DESC`,
      [rulesetId, monthBranch]
    );

    const overrideMap: Record<string, { state: string; state_rank: number; note: string }> = {};
    overrideRows.rows.forEach((row) => {
      overrideMap[row.element] = {
        state: row.state,
        state_rank: row.state_rank,
        note: row.note,
      };
    });

    // 8. 保存快照表（所有五行的状态和分数）
    const elements = ["木", "火", "土", "金", "水"];
    const snapshotData: Array<{
      element: string;
      state: string;
      score: number;
      is_override: boolean;
      evidence_json: any;
    }> = [];

    for (const element of elements) {
      const elementState = allElementsState[element];
      if (elementState) {
        const elementScore = convertStateRankToScore(elementState.state_rank);
        // 检查该五行是否有覆盖规则
        const elementIsOverride = !!overrideMap[element];

        snapshotData.push({
          element,
          state: elementState.state,
          score: elementScore,
          is_override: elementIsOverride,
          evidence_json: {
            source: "yueling/route.ts",
            state_rank: elementState.state_rank,
            is_override: elementIsOverride,
            override_note: elementIsOverride ? overrideMap[element].note : undefined,
          },
        });
      }
    }

    if (snapshotData.length > 0) {
      const snapshotPlaceholders: string[] = [];
      const snapshotValues: any[] = [];
      let paramIndex = 1;

      for (const data of snapshotData) {
        snapshotPlaceholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`
        );
        snapshotValues.push(
          chartId,
          rulesetId,
          monthBranch,
          season,
          data.element,
          data.state,
          data.score,
          data.is_override,
          JSON.stringify(data.evidence_json)
        );
        paramIndex += 9;
      }

      await client.query(
        `INSERT INTO public.bazi_season_element_state_snapshot_tbl(
          chart_id, ruleset_id, month_branch, season_code, element, state, score, is_override, evidence_json
        ) VALUES ${snapshotPlaceholders.join(",")}
        ON CONFLICT (chart_id, ruleset_id, element) DO UPDATE SET
          month_branch = EXCLUDED.month_branch,
          season_code = EXCLUDED.season_code,
          state = EXCLUDED.state,
          score = EXCLUDED.score,
          is_override = EXCLUDED.is_override,
          evidence_json = EXCLUDED.evidence_json,
          created_at = NOW()`,
        snapshotValues
      );

      console.log(`[deling] 成功保存 ${snapshotData.length} 条快照记录`);
    }

    // 9. 根据规则判定是否得令
    let isDeling = false;
    let ruleText = "";

    if (ruleset.state_thresholds && ruleset.state_thresholds.length > 0) {
      // 状态阈值优先
      isDeling = ruleset.state_thresholds.includes(dayMasterState);
      ruleText = `按状态阈值判定：${ruleset.state_thresholds.join("、")}为得令`;
      console.log(`[deling] 使用状态阈值判定: ${dayMasterState} 是否在 [${ruleset.state_thresholds.join(", ")}] 中 => ${isDeling}`);
    } else if (ruleset.score_min !== null) {
      // 分数阈值作为备选
      isDeling = dayMasterScore >= ruleset.score_min;
      ruleText = `按分数阈值判定：分数 >= ${ruleset.score_min} 为得令`;
      console.log(`[deling] 使用分数阈值判定: ${dayMasterScore} >= ${ruleset.score_min} => ${isDeling}`);
    } else {
      throw new Error(`规则集 ${rulesetId} 既没有设置 state_thresholds 也没有设置 score_min`);
    }

    // 10. 构建证据 JSON
    const evidenceJson = {
      ruleset_id: rulesetId,
      ruleset_name: ruleset.ruleset_name,
      state_thresholds: ruleset.state_thresholds,
      score_min: ruleset.score_min,
      day_master_state: dayMasterState,
      day_master_score: dayMasterScore,
      day_master_state_rank: dayMasterStateRank,
      is_override: isOverride,
      override_note: overrideNote,
      snapshot_source: "yueling/route.ts",
      all_elements_state: allElementsState,
    };

    // 11. 保存得令结果表
    await client.query(
      `INSERT INTO public.bazi_deling_result_tbl(
        chart_id, ruleset_id, month_branch, season_code, day_stem, day_master_element,
        day_master_state, day_master_score, is_deling, rule_text, evidence_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (chart_id, ruleset_id) DO UPDATE SET
        month_branch = EXCLUDED.month_branch,
        season_code = EXCLUDED.season_code,
        day_stem = EXCLUDED.day_stem,
        day_master_element = EXCLUDED.day_master_element,
        day_master_state = EXCLUDED.day_master_state,
        day_master_score = EXCLUDED.day_master_score,
        is_deling = EXCLUDED.is_deling,
        rule_text = EXCLUDED.rule_text,
        evidence_json = EXCLUDED.evidence_json,
        computed_at = NOW()`,
      [
        chartId,
        rulesetId,
        monthBranch,
        season,
        dayStem,
        dayMasterElement,
        dayMasterState,
        dayMasterScore,
        isDeling,
        ruleText,
        JSON.stringify(evidenceJson),
      ]
    );

    console.log(`[deling] 得令计算结果:`, {
      chart_id: chartId,
      ruleset_id: rulesetId,
      month_branch: monthBranch,
      season: season,
      day_stem: dayStem,
      day_master_element: dayMasterElement,
      day_master_state: dayMasterState,
      day_master_score: dayMasterScore,
      is_deling: isDeling,
      rule_text: ruleText,
    });

    // 12. 返回结果
    return {
      chart_id: chartId,
      ruleset_id: rulesetId,
      month_branch: monthBranch,
      season_code: season,
      day_stem: dayStem,
      day_master_element: dayMasterElement,
      day_master_state: dayMasterState,
      day_master_score: dayMasterScore,
      is_deling: isDeling,
      rule_text: ruleText,
      evidence_json: evidenceJson,
    };
  });
}

/**
 * 从数据库获取得令结果
 */
export async function getDelingFromDB(
  chartId: string,
  rulesetId: string = "default"
): Promise<DelingResult | null> {
  const rows = await query<{
    chart_id: string;
    ruleset_id: string;
    month_branch: string;
    season_code: string;
    day_stem: string;
    day_master_element: string;
    day_master_state: string;
    day_master_score: number;
    is_deling: boolean;
    rule_text: string;
    evidence_json: any;
  }>(
    `SELECT chart_id, ruleset_id, month_branch, season_code, day_stem, day_master_element,
            day_master_state, day_master_score, is_deling, rule_text, evidence_json
     FROM public.bazi_deling_result_tbl
     WHERE chart_id = $1 AND ruleset_id = $2`,
    [chartId, rulesetId]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    chart_id: row.chart_id,
    ruleset_id: row.ruleset_id,
    month_branch: row.month_branch,
    season_code: row.season_code,
    day_stem: row.day_stem,
    day_master_element: row.day_master_element,
    day_master_state: row.day_master_state,
    day_master_score: typeof row.day_master_score === 'number' ? row.day_master_score : parseFloat(String(row.day_master_score)),
    is_deling: row.is_deling,
    rule_text: row.rule_text,
    evidence_json: typeof row.evidence_json === 'string' ? JSON.parse(row.evidence_json) : row.evidence_json,
  };
}

/**
 * GET API: 获取得令结果
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const chartId = searchParams.get("chart_id");
    const rulesetId = searchParams.get("ruleset_id") || "default";

    if (!chartId) {
      return NextResponse.json(
        {
          success: false,
          error: "请提供 chart_id 参数",
        },
        { status: 400 }
      );
    }

    const result = await getDelingFromDB(chartId, rulesetId);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "未找到得令结果",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[deling] GET API错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取得令结果失败",
      },
      { status: 500 }
    );
  }
}

/**
 * POST API: 计算并保存得令结果
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
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

    const result = await calculateAndSaveDeling(chart_id, ruleset_id);

    console.log("[deling] 得令计算完成，结果:", JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[deling] POST API错误:", error);
    console.error("[deling] 错误堆栈:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "计算得令结果失败",
      },
      { status: 500 }
    );
  }
}

