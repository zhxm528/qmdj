import { query, transaction } from "@/lib/db";

export interface HanZaoDetail {
  chart_id: string;
  evidence_type: "SEASON" | "DISTRIBUTION" | "KEY_STEM_BRANCH";
  tendency_type: "HAN" | "RE" | "ZAO" | "SHI" | "NEUTRAL";
  strength_level: "LOW" | "MEDIUM" | "HIGH";
  score: number;
  reason: string | null;
  evidence_json: any;
}

export interface HanZaoSummary {
  chart_id: string;
  han_score: number;
  re_score: number;
  zao_score: number;
  shi_score: number;
  final_tendency: "HAN" | "RE" | "ZAO" | "SHI" | "NEUTRAL";
  ruleset_id: string;
  evidence_json: any;
}

export interface HanZaoResult {
  chart_id: string;
  details: HanZaoDetail[];
  summary: HanZaoSummary;
}

const DEFAULT_RULESET = {
  ruleset_id: "default",
  season_weights: {
    spring: { HAN: 0.3, RE: 0.6, ZAO: 0.4, SHI: 0.5 },
    summer: { HAN: 0.1, RE: 0.9, ZAO: 0.7, SHI: 0.3 },
    autumn: { HAN: 0.5, RE: 0.3, ZAO: 0.7, SHI: 0.2 },
    winter: { HAN: 0.9, RE: 0.1, ZAO: 0.2, SHI: 0.7 },
  },
  element_weights: {
    木: { HAN: 0.2, RE: 0.4, ZAO: 0.2, SHI: 0.4 },
    火: { HAN: 0.0, RE: 0.8, ZAO: 0.6, SHI: 0.1 },
    土: { HAN: 0.2, RE: 0.3, ZAO: 0.6, SHI: 0.2 },
    金: { HAN: 0.5, RE: 0.2, ZAO: 0.5, SHI: 0.1 },
    水: { HAN: 0.7, RE: 0.1, ZAO: 0.1, SHI: 0.8 },
  },
  strength_level_weights: {
    LOW: 0.7,
    MEDIUM: 1.0,
    HIGH: 1.3,
  },
};

async function getFourPillarsFromDB(chartId: string) {
  const rows = await query<{
    pillar: "year" | "month" | "day" | "hour";
    sort_order: number;
    stem: string;
    branch: string;
  }>(
    `SELECT pillar, sort_order, stem, branch
     FROM public.bazi_pillar_tbl
     WHERE chart_id = $1
     ORDER BY sort_order`,
    [chartId]
  );

  return rows;
}

async function getHiddenStemsFromDB(
  branches: string[]
): Promise<Record<string, Array<{ stem_code: string; role: string }>>> {
  const rows = await query<{
    branch_code: string;
    stem_code: string;
    role: string;
  }>(
    `SELECT branch_code, stem_code, role
     FROM public.bazi_branch_hidden_stem_dict
     WHERE branch_code = ANY($1)
     ORDER BY branch_code, position`,
    [branches]
  );

  const mapping: Record<string, Array<{ stem_code: string; role: string }>> = {};
  rows.forEach((row) => {
    if (!mapping[row.branch_code]) {
      mapping[row.branch_code] = [];
    }
    mapping[row.branch_code].push({
      stem_code: row.stem_code,
      role: row.role,
    });
  });

  return mapping;
}

async function getHeavenlyStemElementMap(
  stems: string[]
): Promise<Record<string, string>> {
  if (stems.length === 0) {
    return {};
  }

  const rows = await query<{
    stem: string;
    wu_xing: string;
  }>(
    `SELECT stem, wu_xing
     FROM public.dict_heavenly_stem
     WHERE stem = ANY($1)`,
    [stems]
  );

  const mapping: Record<string, string> = {};
  rows.forEach((row) => {
    mapping[row.stem] = row.wu_xing;
  });

  return mapping;
}

