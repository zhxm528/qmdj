import { NextRequest, NextResponse } from "next/server";
import { saveTenshenProfile, getTenshenProfileFromDB } from "./utils";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    console.log("[tenshen_profile] input ok:", Object.fromEntries(searchParams.entries()));
    const chartId = searchParams.get("chart_id");
    const version = searchParams.get("version") || "v1";

    if (!chartId) {
      return NextResponse.json({ success: false, error: "missing chart_id" }, { status: 400 });
    }

    const result = await getTenshenProfileFromDB(chartId, version);
    if (!result) {
      return NextResponse.json({ success: false, error: "no result" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[tenshen_profile] GET failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "GET failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    console.log("[tenshen_profile] input ok:", body);
    const { chart_id, summary, items, evidence } = body || {};

    if (!chart_id || !summary) {
      return NextResponse.json({ success: false, error: "missing payload" }, { status: 400 });
    }

    const saved = await saveTenshenProfile({
      chart_id,
      summary,
      items: Array.isArray(items) ? items : [],
      evidence: Array.isArray(evidence) ? evidence : [],
    });
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    console.error("[tenshen_profile] POST failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "POST failed" },
      { status: 500 }
    );
  }
}
