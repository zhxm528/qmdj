import { NextRequest, NextResponse } from "next/server";
import { saveYongshenResult, getYongshenFromDB } from "./utils";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    console.log("[yongshen] input ok:", Object.fromEntries(searchParams.entries()));
    const chartId = searchParams.get("chart_id");
    const calcVersion = searchParams.get("calc_version") || "v1";

    if (!chartId) {
      return NextResponse.json({ success: false, error: "missing chart_id" }, { status: 400 });
    }

    const result = await getYongshenFromDB(chartId, calcVersion);
    if (!result) {
      return NextResponse.json({ success: false, error: "no result" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[yongshen] GET failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "GET failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    console.log("[yongshen] input ok:", body);
    const { chart_id, result, element_scores } = body || {};

    if (!chart_id || !result) {
      return NextResponse.json({ success: false, error: "missing payload" }, { status: 400 });
    }

    const saved = await saveYongshenResult({
      chart_id,
      result,
      element_scores: Array.isArray(element_scores) ? element_scores : [],
    });
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    console.error("[yongshen] POST failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "POST failed" },
      { status: 500 }
    );
  }
}