async function getSeasonFromMonthBranch(monthBranch: string): Promise<string> {
  const rows = await query<{ branch: string; season: string }>(
    `SELECT branch, season FROM public.dict_branch_season WHERE branch = $1`,
    [monthBranch]
  );

  return rows.length > 0 ? rows[0].season : "冬";
}

function toSeasonKey(season: string): "spring" | "summer" | "autumn" | "winter" {
  if (season === "春") return "spring";
  if (season === "夏") return "summer";
  if (season === "秋") return "autumn";
  return "winter";
}

async function getRulesetFromDB(rulesetId: string) {
  try {
    const rows = await query<{
      ruleset_id: string;
      season_weights: any;
      element_weights: any;
      strength_level_weights: any;
    }>(
      `SELECT ruleset_id, season_weights, element_weights, strength_level_weights
       FROM public.dict_han_zao_ruleset
       WHERE ruleset_id = $1`,
      [rulesetId]
    );

    if (rows.length === 0) {
      return DEFAULT_RULESET;
    }

    const row = rows[0];
    return {
      ruleset_id: row.ruleset_id || DEFAULT_RULESET.ruleset_id,
      season_weights: row.season_weights || DEFAULT_RULESET.season_weights,
      element_weights: row.element_weights || DEFAULT_RULESET.element_weights,
      strength_level_weights:
        row.strength_level_weights || DEFAULT_RULESET.strength_level_weights,
    };
  } catch (error: any) {
    return DEFAULT_RULESET;
  }
}

function getStrengthLevel(count: number): "LOW" | "MEDIUM" | "HIGH" {
  if (count >= 3) return "HIGH";
  if (count >= 2) return "MEDIUM";
  return "LOW";
}

