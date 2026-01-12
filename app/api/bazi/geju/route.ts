import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";

export interface GejuCandidate {
  chart_id: string;
  candidate_id?: string | null;
  pattern_code: string;
  core_tenshen?: string | null;
  core_pillar?: "YEAR" | "MONTH" | "DAY" | "HOUR" | null;
  is_primary: boolean;
  score: number;
  confidence: number;
  evidence_json: any;
}

export interface GejuFormation {
  chart_id: string;
  formation_type: string;
  formation_code: string;
  members: any;
  status: "FORMED" | "PARTIAL" | "BROKEN";
  score: number;
  confidence: number;
  break_reasons_json: any;
  evidence_json: any;
}

export interface GejuSummary {
  chart_id: string;
  primary_pattern_code?: string | null;
  purity_score: number;
  purity_level: "CLEAN" | "RELATIVELY_CLEAN" | "MIXED" | "HEAVILY_MIXED";
  break_level: "NONE" | "LIGHT" | "MEDIUM" | "HEAVY";
  break_reasons_json: any;
  mixing_flags_json: any;
  confidence: number;
  evidence_json: any;
}

export interface GejuResult {
  chart_id: string;
  candidates: GejuCandidate[];
  formations: GejuFormation[];
  summary: GejuSummary;
}

export async function saveGejuResult(result: GejuResult): Promise<GejuResult> {
  return await transaction(async (client) => {
    const { chart_id, candidates, formations, summary } = result;

    try {
      await client.query(`DELETE FROM public.bazi_geju_candidate_result_tbl WHERE chart_id = $1`, [
        chart_id,
      ]);
      await client.query(`DELETE FROM public.bazi_chengju_result_tbl WHERE chart_id = $1`, [
        chart_id,
      ]);

      if (candidates.length > 0) {
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        for (const item of candidates) {
          placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`
          );
          values.push(
            chart_id,
            item.candidate_id ?? null,
            item.pattern_code,
            item.core_tenshen ?? null,
            item.core_pillar ?? null,
            item.is_primary,
            item.score,
            item.confidence,
            JSON.stringify(item.evidence_json ?? {}),
            new Date()
          );
          paramIndex += 10;
        }

        await client.query(
          `INSERT INTO public.bazi_geju_candidate_result_tbl(
            chart_id, candidate_id, pattern_code, core_tenshen, core_pillar,
            is_primary, score, confidence, evidence_json, created_at
          ) VALUES ${placeholders.join(",")}`,
          values
        );
      }

      if (formations.length > 0) {
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        for (const item of formations) {
          placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`
          );
          values.push(
            chart_id,
            item.formation_type,
            item.formation_code,
            JSON.stringify(item.members ?? {}),
            item.status,
            item.score,
            item.confidence,
            JSON.stringify(item.break_reasons_json ?? {}),
            JSON.stringify(item.evidence_json ?? {}),
            new Date()
          );
          paramIndex += 10;
        }

        await client.query(
          `INSERT INTO public.bazi_chengju_result_tbl(
            chart_id, formation_type, formation_code, members, status,
            score, confidence, break_reasons_json, evidence_json, created_at
          ) VALUES ${placeholders.join(",")}`,
          values
        );
      }

      await client.query(
        `INSERT INTO public.bazi_poqing_summary_tbl(
          chart_id, primary_pattern_code, purity_score, purity_level, break_level,
          break_reasons_json, mixing_flags_json, confidence, evidence_json, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (chart_id) DO UPDATE SET
          primary_pattern_code = EXCLUDED.primary_pattern_code,
          purity_score = EXCLUDED.purity_score,
          purity_level = EXCLUDED.purity_level,
          break_level = EXCLUDED.break_level,
          break_reasons_json = EXCLUDED.break_reasons_json,
          mixing_flags_json = EXCLUDED.mixing_flags_json,
          confidence = EXCLUDED.confidence,
          evidence_json = EXCLUDED.evidence_json,
          created_at = NOW()`,
        [
          chart_id,
          summary.primary_pattern_code ?? null,
          summary.purity_score,
          summary.purity_level,
          summary.break_level,
          JSON.stringify(summary.break_reasons_json ?? {}),
          JSON.stringify(summary.mixing_flags_json ?? {}),
          summary.confidence,
          JSON.stringify(summary.evidence_json ?? {}),
          new Date(),
        ]
      );
    } catch (dbError: any) {
      if (dbError.code === "42P01") {
      } else {
      }
    }

    return result;
  });
}

