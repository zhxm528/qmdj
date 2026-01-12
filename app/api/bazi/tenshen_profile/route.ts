import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";

export interface TenshenProfileSummaryRow {
  chart_id: string;
  version: string;
  profile_json: any;
  confidence: number;
  notes: string | null;
}

export interface TenshenProfileItemRow {
  chart_id: string;
  tenshen_code: string;
  count_stem: number;
  count_hidden: number;
  count_total: number;
  score_stem: number;
  score_hidden: number;
  score_total: number;
  rank_no: number;
  is_present: boolean;
  evidence_json: any;
}

export interface TenshenEvidenceRow {
  chart_id: string;
  tenshen_code: string;
  pillar: "YEAR" | "MONTH" | "DAY" | "HOUR";
  source_type: "STEM" | "HIDDEN_MAIN" | "HIDDEN_MID" | "HIDDEN_TAIL";
  stem_code: string;
  element: "木" | "火" | "土" | "金" | "水";
  yinyang: "阴" | "阳";
  base_weight: number;
  season_factor: number;
  root_factor: number;
  relation_factor: number;
  effective_weight: number;
  tags: any;
  meta_json: any;
}

export interface TenshenProfileResult {
  chart_id: string;
  summary: TenshenProfileSummaryRow;
  items: TenshenProfileItemRow[];
  evidence: TenshenEvidenceRow[];
}

export async function saveTenshenProfile(
  payload: TenshenProfileResult
): Promise<TenshenProfileResult> {
  return await transaction(async (client) => {
    const { chart_id, summary, items, evidence } = payload;

    try {
      await client.query(
        `DELETE FROM public.bazi_tenshen_profile_static_tbl WHERE chart_id = $1 AND version = $2`,
        [chart_id, summary.version]
      );
      await client.query(
        `DELETE FROM public.bazi_tenshen_profile_static_item_tbl WHERE chart_id = $1`,
        [chart_id]
      );
      await client.query(
        `DELETE FROM public.bazi_tenshen_evidence_tbl WHERE chart_id = $1`,
        [chart_id]
      );

      await client.query(
        `INSERT INTO public.bazi_tenshen_profile_static_tbl(
          chart_id, version, generated_at, profile_json, confidence, notes
        ) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          chart_id,
          summary.version,
          new Date(),
          JSON.stringify(summary.profile_json || {}),
          summary.confidence,
          summary.notes,
        ]
      );

      if (items.length > 0) {
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        for (const item of items) {
          placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11})`
          );
          values.push(
            chart_id,
            item.tenshen_code,
            item.count_stem,
            item.count_hidden,
            item.count_total,
            item.score_stem,
            item.score_hidden,
            item.score_total,
            item.rank_no,
            item.is_present,
            JSON.stringify(item.evidence_json || {}),
            new Date()
          );
          paramIndex += 12;
        }

        await client.query(
          `INSERT INTO public.bazi_tenshen_profile_static_item_tbl(
            chart_id, tenshen_code, count_stem, count_hidden, count_total,
            score_stem, score_hidden, score_total, rank_no, is_present,
            evidence_json, created_at
          ) VALUES ${placeholders.join(",")}`,
          values
        );
      }

      if (evidence.length > 0) {
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        for (const item of evidence) {
          placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, $${paramIndex + 13}, $${paramIndex + 14})`
          );
          values.push(
            chart_id,
            item.tenshen_code,
            item.pillar,
            item.source_type,
            item.stem_code,
            item.element,
            item.yinyang,
            item.base_weight,
            item.season_factor,
            item.root_factor,
            item.relation_factor,
            item.effective_weight,
            JSON.stringify(item.tags || []),
            JSON.stringify(item.meta_json || {}),
            new Date()
          );
          paramIndex += 15;
        }

        await client.query(
          `INSERT INTO public.bazi_tenshen_evidence_tbl(
            chart_id, tenshen_code, pillar, source_type, stem_code, element, yinyang,
            base_weight, season_factor, root_factor, relation_factor, effective_weight,
            tags, meta_json, created_at
          ) VALUES ${placeholders.join(",")}`,
          values
        );
      }
    } catch (dbError: any) {
      if (dbError.code === "42P01") {
      } else {
      }
    }

    return payload;
  });
}

export async function getTenshenProfileFromDB(
  chartId: string,
  version: string = "v1"
): Promise<TenshenProfileResult | null> {
  try {
    const summaryRows = await query<TenshenProfileSummaryRow>(
      `SELECT chart_id, version, profile_json, confidence, notes
       FROM public.bazi_tenshen_profile_static_tbl
       WHERE chart_id = $1 AND version = $2`,
      [chartId, version]
    );

    const itemRows = await query<TenshenProfileItemRow>(
      `SELECT chart_id, tenshen_code, count_stem, count_hidden, count_total,
              score_stem, score_hidden, score_total, rank_no, is_present, evidence_json
       FROM public.bazi_tenshen_profile_static_item_tbl
       WHERE chart_id = $1
       ORDER BY rank_no ASC`,
      [chartId]
    );

    if (summaryRows.length === 0 && itemRows.length === 0) {
      return null;
    }

    const summaryRow = summaryRows[0];
    const summary: TenshenProfileSummaryRow = summaryRow
      ? {
          ...summaryRow,
          profile_json:
            typeof summaryRow.profile_json === "string"
              ? JSON.parse(summaryRow.profile_json)
              : summaryRow.profile_json,
          confidence:
            typeof summaryRow.confidence === "number"
              ? summaryRow.confidence
              : parseFloat(String(summaryRow.confidence)),
        }
      : {
          chart_id: chartId,
          version,
          profile_json: {},
          confidence: 0,
          notes: null,
        };

    const items = itemRows.map((row) => ({
      ...row,
      score_stem:
        typeof row.score_stem === "number" ? row.score_stem : parseFloat(String(row.score_stem)),
      score_hidden:
        typeof row.score_hidden === "number"
          ? row.score_hidden
          : parseFloat(String(row.score_hidden)),
      score_total:
        typeof row.score_total === "number" ? row.score_total : parseFloat(String(row.score_total)),
      evidence_json:
        typeof row.evidence_json === "string" ? JSON.parse(row.evidence_json) : row.evidence_json,
    }));

    return {
      chart_id: chartId,
      summary,
      items,
      evidence: [],
    };
  } catch (error: any) {
    if (error.code === "42P01") {
      return null;
    }
    return null;
  }
}

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
