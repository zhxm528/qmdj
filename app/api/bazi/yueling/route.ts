import { NextRequest, NextResponse } from "next/server";
import { getYuelingStrengthFromDB, YuelingRequest, YuelingResponse } from "./utils";

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