export async function getGejuFromDB(chartId: string): Promise<GejuResult | null> {
  try {
    const candidateRows = await query<GejuCandidate>(
      `SELECT chart_id, candidate_id, pattern_code, core_tenshen, core_pillar,
              is_primary, score, confidence, evidence_json
       FROM public.bazi_geju_candidate_result_tbl
       WHERE chart_id = $1
       ORDER BY score DESC, created_at DESC`,
      [chartId]
    );

    const formationRows = await query<GejuFormation>(
      `SELECT chart_id, formation_type, formation_code, members, status,
              score, confidence, break_reasons_json, evidence_json
       FROM public.bazi_chengju_result_tbl
       WHERE chart_id = $1
       ORDER BY score DESC, created_at DESC`,
      [chartId]
    );

    const summaryRows = await query<GejuSummary>(
      `SELECT chart_id, primary_pattern_code, purity_score, purity_level, break_level,
              break_reasons_json, mixing_flags_json, confidence, evidence_json
       FROM public.bazi_poqing_summary_tbl
       WHERE chart_id = $1`,
      [chartId]
    );

    if (candidateRows.length === 0 && formationRows.length === 0 && summaryRows.length === 0) {
      return null;
    }

    const candidates = candidateRows.map((row) => ({
      ...row,
      score: typeof row.score === "number" ? row.score : parseFloat(String(row.score)),
      confidence:
        typeof row.confidence === "number" ? row.confidence : parseFloat(String(row.confidence)),
      evidence_json:
        typeof row.evidence_json === "string" ? JSON.parse(row.evidence_json) : row.evidence_json,
    }));

    const formations = formationRows.map((row) => ({
      ...row,
      score: typeof row.score === "number" ? row.score : parseFloat(String(row.score)),
      confidence:
        typeof row.confidence === "number" ? row.confidence : parseFloat(String(row.confidence)),
      members: typeof row.members === "string" ? JSON.parse(row.members) : row.members,
      break_reasons_json:
        typeof row.break_reasons_json === "string"
          ? JSON.parse(row.break_reasons_json)
          : row.break_reasons_json,
      evidence_json:
        typeof row.evidence_json === "string" ? JSON.parse(row.evidence_json) : row.evidence_json,
    }));

    const summaryRow = summaryRows[0];
    const summary: GejuSummary = summaryRow
      ? {
          ...summaryRow,
          purity_score:
            typeof summaryRow.purity_score === "number"
              ? summaryRow.purity_score
              : parseFloat(String(summaryRow.purity_score)),
          confidence:
            typeof summaryRow.confidence === "number"
              ? summaryRow.confidence
              : parseFloat(String(summaryRow.confidence)),
          break_reasons_json:
            typeof summaryRow.break_reasons_json === "string"
              ? JSON.parse(summaryRow.break_reasons_json)
              : summaryRow.break_reasons_json,
          mixing_flags_json:
            typeof summaryRow.mixing_flags_json === "string"
              ? JSON.parse(summaryRow.mixing_flags_json)
              : summaryRow.mixing_flags_json,
          evidence_json:
            typeof summaryRow.evidence_json === "string"
              ? JSON.parse(summaryRow.evidence_json)
              : summaryRow.evidence_json,
        }
      : {
          chart_id: chartId,
          primary_pattern_code: null,
          purity_score: 0,
          purity_level: "MIXED",
          break_level: "NONE",
          break_reasons_json: [],
          mixing_flags_json: [],
          confidence: 0,
          evidence_json: {},
        };

    return {
      chart_id: chartId,
      candidates,
      formations,
      summary,
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
