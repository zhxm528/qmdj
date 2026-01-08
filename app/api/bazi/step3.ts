/**
 * 步骤3：抓月令与季节（定大方向）
 * 以月支（月令）为第一权重：这决定"当令之气"（季节力量），很多判断从这里定调。
 * 从数据库获取月令强弱/得令信息
 */

import { query } from "@/lib/db";
import { calculateAndSaveRootqi, getRootQiFromDB, RootQiResult } from "./rootqi/route";
import { calculateAndSaveDezhu, getDezhuFromDB, DezhuResult } from "./dezhu/route";
import { calculateAndSaveKeXie, getKeXieFromDB, KeXieResult } from "./ke_xie/route";

export interface Step3Result {
  month_command: {
    month_branch: string;
    season: string;
    dominant_qi: string;
    supporting_elements_rank: string[];
  };
  // 新增：月令强弱/得令信息
  yueling_strength?: {
    day_master_element: string;
    day_master_state: string; // 日主五行的旺相休囚死状态
    day_master_state_rank: number; // 日主五行的强弱数值（1-5）
    all_elements_state: Record<string, { state: string; state_rank: number }>; // 所有五行的旺相休囚死状态
    is_override: boolean; // 是否使用了覆盖规则
    override_note?: string; // 覆盖规则说明
  };
  // 新增：根气结果
  rootqi?: RootQiResult | null;
  // 新增：得助结果
  dezhu?: DezhuResult | null;
  // 新增：受克泄耗（制化）结果
  ke_xie?: KeXieResult | null;
}

/**
 * 从数据库获取月令强弱信息
 * @param monthBranch 月支
 * @param dayMasterElement 日主五行
 * @param ruleSet 规则集，默认 'default'
 * @returns 月令强弱信息
 */
async function getYuelingStrengthFromDB(
  monthBranch: string,
  dayMasterElement: string,
  ruleSet: string = "default"
): Promise<Step3Result["yueling_strength"]> {
  console.log("[step3 月令强弱] 查询参数:", { monthBranch, dayMasterElement, ruleSet });

  // 1. 查询月支对应的季节
  const seasonRows = await query<{ branch: string; season: string }>(
    `SELECT branch, season FROM public.dict_branch_season WHERE branch = $1`,
    [monthBranch]
  );

  if (seasonRows.length === 0) {
    console.warn(`[step3 月令强弱] 未找到月支 ${monthBranch} 对应的季节，使用默认值`);
    return undefined;
  }

  const season = seasonRows[0].season;
  console.log("[step3 月令强弱] 月支对应季节:", season);

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

  console.log("[step3 月令强弱] 季节×五行状态查询结果:", JSON.stringify(stateRows, null, 2));

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

  console.log("[step3 月令强弱] 覆盖规则查询结果:", JSON.stringify(overrideRows, null, 2));

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
    console.warn(`[step3 月令强弱] 未找到日主五行 ${dayMasterElement} 的旺相休囚死状态`);
    return undefined;
  }

  const isOverride = !!overrideMap[dayMasterElement];
  const overrideNote = isOverride ? overrideMap[dayMasterElement].note : undefined;

  console.log("[step3 月令强弱] 最终结果:", {
    day_master_element: dayMasterElement,
    day_master_state: dayMasterStateInfo.state,
    day_master_state_rank: dayMasterStateInfo.state_rank,
    is_override: isOverride,
  });

  return {
    day_master_element: dayMasterElement,
    day_master_state: dayMasterStateInfo.state,
    day_master_state_rank: dayMasterStateInfo.state_rank,
    all_elements_state: allElementsState,
    is_override: isOverride,
    override_note: overrideNote,
  };
}

