/**
 * Step 3: 月令与季节（第一权重）
 * 输出：当令之气、旺相休囚与季节信息
 */

import { query } from "@/lib/db";
import { calculateAndSaveRootqi, getRootQiFromDB, RootQiResult } from "./rootqi/utils";
import { calculateAndSaveDezhu, getDezhuFromDB, DezhuResult } from "./dezhu/route";
import { calculateAndSaveKeXie, getKeXieFromDB, KeXieResult } from "./ke_xie/utils";

export interface Step3Result {
  month_command: {
    month_branch: string;
    season: string;
    dominant_qi: string;
    supporting_elements_rank: string[];
  };
  yueling_strength?: {
    day_master_element: string;
    day_master_state: string;
    day_master_state_rank: number;
    all_elements_state: Record<string, { state: string; state_rank: number }>;
    is_override: boolean;
    override_note?: string;
  };
  rootqi?: RootQiResult | null;
  dezhu?: DezhuResult | null;
  ke_xie?: KeXieResult | null;
}

const BRANCH_SEASON_FALLBACK: Record<string, string> = {
  寅: "春",
  卯: "春",
  辰: "春",
  巳: "夏",
  午: "夏",
  未: "夏",
  申: "秋",
  酉: "秋",
  戌: "秋",
  亥: "冬",
  子: "冬",
  丑: "冬",
};

const SEASON_ELEMENT_FALLBACK: Record<
  string,
  Record<string, { state: string; state_rank: number }>
> = {
  春: {
    木: { state: "旺", state_rank: 5 },
    火: { state: "相", state_rank: 4 },
    水: { state: "休", state_rank: 3 },
    金: { state: "囚", state_rank: 2 },
    土: { state: "死", state_rank: 1 },
  },
  夏: {
    火: { state: "旺", state_rank: 5 },
    土: { state: "相", state_rank: 4 },
    木: { state: "休", state_rank: 3 },
    水: { state: "囚", state_rank: 2 },
    金: { state: "死", state_rank: 1 },
  },
  秋: {
    金: { state: "旺", state_rank: 5 },
    水: { state: "相", state_rank: 4 },
    土: { state: "休", state_rank: 3 },
    火: { state: "囚", state_rank: 2 },
    木: { state: "死", state_rank: 1 },
  },
  冬: {
    水: { state: "旺", state_rank: 5 },
    木: { state: "相", state_rank: 4 },
    金: { state: "休", state_rank: 3 },
    土: { state: "囚", state_rank: 2 },
    火: { state: "死", state_rank: 1 },
  },
};

async function getYuelingStrengthFromDB(
  monthBranch: string,
  dayMasterElement: string,
  ruleSet: string = "default"
): Promise<Step3Result["yueling_strength"]> {
  const seasonRows = await query<{ branch: string; season: string }>(
    `SELECT branch, season FROM public.dict_branch_season WHERE branch = $1`,
    [monthBranch]
  );

  const season =
    seasonRows.length > 0 ? seasonRows[0].season : BRANCH_SEASON_FALLBACK[monthBranch];
  if (!season) return undefined;

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

  const allElementsState: Record<string, { state: string; state_rank: number }> = {};
  const overrideMap: Record<string, { state: string; state_rank: number; note: string }> = {};

  overrideRows.forEach((row) => {
    overrideMap[row.element] = {
      state: row.state,
      state_rank: row.state_rank,
      note: row.note,
    };
  });

  if (stateRows.length === 0) {
    const fallback = SEASON_ELEMENT_FALLBACK[season] || {};
    Object.keys(fallback).forEach((element) => {
      const base = fallback[element];
      if (overrideMap[element]) {
        allElementsState[element] = {
          state: overrideMap[element].state,
          state_rank: overrideMap[element].state_rank,
        };
      } else {
        allElementsState[element] = {
          state: base.state,
          state_rank: base.state_rank,
        };
      }
    });
  } else {
    stateRows.forEach((row) => {
      if (overrideMap[row.element]) {
        allElementsState[row.element] = {
          state: overrideMap[row.element].state,
          state_rank: overrideMap[row.element].state_rank,
        };
      } else {
        allElementsState[row.element] = {
          state: row.state,
          state_rank: row.state_rank,
        };
      }
    });
  }

  const dayMasterStateInfo = allElementsState[dayMasterElement];
  if (!dayMasterStateInfo) return undefined;

  const isOverride = !!overrideMap[dayMasterElement];
  const overrideNote = isOverride ? overrideMap[dayMasterElement].note : undefined;

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
  console.log("[step3] input ok:", { fourPillars, dayMasterElement, chartId, ruleSet });
  const monthBranch = fourPillars.month.charAt(1);

  const seasonRows = await query<{ branch: string; season: string }>(
    `SELECT branch, season FROM public.dict_branch_season WHERE branch = $1`,
    [monthBranch]
  );

  let season = "未知";
  if (seasonRows.length > 0) {
    season = seasonRows[0].season;
  } else if (BRANCH_SEASON_FALLBACK[monthBranch]) {
    season = BRANCH_SEASON_FALLBACK[monthBranch];
  }

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
  } else if (season !== "未知") {
    const fallback = SEASON_ELEMENT_FALLBACK[season];
    if (fallback) {
      const wan = Object.entries(fallback).find(([, v]) => v.state === "旺");
      if (wan) dominantQi = `${wan[0]}旺`;
    }
  }

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

  const overrideMap: Record<string, { state: string; state_rank: number }> = {};
  allOverrideRows.forEach((row) => {
    overrideMap[row.element] = {
      state: row.state,
      state_rank: row.state_rank,
    };
  });

  const elementsRank: string[] = [];
  const elementStateMap: Record<string, { state: string; state_rank: number }> = {};

  if (allStateRows.length === 0 && season !== "未知") {
    const fallback = SEASON_ELEMENT_FALLBACK[season] || {};
    Object.keys(fallback).forEach((element) => {
      if (overrideMap[element]) {
        elementStateMap[element] = overrideMap[element];
      } else {
        elementStateMap[element] = {
          state: fallback[element].state,
          state_rank: fallback[element].state_rank,
        };
      }
    });
  } else {
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
  }

  const sortedElements = Object.entries(elementStateMap).sort(
    (a, b) => b[1].state_rank - a[1].state_rank
  );
  elementsRank.push(...sortedElements.map(([element]) => element));

  const yuelingStrength = await getYuelingStrengthFromDB(monthBranch, dayMasterElement, ruleSet);

  let rootqiData: RootQiResult | null = null;
  if (chartId) {
    try {
      await calculateAndSaveRootqi(chartId, ruleSet);
      rootqiData = await getRootQiFromDB(chartId);
    } catch (error) {
      console.error("[step3] rootqi error:", error);
    }
  }

  let dezhuData: DezhuResult | null = null;
  if (chartId) {
    try {
      await calculateAndSaveDezhu(chartId, ruleSet);
      dezhuData = await getDezhuFromDB(chartId);
    } catch (error) {
      console.error("[step3] dezhu error:", error);
    }
  }

  let keXieData: KeXieResult | null = null;
  if (chartId) {
    try {
      await calculateAndSaveKeXie(chartId, ruleSet);
      keXieData = await getKeXieFromDB(chartId);
    } catch (error) {
      console.error("[step3] ke_xie error:", error);
    }
  }
  console.log("[step3] response ok:", { season, dominantQi, hasRootqi: !!rootqiData, hasDezhu: !!dezhuData, hasKeXie: !!keXieData });
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
