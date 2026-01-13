import { query } from "@/lib/db";

/**
 * Yueling strength / Deling utility functions
 * Reads dict_branch_season / dict_season_element_state / dict_month_branch_override
 */

export interface YuelingRequest {
  month_branch: string;
  day_master_element: string;
  rule_set?: string;
}

export interface YuelingResponse {
  success: boolean;
  data?: {
    month_branch: string;
    season: string;
    day_master_element: string;
    day_master_state: string;
    day_master_state_rank: number;
    all_elements_state: Record<string, { state: string; state_rank: number }>;
    is_override: boolean;
    override_note?: string;
  };
  error?: string;
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

export async function getYuelingStrengthFromDB(
  monthBranch: string,
  dayMasterElement: string,
  ruleSet: string = "default"
): Promise<YuelingResponse["data"]> {
  const seasonRows = await query<{ branch: string; season: string }>(
    `SELECT branch, season FROM public.dict_branch_season WHERE branch = $1`,
    [monthBranch]
  );

  const season =
    seasonRows.length > 0 ? seasonRows[0].season : BRANCH_SEASON_FALLBACK[monthBranch];
  if (!season) {
    throw new Error(
      `未找到月支${monthBranch} 对应的季节`
    );
  }

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
  if (!dayMasterStateInfo) {
    throw new Error(
      `未找到日主五行${dayMasterElement} 的旺相休囚死状态`
    );
  }

  const isOverride = !!overrideMap[dayMasterElement];
  const overrideNote = isOverride ? overrideMap[dayMasterElement].note : undefined;

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
