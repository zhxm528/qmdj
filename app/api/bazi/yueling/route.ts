import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * Yueling strength / Deling API
 * Reads dict_branch_season / dict_season_element_state / dict_month_branch_override
 */

interface YuelingRequest {
  month_branch: string;
  day_master_element: string;
  rule_set?: string;
}

interface YuelingResponse {
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
  "\u5bc5": "\u6625",
  "\u536f": "\u6625",
  "\u8fb0": "\u6625",
  "\u5df3": "\u590f",
  "\u5348": "\u590f",
  "\u672a": "\u590f",
  "\u7533": "\u79cb",
  "\u9149": "\u79cb",
  "\u620c": "\u79cb",
  "\u4ea5": "\u51ac",
  "\u5b50": "\u51ac",
  "\u4e11": "\u51ac",
};

const SEASON_ELEMENT_FALLBACK: Record<
  string,
  Record<string, { state: string; state_rank: number }>
> = {
  "\u6625": {
    "\u6728": { state: "\u65fa", state_rank: 5 },
    "\u706b": { state: "\u76f8", state_rank: 4 },
    "\u6c34": { state: "\u4f11", state_rank: 3 },
    "\u91d1": { state: "\u56da", state_rank: 2 },
    "\u571f": { state: "\u6b7b", state_rank: 1 },
  },
  "\u590f": {
    "\u706b": { state: "\u65fa", state_rank: 5 },
    "\u571f": { state: "\u76f8", state_rank: 4 },
    "\u6728": { state: "\u4f11", state_rank: 3 },
    "\u6c34": { state: "\u56da", state_rank: 2 },
    "\u91d1": { state: "\u6b7b", state_rank: 1 },
  },
  "\u79cb": {
    "\u91d1": { state: "\u65fa", state_rank: 5 },
    "\u6c34": { state: "\u76f8", state_rank: 4 },
    "\u571f": { state: "\u4f11", state_rank: 3 },
    "\u706b": { state: "\u56da", state_rank: 2 },
    "\u6728": { state: "\u6b7b", state_rank: 1 },
  },
  "\u51ac": {
    "\u6c34": { state: "\u65fa", state_rank: 5 },
    "\u6728": { state: "\u76f8", state_rank: 4 },
    "\u91d1": { state: "\u4f11", state_rank: 3 },
    "\u571f": { state: "\u56da", state_rank: 2 },
    "\u706b": { state: "\u6b7b", state_rank: 1 },
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
      `\u672a\u627e\u5230\u6708\u652f${monthBranch} \u5bf9\u5e94\u7684\u5b63\u8282`
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
      `\u672a\u627e\u5230\u65e5\u4e3b\u4e94\u884c${dayMasterElement} \u7684\u65fa\u76f8\u4f11\u56da\u6b7b\u72b6\u6001`
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

export async function GET(req: NextRequest): Promise<NextResponse<YuelingResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    console.log("[yueling] input ok:", Object.fromEntries(searchParams.entries()));
    const monthBranch = searchParams.get("month_branch");
    const dayMasterElement = searchParams.get("day_master_element");
    const ruleSet = searchParams.get("rule_set") || "default";

    if (!monthBranch || !dayMasterElement) {
      return NextResponse.json(
        {
          success: false,
          error: "\u8bf7\u63d0\u4f9b month_branch \u548c day_master_element \u53c2\u6570",
        },
        { status: 400 }
      );
    }

    const data = await getYuelingStrengthFromDB(monthBranch, dayMasterElement, ruleSet);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[yueling] GET failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "query failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<YuelingResponse>> {
  try {
    const body = (await req.json()) as YuelingRequest;
    console.log("[yueling] input ok:", body);
    const { month_branch, day_master_element, rule_set = "default" } = body;

    if (!month_branch || !day_master_element) {
      return NextResponse.json(
        {
          success: false,
          error: "\u8bf7\u63d0\u4f9b month_branch \u548c day_master_element \u53c2\u6570",
        },
        { status: 400 }
      );
    }

    const data = await getYuelingStrengthFromDB(month_branch, day_master_element, rule_set);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[yueling] POST failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "query failed" },
      { status: 500 }
    );
  }
}
