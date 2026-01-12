import { NextRequest, NextResponse } from "next/server";
import { calculateAndSaveHanZao, getHanZaoFromDB } from "./utils";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    console.log("[han_zao] input ok:", Object.fromEntries(searchParams.entries()));
    const chartId = searchParams.get("chart_id");

    if (!chartId) {
      return NextResponse.json({ success: false, error: "missing chart_id" }, { status: 400 });
    }

    const result = await getHanZaoFromDB(chartId);
    if (!result) {
      return NextResponse.json({ success: false, error: "no result" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[han_zao] GET failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "GET failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    console.log("[han_zao] input ok:", body);
    const { chart_id, ruleset_id = "default" } = body;

    if (!chart_id) {
      return NextResponse.json({ success: false, error: "missing chart_id" }, { status: 400 });
    }

    const result = await calculateAndSaveHanZao(chart_id, ruleset_id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[han_zao] POST failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "POST failed" },
      { status: 500 }
    );
  }
}
