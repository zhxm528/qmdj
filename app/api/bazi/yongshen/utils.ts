import { query, transaction } from "@/lib/db";

export interface YongshenResultRow {
  chart_id: string;
  calc_version: string;
  school_code: string | null;
  dm_strength_level: string;
  dm_strength_score: number;
  primary_yongshen_element: string;
  secondary_yongshen_element: string | null;
  xishen_elements: any;
  jishen_elements: any;
  confidence: number;
  evidence_json: any;
}

export interface ElementScoreRow {
  chart_id: string;
  element: string;
  score_total: number;
  score_by_layer: any;
  reason_json: any;
}

export interface YongshenResult {
  chart_id: string;
  result: YongshenResultRow;
  element_scores: ElementScoreRow[];
}

export async function saveYongshenResult(payload: YongshenResult): Promise<YongshenResult> {
  return await transaction(async (client) => {
    const { chart_id, result, element_scores } = payload;

    try {
      await client.query(`DELETE FROM public.bazi_element_score_tbl WHERE chart_id = $1`, [
        chart_id,
      ]);

      await client.query(
        `DELETE FROM public.bazi_yongshen_result_tbl WHERE chart_id = $1 AND calc_version = $2`,
        [chart_id, result.calc_version]
      );

      await client.query(
        `INSERT INTO public.bazi_yongshen_result_tbl(
          chart_id, calc_version, school_code, dm_strength_level, dm_strength_score,
          primary_yongshen_element, secondary_yongshen_element, xishen_elements,
          jishen_elements, confidence, evidence_json, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          chart_id,
          result.calc_version,
          result.school_code,
          result.dm_strength_level,
          result.dm_strength_score,
          result.primary_yongshen_element,
          result.secondary_yongshen_element,
          JSON.stringify(result.xishen_elements || []),
          JSON.stringify(result.jishen_elements || []),
          result.confidence,
          JSON.stringify(result.evidence_json || {}),
          new Date(),
        ]
      );

      if (element_scores.length > 0) {
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        for (const item of element_scores) {
          placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`
          );
          values.push(
            chart_id,
            item.element,
            item.score_total,
            JSON.stringify(item.score_by_layer || {}),
            JSON.stringify(item.reason_json || {}),
            new Date()
          );
          paramIndex += 6;
        }

        await client.query(
          `INSERT INTO public.bazi_element_score_tbl(
            chart_id, element, score_total, score_by_layer, reason_json, created_at
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

export async function getYongshenFromDB(
  chartId: string,
  calcVersion: string = "v1"
): Promise<YongshenResult | null> {
  try {
    const resultRows = await query<YongshenResultRow>(
      `SELECT chart_id, calc_version, school_code, dm_strength_level, dm_strength_score,
              primary_yongshen_element, secondary_yongshen_element, xishen_elements,
              jishen_elements, confidence, evidence_json
       FROM public.bazi_yongshen_result_tbl
       WHERE chart_id = $1 AND calc_version = $2`,
      [chartId, calcVersion]
    );

    const scoreRows = await query<ElementScoreRow>(
      `SELECT chart_id, element, score_total, score_by_layer, reason_json
       FROM public.bazi_element_score_tbl
       WHERE chart_id = $1
       ORDER BY score_total DESC`,
      [chartId]
    );

    if (resultRows.length === 0 && scoreRows.length === 0) {
      return null;
    }

    const resultRow = resultRows[0];
    const result: YongshenResultRow = resultRow
      ? {
          ...resultRow,
          dm_strength_score:
            typeof resultRow.dm_strength_score === "number"
              ? resultRow.dm_strength_score
              : parseFloat(String(resultRow.dm_strength_score)),
          confidence:
            typeof resultRow.confidence === "number"
              ? resultRow.confidence
              : parseFloat(String(resultRow.confidence)),
          xishen_elements:
            typeof resultRow.xishen_elements === "string"
              ? JSON.parse(resultRow.xishen_elements)
              : resultRow.xishen_elements,
          jishen_elements:
            typeof resultRow.jishen_elements === "string"
              ? JSON.parse(resultRow.jishen_elements)
              : resultRow.jishen_elements,
          evidence_json:
            typeof resultRow.evidence_json === "string"
              ? JSON.parse(resultRow.evidence_json)
              : resultRow.evidence_json,
        }
      : {
          chart_id: chartId,
          calc_version: calcVersion,
          school_code: null,
          dm_strength_level: "",
          dm_strength_score: 0,
          primary_yongshen_element: "土",
          secondary_yongshen_element: null,
          xishen_elements: [],
          jishen_elements: [],
          confidence: 0,
          evidence_json: {},
        };

    const element_scores = scoreRows.map((row) => ({
      ...row,
      score_total:
        typeof row.score_total === "number" ? row.score_total : parseFloat(String(row.score_total)),
      score_by_layer:
        typeof row.score_by_layer === "string" ? JSON.parse(row.score_by_layer) : row.score_by_layer,
      reason_json:
        typeof row.reason_json === "string" ? JSON.parse(row.reason_json) : row.reason_json,
    }));

    return {
      chart_id: chartId,
      result,
      element_scores,
    };
  } catch (error: any) {
    if (error.code === "42P01") {
      return null;
    }
    return null;
  }
}
