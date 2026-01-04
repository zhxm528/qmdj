import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * 月令强弱/得令API
 * 根据月支和日主五行，查询旺相休囚死状态
 * 数据从数据库表 dict_branch_season, dict_season_element_state, dict_month_branch_override 读取
 */

interface YuelingRequest {
  month_branch: string; // 月支：子丑寅卯辰巳午未申酉戌亥
  day_master_element: string; // 日主五行：木火土金水
  rule_set?: string; // 可选：规则集，默认 'default'
}

interface YuelingResponse {
  success: boolean;
  data?: {
    month_branch: string;
    season: string;
    day_master_element: string;
    day_master_state: string; // 日主五行的旺相休囚死状态
    day_master_state_rank: number; // 日主五行的强弱数值（1-5）
    all_elements_state: Record<string, { state: string; state_rank: number }>; // 所有五行的旺相休囚死状态
    is_override: boolean; // 是否使用了覆盖规则
    override_note?: string; // 覆盖规则说明
  };
  error?: string;
}

/**
 * 从数据库获取月令强弱信息
 * @param monthBranch 月支
 * @param dayMasterElement 日主五行
 * @param ruleSet 规则集，默认 'default'
 * @returns 月令强弱信息
 */
export async function getYuelingStrengthFromDB(
  monthBranch: string,
  dayMasterElement: string,
  ruleSet: string = "default"
): Promise<YuelingResponse["data"]> {
  console.log("[月令强弱] 查询参数:", { monthBranch, dayMasterElement, ruleSet });

  // 1. 查询月支对应的季节
  const seasonRows = await query<{ branch: string; season: string }>(
    `SELECT branch, season FROM public.dict_branch_season WHERE branch = $1`,
    [monthBranch]
  );

  if (seasonRows.length === 0) {
    throw new Error(`未找到月支 ${monthBranch} 对应的季节`);
  }

  const season = seasonRows[0].season;
  console.log("[月令强弱] 月支对应季节:", season);

  // 2. 查询季节×五行的旺相休囚死状态（默认规则）
  const stateRows = await query<{
    season: string;
    element: string;
    state: string;
    state_rank: number;
  }>(
    `SELECT season, element, state, state_rank 
     FROM public.dict_season_element_state 
     WHERE rule_set = $1 AND season = $2 
     ORDER BY state_rank DESC`,
    [ruleSet, season]
  );

  console.log("[月令强弱] 季节×五行状态查询结果:", JSON.stringify(stateRows, null, 2));

  // 3. 查询是否有覆盖规则（优先使用覆盖）
  const overrideRows = await query<{
    branch: string;
    element: string;
    state: string;
    state_rank: number;
    note: string;
  }>(
    `SELECT branch, element, state, state_rank, note
     FROM public.dict_month_branch_override
     WHERE rule_set = $1 AND branch = $2 AND is_enabled = true
     ORDER BY priority DESC`,
    [ruleSet, monthBranch]
  );

  console.log("[月令强弱] 覆盖规则查询结果:", JSON.stringify(overrideRows, null, 2));

  // 4. 构建所有五行的状态映射（优先使用覆盖规则）
  const allElementsState: Record<string, { state: string; state_rank: number }> = {};
  const overrideMap: Record<string, { state: string; state_rank: number; note: string }> = {};

  // 先处理覆盖规则
  overrideRows.forEach((row) => {
    overrideMap[row.element] = {
      state: row.state,
      state_rank: row.state_rank,
      note: row.note,
    };
  });

  // 再处理默认规则（如果某个五行没有覆盖规则，使用默认规则）
  stateRows.forEach((row) => {
    if (overrideMap[row.element]) {
      // 使用覆盖规则
      allElementsState[row.element] = {
        state: overrideMap[row.element].state,
        state_rank: overrideMap[row.element].state_rank,
      };
    } else {
      // 使用默认规则
      allElementsState[row.element] = {
        state: row.state,
        state_rank: row.state_rank,
      };
    }
  });

  // 5. 获取日主五行的状态
  const dayMasterStateInfo = allElementsState[dayMasterElement];
  if (!dayMasterStateInfo) {
    throw new Error(`未找到日主五行 ${dayMasterElement} 的旺相休囚死状态`);
  }

  const isOverride = !!overrideMap[dayMasterElement];
  const overrideNote = isOverride ? overrideMap[dayMasterElement].note : undefined;

  console.log("[月令强弱] 最终结果:", {
    month_branch: monthBranch,
    season,
    day_master_element: dayMasterElement,
    day_master_state: dayMasterStateInfo.state,
    day_master_state_rank: dayMasterStateInfo.state_rank,
    all_elements_state: allElementsState,
    is_override: isOverride,
  });

  return {
    month_branch: monthBranch,
    season,
    day_master_element: dayMasterElement,
    day_master_state: dayMasterStateInfo.state,
    day_master_state_rank: dayMasterStateInfo.state_rank,
    all_elements_state: allElementsState,
    is_override: isOverride,
    override_note: overrideNote,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse<YuelingResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const monthBranch = searchParams.get("month_branch");
    const dayMasterElement = searchParams.get("day_master_element");
    const ruleSet = searchParams.get("rule_set") || "default";

    if (!monthBranch || !dayMasterElement) {
      return NextResponse.json(
        {
          success: false,
          error: "请提供 month_branch 和 day_master_element 参数",
        },
        { status: 400 }
      );
    }

    const data = await getYuelingStrengthFromDB(monthBranch, dayMasterElement, ruleSet);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("[月令强弱] API错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "查询月令强弱信息失败",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<YuelingResponse>> {
  try {
    const body = (await req.json()) as YuelingRequest;
    const { month_branch, day_master_element, rule_set = "default" } = body;

    if (!month_branch || !day_master_element) {
      return NextResponse.json(
        {
          success: false,
          error: "请提供 month_branch 和 day_master_element 参数",
        },
        { status: 400 }
      );
    }

    const data = await getYuelingStrengthFromDB(month_branch, day_master_element, rule_set);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("[月令强弱] API错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "查询月令强弱信息失败",
      },
      { status: 500 }
    );
  }
}

