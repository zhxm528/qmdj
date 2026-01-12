import { NextRequest, NextResponse } from "next/server";
import { saveDayunResult, getDayunFromDB, DayunResult } from "./utils";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    console.log("[dayun] input ok:", Object.fromEntries(searchParams.entries()));
    const chartId = searchParams.get("chart_id");

    if (!chartId) {
      return NextResponse.json({ success: false, error: "missing chart_id" }, { status: 400 });
    }

    const result = await getDayunFromDB(chartId);
    if (!result) {
      return NextResponse.json({ success: false, error: "no result" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[dayun] GET failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "GET failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    console.log("[dayun] input ok:", body);
    const { chart_id, meta, list } = body || {};

    if (!chart_id) {
      return NextResponse.json({ success: false, error: "missing chart_id" }, { status: 400 });
    }

    const result = await saveDayunResult({
      chart_id,
      meta: meta || {
        chart_id,
        direction: "FORWARD",
        start_age: 0,
        start_datetime: null,
        start_year: null,
        start_month: null,
        year_stem_yinyang: "YANG",
        gender: "MALE",
        rule_version: "main_v1",
        diff_days: 0,
        target_jieqi_name: null,
        target_jieqi_datetime: null,
      },
      list: Array.isArray(list) ? list : [],
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[dayun] POST failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "POST failed" },
      { status: 500 }
    );
  }
}