export async function calculateAndSaveHanZao(
  chartId: string,
  rulesetId: string = "default"
): Promise<HanZaoResult> {
  return await transaction(async (client) => {

    const pillars = await getFourPillarsFromDB(chartId);
    if (pillars.length !== 4) {
      throw new Error(`[han_zao] invalid pillars count: ${pillars.length}`);
    }

    const monthPillar = pillars.find((p) => p.pillar === "month");
    if (!monthPillar) {
      throw new Error("[han_zao] month pillar not found");
    }

    const season = await getSeasonFromMonthBranch(monthPillar.branch);
    const seasonKey = toSeasonKey(season);
    const ruleset = await getRulesetFromDB(rulesetId);

    const allStems = Array.from(new Set(pillars.map((p) => p.stem)));
    const stemElementMap = await getHeavenlyStemElementMap(allStems);
    const hiddenStemsMap = await getHiddenStemsFromDB(pillars.map((p) => p.branch));
    const hiddenStemCodes = Array.from(
      new Set(Object.values(hiddenStemsMap).flat().map((h) => h.stem_code))
    );
    const hiddenElementMap = await getHeavenlyStemElementMap(hiddenStemCodes);

    const elementCounts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    pillars.forEach((p) => {
      const element = stemElementMap[p.stem];
      if (element) {
        elementCounts[element] = (elementCounts[element] || 0) + 1;
      }
    });
    Object.values(hiddenStemsMap).forEach((items) => {
      items.forEach((h) => {
        const element = hiddenElementMap[h.stem_code];
        if (element) {
          elementCounts[element] = (elementCounts[element] || 0) + 1;
        }
      });
    });

    const details: HanZaoDetail[] = [];
    const tendencyScores: Record<string, number> = { HAN: 0, RE: 0, ZAO: 0, SHI: 0 };

    const seasonWeights = ruleset.season_weights?.[seasonKey] || {};
    (["HAN", "RE", "ZAO", "SHI"] as const).forEach((tendency) => {
      const score = typeof seasonWeights[tendency] === "number" ? seasonWeights[tendency] : 0;
      if (score <= 0) return;
      tendencyScores[tendency] += score;
      details.push({
        chart_id: chartId,
        evidence_type: "SEASON",
        tendency_type: tendency,
        strength_level: "MEDIUM",
        score,
        reason: `季节 ${season} 偏向 ${tendency}`,
        evidence_json: { season, season_key: seasonKey },
      });
    });

    (Object.keys(elementCounts) as Array<keyof typeof elementCounts>).forEach((element) => {
      const count = elementCounts[element] || 0;
      if (count <= 0) {
        return;
      }
      const strengthLevel = getStrengthLevel(count);
      const strengthWeight =
        ruleset.strength_level_weights?.[strengthLevel] ??
        DEFAULT_RULESET.strength_level_weights[strengthLevel];
      const elementWeights = ruleset.element_weights?.[element] || {};

      (["HAN", "RE", "ZAO", "SHI"] as const).forEach((tendency) => {
        const weight = typeof elementWeights[tendency] === "number" ? elementWeights[tendency] : 0;
        if (weight === 0) return;
        const score = count * weight * strengthWeight;
        tendencyScores[tendency] += score;
      });
    });

    (["HAN", "RE", "ZAO", "SHI"] as const).forEach((tendency) => {
      const score = tendencyScores[tendency];
      if (score <= 0) return;
      const strengthLevel = score >= 2 ? "HIGH" : score >= 1 ? "MEDIUM" : "LOW";
      details.push({
        chart_id: chartId,
        evidence_type: "DISTRIBUTION",
        tendency_type: tendency,
        strength_level: strengthLevel,
        score,
        reason: "五行分布综合",
        evidence_json: { element_counts: elementCounts },
      });
    });

    const finalTendencyEntry = Object.entries(tendencyScores).sort((a, b) => b[1] - a[1])[0];
    const finalTendency =
      finalTendencyEntry && finalTendencyEntry[1] > 0
        ? (finalTendencyEntry[0] as HanZaoSummary["final_tendency"])
        : "NEUTRAL";

    const summary: HanZaoSummary = {
      chart_id: chartId,
      han_score: tendencyScores.HAN,
      re_score: tendencyScores.RE,
      zao_score: tendencyScores.ZAO,
      shi_score: tendencyScores.SHI,
      final_tendency: finalTendency,
      ruleset_id: ruleset.ruleset_id,
      evidence_json: {
        season,
        element_counts: elementCounts,
        detail_count: details.length,
      },
    };

    try {
      await client.query(`DELETE FROM public.bazi_han_zao_detail_tbl WHERE chart_id = $1`, [
        chartId,
      ]);
      await client.query(`DELETE FROM public.bazi_han_zao_summary_tbl WHERE chart_id = $1`, [
        chartId,
      ]);

      if (details.length > 0) {
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        for (const detail of details) {
          placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`
          );
          values.push(
            detail.chart_id,
            detail.evidence_type,
            detail.tendency_type,
            detail.strength_level,
            detail.score,
            detail.reason,
            JSON.stringify(detail.evidence_json),
            new Date()
          );
          paramIndex += 8;
        }

        await client.query(
          `INSERT INTO public.bazi_han_zao_detail_tbl(
            chart_id, evidence_type, tendency_type, strength_level, score,
            reason, evidence_json, created_at
          ) VALUES ${placeholders.join(",")}`,
          values
        );
      }

      await client.query(
        `INSERT INTO public.bazi_han_zao_summary_tbl(
          chart_id, han_score, re_score, zao_score, shi_score, final_tendency,
          ruleset_id, evidence_json, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (chart_id) DO UPDATE SET
          han_score = EXCLUDED.han_score,
          re_score = EXCLUDED.re_score,
          zao_score = EXCLUDED.zao_score,
          shi_score = EXCLUDED.shi_score,
          final_tendency = EXCLUDED.final_tendency,
          ruleset_id = EXCLUDED.ruleset_id,
          evidence_json = EXCLUDED.evidence_json,
          created_at = NOW()`,
        [
          summary.chart_id,
          summary.han_score,
          summary.re_score,
          summary.zao_score,
          summary.shi_score,
          summary.final_tendency,
          summary.ruleset_id,
          JSON.stringify(summary.evidence_json),
          new Date(),
        ]
      );
    } catch (dbError: any) {
      if (dbError.code === "42P01") {
      } else {
      }
    }

    return {
      chart_id: chartId,
      details,
      summary,
    };
  });
}

export async function getHanZaoFromDB(chartId: string): Promise<HanZaoResult | null> {
  try {
    const detailRows = await query<{
      chart_id: string;
      evidence_type: "SEASON" | "DISTRIBUTION" | "KEY_STEM_BRANCH";
      tendency_type: "HAN" | "RE" | "ZAO" | "SHI" | "NEUTRAL";
      strength_level: "LOW" | "MEDIUM" | "HIGH";
      score: number;
      reason: string | null;
      evidence_json: any;
    }>(
      `SELECT chart_id, evidence_type, tendency_type, strength_level, score, reason, evidence_json
       FROM public.bazi_han_zao_detail_tbl
       WHERE chart_id = $1
       ORDER BY tendency_type, evidence_type`,
      [chartId]
    );

    const summaryRows = await query<{
      chart_id: string;
      han_score: number;
      re_score: number;
      zao_score: number;
      shi_score: number;
      final_tendency: "HAN" | "RE" | "ZAO" | "SHI" | "NEUTRAL";
      ruleset_id: string;
      evidence_json: any;
    }>(
      `SELECT chart_id, han_score, re_score, zao_score, shi_score,
              final_tendency, ruleset_id, evidence_json
       FROM public.bazi_han_zao_summary_tbl
       WHERE chart_id = $1`,
      [chartId]
    );

    if (detailRows.length === 0 && summaryRows.length === 0) {
      return null;
    }

    const details: HanZaoDetail[] = detailRows.map((row) => ({
      chart_id: row.chart_id,
      evidence_type: row.evidence_type,
      tendency_type: row.tendency_type,
      strength_level: row.strength_level,
      score: typeof row.score === "number" ? row.score : parseFloat(String(row.score)),
      reason: row.reason,
      evidence_json:
        typeof row.evidence_json === "string" ? JSON.parse(row.evidence_json) : row.evidence_json,
    }));

    const summaryRow = summaryRows[0];
    const summary: HanZaoSummary = summaryRow
      ? {
          chart_id: summaryRow.chart_id,
          han_score:
            typeof summaryRow.han_score === "number"
              ? summaryRow.han_score
              : parseFloat(String(summaryRow.han_score)),
          re_score:
            typeof summaryRow.re_score === "number"
              ? summaryRow.re_score
              : parseFloat(String(summaryRow.re_score)),
          zao_score:
            typeof summaryRow.zao_score === "number"
              ? summaryRow.zao_score
              : parseFloat(String(summaryRow.zao_score)),
          shi_score:
            typeof summaryRow.shi_score === "number"
              ? summaryRow.shi_score
              : parseFloat(String(summaryRow.shi_score)),
          final_tendency: summaryRow.final_tendency,
          ruleset_id: summaryRow.ruleset_id,
          evidence_json:
            typeof summaryRow.evidence_json === "string"
              ? JSON.parse(summaryRow.evidence_json)
              : summaryRow.evidence_json,
        }
      : {
          chart_id: chartId,
          han_score: 0,
          re_score: 0,
          zao_score: 0,
          shi_score: 0,
          final_tendency: "NEUTRAL",
          ruleset_id: "default",
          evidence_json: null,
        };

    return {
      chart_id: chartId,
      details,
      summary,
    };
  } catch (error: any) {
    if (error.code === "42P01") {
      return null;
    }
    return null;
  }
}