export async function step3(
  fourPillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  },
  dayMasterElement: string,
  chartId: string | null = null,
  ruleSet: string = "default"
): Promise<Step3Result> {
  const monthBranch = fourPillars.month.charAt(1);

  // 从数据库获取月支对应的季节
  const seasonRows = await query<{ branch: string; season: string }>(
    `SELECT branch, season FROM public.dict_branch_season WHERE branch = $1`,
    [monthBranch]
  );

  let season = "未知";
  if (seasonRows.length > 0) {
    season = seasonRows[0].season;
  }

  // 从数据库获取当令之气（旺的五行）
  const wangRows = await query<{
    element: string;
    state: string;
    state_rank: number;
  }>(
    `SELECT ses.element, ses.state, ses.state_rank
     FROM public.dict_season_element_state ses
     JOIN public.dict_branch_season bs ON ses.season = bs.season
     WHERE bs.branch = $1 AND ses.rule_set = $2 AND ses.state = '旺'
     ORDER BY ses.state_rank DESC
     LIMIT 1`,
    [monthBranch, ruleSet]
  );

  // 检查是否有覆盖规则（如辰戌丑未土旺）
  const overrideWangRows = await query<{
    element: string;
    state: string;
    state_rank: number;
  }>(
    `SELECT element, state, state_rank
     FROM public.dict_month_branch_override
     WHERE rule_set = $1 AND branch = $2 AND is_enabled = true AND state = '旺'
     ORDER BY priority DESC, state_rank DESC
     LIMIT 1`,
    [ruleSet, monthBranch]
  );

  let dominantQi = "未知";
  if (overrideWangRows.length > 0) {
    dominantQi = `${overrideWangRows[0].element}旺`;
  } else if (wangRows.length > 0) {
    dominantQi = `${wangRows[0].element}旺`;
  }

  // 获取所有五行的状态（用于排序）
  const allStateRows = await query<{
    element: string;
    state: string;
    state_rank: number;
  }>(
    `SELECT ses.element, ses.state, ses.state_rank
     FROM public.dict_season_element_state ses
     JOIN public.dict_branch_season bs ON ses.season = bs.season
     WHERE bs.branch = $1 AND ses.rule_set = $2
     ORDER BY ses.state_rank DESC`,
    [monthBranch, ruleSet]
  );

  // 查询覆盖规则
  const allOverrideRows = await query<{
    element: string;
    state: string;
    state_rank: number;
  }>(
    `SELECT element, state, state_rank
     FROM public.dict_month_branch_override
     WHERE rule_set = $1 AND branch = $2 AND is_enabled = true
     ORDER BY priority DESC, state_rank DESC`,
    [ruleSet, monthBranch]
  );

  // 构建覆盖映射
  const overrideMap: Record<string, { state: string; state_rank: number }> = {};
  allOverrideRows.forEach((row) => {
    overrideMap[row.element] = {
      state: row.state,
      state_rank: row.state_rank,
    };
  });

  // 构建五行排序（优先使用覆盖规则）
  const elementsRank: string[] = [];
  const elementStateMap: Record<string, { state: string; state_rank: number }> = {};

  allStateRows.forEach((row) => {
    if (overrideMap[row.element]) {
      elementStateMap[row.element] = overrideMap[row.element];
    } else {
      elementStateMap[row.element] = {
        state: row.state,
        state_rank: row.state_rank,
      };
    }
  });

  // 按 state_rank 排序
  const sortedElements = Object.entries(elementStateMap).sort(
    (a, b) => b[1].state_rank - a[1].state_rank
  );
  elementsRank.push(...sortedElements.map(([element]) => element));

  // 获取月令强弱信息
  const yuelingStrength = await getYuelingStrengthFromDB(monthBranch, dayMasterElement, ruleSet);

  // 调用根气 API（需要 chartId）
  let rootqiData: RootQiResult | null = null;
  if (chartId) {
    try {
      console.log("[step3] 调用 rootqi API，chart_id:", chartId);
      // 先计算并保存根气结果
      await calculateAndSaveRootqi(chartId, ruleSet);
      // 然后获取根气结果
      rootqiData = await getRootQiFromDB(chartId);
      console.log("[step3] 根气结果:", rootqiData ? `找到 ${rootqiData.details.length} 条明细，${rootqiData.summaries.length} 条汇总` : "null");
    } catch (rootqiError: any) {
      console.error("[step3] 调用 rootqi API 时出错:", rootqiError);
      console.error("[step3] rootqi 错误堆栈:", rootqiError.stack);
      // 不抛出错误，继续执行
    }
  } else {
    console.log("[step3] chart_id 为空，跳过 rootqi 计算");
  }

  // 调用得助 API（需要 chartId）
  let dezhuData: DezhuResult | null = null;
  if (chartId) {
    try {
      console.log("[step3] 调用 dezhu API，chart_id:", chartId);
      // 先计算并保存得助结果
      await calculateAndSaveDezhu(chartId, ruleSet);
      // 然后获取得助结果
      dezhuData = await getDezhuFromDB(chartId);
      console.log("[step3] 得助结果:", dezhuData ? `找到 ${dezhuData.details.length} 条明细` : "null");
      if (dezhuData) {
        console.log("[step3] 得助结果内容:", JSON.stringify(dezhuData, null, 2));
      }
    } catch (dezhuError: any) {
      console.error("[step3] 调用 dezhu API 时出错:", dezhuError);
      console.error("[step3] dezhu 错误堆栈:", dezhuError.stack);
      // 不抛出错误，继续执行
    }
  } else {
    console.log("[step3] chart_id 为空，跳过 dezhu 计算");
  }

  // 调用受克泄耗（制化） API（需要chartId）
  let keXieData: KeXieResult | null = null;
  if (chartId) {
    try {
      console.log("[step3] 调用 ke_xie API，chart_id:", chartId);
      await calculateAndSaveKeXie(chartId, ruleSet);
      keXieData = await getKeXieFromDB(chartId);
      console.log(
        "[step3] 受克泄耗结果:",
        keXieData ? `找到 ${keXieData.details.length} 条明细` : "null"
      );
      if (keXieData) {
        console.log("[step3] 受克泄耗结果内容:", JSON.stringify(keXieData, null, 2));
      }
    } catch (keXieError: any) {
      console.error("[step3] 调用 ke_xie API 时出错:", keXieError);
      console.error("[step3] ke_xie 错误堆栈:", keXieError.stack);
      // 不抛出错误，继续执行
    }
  } else {
    console.log("[step3] chart_id 为空，跳过 ke_xie 计算");
  }

  return {
    month_command: {
      month_branch: monthBranch,
      season,
      dominant_qi: dominantQi,
      supporting_elements_rank: elementsRank,
    },
    yueling_strength: yuelingStrength,
    rootqi: rootqiData,
    dezhu: dezhuData,
    ke_xie: keXieData,
  };
}

