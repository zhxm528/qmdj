import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";

export interface CheckIssue {
  chart_id: string;
  issue_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  message: string;
  evidence_json: any;
}

export interface CheckResultRow {
  chart_id: string;
  calc_version: string;
  is_valid: boolean;
  consistency_score: number;
  disease_tags_json: any;
  remedy_json: any;
  issues_json: any;
  evidence_json: any;
}

export interface CheckResult {
  chart_id: string;
  result: CheckResultRow;
  issues: CheckIssue[];
}

export async function saveCheckResult(payload: CheckResult): Promise<CheckResult> {
  return await transaction(async (client) => {
    const { chart_id, result, issues } = payload;

    try {
      await client.query(`DELETE FROM public.bazi_check_issue_tbl WHERE chart_id = $1`, [chart_id]);
      await client.query(
        `DELETE FROM public.bazi_check_result_tbl WHERE chart_id = $1 AND calc_version = $2`,
        [chart_id, result.calc_version]
      );

      await client.query(
        `INSERT INTO public.bazi_check_result_tbl(
          chart_id, calc_version, is_valid, consistency_score,
          disease_tags_json, remedy_json, issues_json, evidence_json, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          chart_id,
          result.calc_version,
          result.is_valid,
          result.consistency_score,
          JSON.stringify(result.disease_tags_json || []),
          JSON.stringify(result.remedy_json || {}),
          JSON.stringify(result.issues_json || []),
          JSON.stringify(result.evidence_json || {}),
          new Date(),
        ]
      );

      if (issues.length > 0) {
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        for (const item of issues) {
          placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`
          );
          values.push(
            chart_id,
            item.issue_type,
            item.severity,
            item.message,
            JSON.stringify(item.evidence_json || {}),
            new Date()
          );
          paramIndex += 6;
        }

        await client.query(
          `INSERT INTO public.bazi_check_issue_tbl(
            chart_id, issue_type, severity, message, evidence_json, created_at
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

export async function getCheckFromDB(
  chartId: string,
  calcVersion: string = "v1"
): Promise<CheckResult | null> {
  try {
    const resultRows = await query<CheckResultRow>(
      `SELECT chart_id, calc_version, is_valid, consistency_score,
              disease_tags_json, remedy_json, issues_json, evidence_json
       FROM public.bazi_check_result_tbl
       WHERE chart_id = $1 AND calc_version = $2`,
      [chartId, calcVersion]
    );

    const issueRows = await query<CheckIssue>(
      `SELECT chart_id, issue_type, severity, message, evidence_json
       FROM public.bazi_check_issue_tbl
       WHERE chart_id = $1
       ORDER BY severity DESC, created_at DESC`,
      [chartId]
    );

    if (resultRows.length === 0 && issueRows.length === 0) {
      return null;
    }

    const resultRow = resultRows[0];
    const result: CheckResultRow = resultRow
      ? {
          ...resultRow,
          consistency_score:
            typeof resultRow.consistency_score === "number"
              ? resultRow.consistency_score
              : parseFloat(String(resultRow.consistency_score)),
          disease_tags_json:
            typeof resultRow.disease_tags_json === "string"
              ? JSON.parse(resultRow.disease_tags_json)
              : resultRow.disease_tags_json,
          remedy_json:
            typeof resultRow.remedy_json === "string"
              ? JSON.parse(resultRow.remedy_json)
              : resultRow.remedy_json,
          issues_json:
            typeof resultRow.issues_json === "string"
              ? JSON.parse(resultRow.issues_json)
              : resultRow.issues_json,
          evidence_json:
            typeof resultRow.evidence_json === "string"
              ? JSON.parse(resultRow.evidence_json)
              : resultRow.evidence_json,
        }
      : {
          chart_id: chartId,
          calc_version: calcVersion,
          is_valid: true,
          consistency_score: 0,
          disease_tags_json: [],
          remedy_json: {},
          issues_json: [],
          evidence_json: {},
        };

    const issues = issueRows.map((row) => ({
      ...row,
      evidence_json:
        typeof row.evidence_json === "string" ? JSON.parse(row.evidence_json) : row.evidence_json,
    }));

    return {
      chart_id: chartId,
      result,
      issues,
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
    console.log("[check] input ok:", Object.fromEntries(searchParams.entries()));
    const chartId = searchParams.get("chart_id");
    const calcVersion = searchParams.get("calc_version") || "v1";

    if (!chartId) {
      return NextResponse.json({ success: false, error: "missing chart_id" }, { status: 400 });
    }

    const result = await getCheckFromDB(chartId, calcVersion);
    if (!result) {
      return NextResponse.json({ success: false, error: "no result" }, { status: 404 });
    }
    console.log("[check] response ok:", { success: true });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[check] GET failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "GET failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    console.log("[check] input ok:", body);
    const { chart_id, result, issues } = body || {};

    if (!chart_id || !result) {
      return NextResponse.json({ success: false, error: "missing payload" }, { status: 400 });
    }

    const saved = await saveCheckResult({
      chart_id,
      result,
      issues: Array.isArray(issues) ? issues : [],
    });
    console.log("[check] response ok:", { success: true });
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    console.error("[check] POST failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "POST failed" },
      { status: 500 }
    );
  }
}
