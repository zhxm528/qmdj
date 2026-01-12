import { NextRequest, NextResponse } from "next/server";
import { saveGejuResult, getGejuFromDB, GejuResult } from "./utils";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    console.log("[geju] input ok:", Object.fromEntries(searchParams.entries()));
    const chartId = searchParams.get("chart_id");

    if (!chartId) {
      return NextResponse.json({ success: false, error: "missing chart_id" }, { status: 400 });
    }

    const result = await getGejuFromDB(chartId);
    if (!result) {
      return NextResponse.json({ success: false, error: "no result" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[geju] GET failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "GET failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    console.log("[geju] input ok:", body);
    const { chart_id, candidates, formations, summary } = body || {};

    if (!chart_id) {
      return NextResponse.json({ success: false, error: "missing chart_id" }, { status: 400 });
    }

    const result = await saveGejuResult({
      chart_id,
      candidates: Array.isArray(candidates) ? candidates : [],
      formations: Array.isArray(formations) ? formations : [],
      summary: summary || {
        chart_id,
        primary_pattern_code: null,
        purity_score: 0,
        purity_level: "MIXED",
        break_level: "NONE",
        break_reasons_json: [],
        mixing_flags_json: [],
        confidence: 0,
        evidence_json: {},
      },
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[geju] POST failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "POST failed" },
      { status: 500 }
    );
  }
}
