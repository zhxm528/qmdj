import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";

export interface KeXieDetail {
  chart_id: string;
  day_master_stem: string;
  day_master_element: string;
  evidence_type: "XIE" | "HAO" | "KE" | "ZHIHUA";
  source_type: "SHISHANG" | "CAI" | "GUANSHA" | "HEHUA";
  strength_state: string;
  flags_json: any;
  score: number;
  weight_json: any;
  reason: string | null;
  evidence_json: any;
}

export interface KeXieSummary {
  chart_id: string;
  total_score: number;
  xie_score: number;
  hao_score: number;
  ke_score: number;
  zhihua_score: number;
  ruleset_id: string;
  evidence_json: any;
}

export interface KeXieResult {
  chart_id: string;
  details: KeXieDetail[];
  summary: KeXieSummary;
}

const DEFAULT_RULESET = {
  ruleset_id: "default",
  season_state_weights: {
    旺: 1.2,
    相: 1.0,
    休: 0.7,
    囚: 0.5,
    死: 0.3,
    UNKNOWN: 1.0,
  },
  tougan_weight: 0.3,
  tonggen_weight: 0.3,
  chengshi_weight: 0.4,
  hehua_weight: -0.4,
  type_weights: {
    XIE: 1.0,
    HAO: 1.0,
    KE: 1.0,
    ZHIHUA: 1.0,
  },
};

const WUXING_SHENG: Record<string, string> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

const WUXING_KE: Record<string, string> = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木",
};

const WUXING_BE_KE: Record<string, string> = {
  木: "金",
  火: "水",
  土: "木",
  金: "火",
  水: "土",
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

async function getSeasonSnapshotFromDB(
  chartId: string,
  rulesetId: string
): Promise<Record<string, { state: string; score: number }>> {
  const rows = await query<{
    element: string;
    state: string;
    score: number;
  }>(
    `SELECT element, state, score
     FROM public.bazi_season_element_state_snapshot_tbl
     WHERE chart_id = $1 AND ruleset_id = $2`,
    [chartId, rulesetId]
  );

  const mapping: Record<string, { state: string; score: number }> = {};
  rows.forEach((row) => {
    mapping[row.element] = {
      state: row.state,
      score: typeof row.score === "number" ? row.score : parseFloat(String(row.score)),
    };
  });

  return mapping;
}

async function getRulesetFromDB(rulesetId: string) {
  try {
    const rows = await query<{
      ruleset_id: string;
      season_state_weights: any;
      tougan_weight: number;
      tonggen_weight: number;
      chengshi_weight: number;
      hehua_weight: number;
      type_weights: any;
    }>(
      `SELECT ruleset_id, season_state_weights, tougan_weight, tonggen_weight,
              chengshi_weight, hehua_weight, type_weights
       FROM public.dict_ke_xie_ruleset
       WHERE ruleset_id = $1`,
      [rulesetId]
    );

    if (rows.length === 0) {
      return DEFAULT_RULESET;
    }

    const row = rows[0];
    return {
      ruleset_id: row.ruleset_id || DEFAULT_RULESET.ruleset_id,
      season_state_weights: row.season_state_weights || DEFAULT_RULESET.season_state_weights,
      tougan_weight:
        typeof row.tougan_weight === "number" ? row.tougan_weight : DEFAULT_RULESET.tougan_weight,
      tonggen_weight:
        typeof row.tonggen_weight === "number" ? row.tonggen_weight : DEFAULT_RULESET.tonggen_weight,
      chengshi_weight:
        typeof row.chengshi_weight === "number"
          ? row.chengshi_weight
          : DEFAULT_RULESET.chengshi_weight,
      hehua_weight:
        typeof row.hehua_weight === "number" ? row.hehua_weight : DEFAULT_RULESET.hehua_weight,
      type_weights: row.type_weights || DEFAULT_RULESET.type_weights,
    };
  } catch (error: any) {
    return DEFAULT_RULESET;
  }
}

function buildEvidenceDetail(params: {
  chartId: string;
  dayMasterStem: string;
  dayMasterElement: string;
  evidenceType: "XIE" | "HAO" | "KE" | "ZHIHUA";
  sourceType: "SHISHANG" | "CAI" | "GUANSHA" | "HEHUA";
  strengthState: string;
  flags: Record<string, boolean>;
  score: number;
  weightJson: any;
  reason: string | null;
  evidenceJson: any;
}): KeXieDetail {
  return {
    chart_id: params.chartId,
    day_master_stem: params.dayMasterStem,
    day_master_element: params.dayMasterElement,
    evidence_type: params.evidenceType,
    source_type: params.sourceType,
    strength_state: params.strengthState,
    flags_json: params.flags,
    score: params.score,
    weight_json: params.weightJson,
    reason: params.reason,
    evidence_json: params.evidenceJson,
  };
}

export async function calculateAndSaveKeXie(
  chartId: string,
  rulesetId: string = "default"
): Promise<KeXieResult> {
  return await transaction(async (client) => {

    const pillars = await getFourPillarsFromDB(chartId);
    if (pillars.length !== 4) {
      throw new Error(`[ke_xie] invalid pillars count: ${pillars.length}`);
    }

    const dayPillar = pillars.find((p) => p.pillar === "day");
    if (!dayPillar) {
      throw new Error("[ke_xie] day pillar not found");
    }

    const allStems = Array.from(new Set(pillars.map((p) => p.stem)));
    const stemElementMap = await getHeavenlyStemElementMap(allStems);
    const dayMasterStem = dayPillar.stem;
    const dayMasterElement = stemElementMap[dayMasterStem];
    if (!dayMasterElement) {
      throw new Error(`[ke_xie] day master element not found for stem ${dayMasterStem}`);
    }

    const ruleset = await getRulesetFromDB(rulesetId);
    const seasonSnapshot = await getSeasonSnapshotFromDB(chartId, rulesetId);

    const branches = pillars.map((p) => p.branch);
    const hiddenStemsMap = await getHiddenStemsFromDB(branches);
    const hiddenStems = Object.values(hiddenStemsMap).flat();
    const hiddenStemCodes = Array.from(new Set(hiddenStems.map((h) => h.stem_code)));
    const hiddenStemElementMap = await getHeavenlyStemElementMap(hiddenStemCodes);

    const elementCounts: Record<string, number> = {};
    pillars.forEach((p) => {
      const element = stemElementMap[p.stem];
      if (element) {
        elementCounts[element] = (elementCounts[element] || 0) + 1;
      }
    });
    hiddenStems.forEach((h) => {
      const element = hiddenStemElementMap[h.stem_code];
      if (element) {
        elementCounts[element] = (elementCounts[element] || 0) + 1;
      }
    });

    const targets = [
      {
        evidenceType: "XIE" as const,
        sourceType: "SHISHANG" as const,
        element: WUXING_SHENG[dayMasterElement],
      },
      {
        evidenceType: "HAO" as const,
        sourceType: "CAI" as const,
        element: WUXING_KE[dayMasterElement],
      },
      {
        evidenceType: "KE" as const,
        sourceType: "GUANSHA" as const,
        element: WUXING_BE_KE[dayMasterElement],
      },
    ];

    const details: KeXieDetail[] = [];

    for (const target of targets) {
      if (!target.element) {
        continue;
      }

      const count = elementCounts[target.element] || 0;
      if (count === 0) {
        continue;
      }

      const seasonState = seasonSnapshot[target.element]?.state || "UNKNOWN";
      const seasonWeight =
        ruleset.season_state_weights?.[seasonState] ?? DEFAULT_RULESET.season_state_weights.UNKNOWN;
      const isTougan = pillars.some(
        (p) => stemElementMap[p.stem] && stemElementMap[p.stem] === target.element
      );
      const isTonggen = Object.values(hiddenStemsMap).some((items) =>
        items.some((h) => hiddenStemElementMap[h.stem_code] === target.element)
      );
      const isChengshi = target.sourceType === "GUANSHA" ? count >= 2 : false;

      const baseScore =
        seasonWeight +
        (isTougan ? ruleset.tougan_weight : 0) +
        (isTonggen ? ruleset.tonggen_weight : 0) +
        (isChengshi ? ruleset.chengshi_weight : 0);
      const typeWeight = ruleset.type_weights?.[target.evidenceType] ?? 1.0;
      const finalScore = baseScore * typeWeight;

      details.push(
        buildEvidenceDetail({
          chartId,
          dayMasterStem,
          dayMasterElement,
          evidenceType: target.evidenceType,
          sourceType: target.sourceType,
          strengthState: seasonState,
          flags: {
            tougan: isTougan,
            tonggen: isTonggen,
            chengshi: isChengshi,
            hehua: false,
          },
          score: finalScore,
          weightJson: {
            season_weight: seasonWeight,
            tougan_weight: ruleset.tougan_weight,
            tonggen_weight: ruleset.tonggen_weight,
            chengshi_weight: ruleset.chengshi_weight,
            type_weight: typeWeight,
          },
          reason: `${target.sourceType} element=${target.element}, season=${seasonState}, tougan=${isTougan}, tonggen=${isTonggen}, chengshi=${isChengshi}`,
          evidenceJson: {
            target_element: target.element,
            season_state: seasonState,
            season_score: seasonSnapshot[target.element]?.score ?? null,
            element_count: count,
          },
        })
      );
    }

    const xieScore = details
      .filter((d) => d.evidence_type === "XIE")
      .reduce((sum, d) => sum + d.score, 0);
    const haoScore = details
      .filter((d) => d.evidence_type === "HAO")
      .reduce((sum, d) => sum + d.score, 0);
    const keScore = details
      .filter((d) => d.evidence_type === "KE")
      .reduce((sum, d) => sum + d.score, 0);
    const zhihuaScore = details
      .filter((d) => d.evidence_type === "ZHIHUA")
      .reduce((sum, d) => sum + d.score, 0);

    const summary: KeXieSummary = {
      chart_id: chartId,
      total_score: xieScore + haoScore + keScore + zhihuaScore,
      xie_score: xieScore,
      hao_score: haoScore,
      ke_score: keScore,
      zhihua_score: zhihuaScore,
      ruleset_id: ruleset.ruleset_id,
      evidence_json: {
        detail_count: details.length,
      },
    };

    try {
      await client.query(`DELETE FROM public.bazi_ke_xie_detail_tbl WHERE chart_id = $1`, [
        chartId,
      ]);
      await client.query(`DELETE FROM public.bazi_ke_xie_summary_tbl WHERE chart_id = $1`, [
        chartId,
      ]);

      if (details.length > 0) {
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        for (const detail of details) {
          placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11})`
          );
          values.push(
            detail.chart_id,
            detail.day_master_stem,
            detail.day_master_element,
            detail.evidence_type,
            detail.source_type,
            detail.strength_state,
            JSON.stringify(detail.flags_json),
            detail.score,
            JSON.stringify(detail.weight_json),
            detail.reason,
            JSON.stringify(detail.evidence_json),
            new Date()
          );
          paramIndex += 12;
        }

        await client.query(
          `INSERT INTO public.bazi_ke_xie_detail_tbl(
            chart_id, day_master_stem, day_master_element, evidence_type, source_type,
            strength_state, flags_json, score, weight_json, reason, evidence_json, created_at
          ) VALUES ${placeholders.join(",")}`,
          values
        );
      }

      await client.query(
        `INSERT INTO public.bazi_ke_xie_summary_tbl(
          chart_id, total_score, xie_score, hao_score, ke_score, zhihua_score, ruleset_id,
          evidence_json, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (chart_id) DO UPDATE SET
          total_score = EXCLUDED.total_score,
          xie_score = EXCLUDED.xie_score,
          hao_score = EXCLUDED.hao_score,
          ke_score = EXCLUDED.ke_score,
          zhihua_score = EXCLUDED.zhihua_score,
          ruleset_id = EXCLUDED.ruleset_id,
          evidence_json = EXCLUDED.evidence_json,
          created_at = NOW()`,
        [
          summary.chart_id,
          summary.total_score,
          summary.xie_score,
          summary.hao_score,
          summary.ke_score,
          summary.zhihua_score,
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

export async function getKeXieFromDB(chartId: string): Promise<KeXieResult | null> {
  try {
    const detailRows = await query<{
      chart_id: string;
      day_master_stem: string;
      day_master_element: string;
      evidence_type: "XIE" | "HAO" | "KE" | "ZHIHUA";
      source_type: "SHISHANG" | "CAI" | "GUANSHA" | "HEHUA";
      strength_state: string;
      flags_json: any;
      score: number;
      weight_json: any;
      reason: string | null;
      evidence_json: any;
    }>(
      `SELECT chart_id, day_master_stem, day_master_element, evidence_type, source_type,
              strength_state, flags_json, score, weight_json, reason, evidence_json
       FROM public.bazi_ke_xie_detail_tbl
       WHERE chart_id = $1
       ORDER BY evidence_type, source_type`,
      [chartId]
    );

    const summaryRows = await query<{
      chart_id: string;
      total_score: number;
      xie_score: number;
      hao_score: number;
      ke_score: number;
      zhihua_score: number;
      ruleset_id: string;
      evidence_json: any;
    }>(
      `SELECT chart_id, total_score, xie_score, hao_score, ke_score, zhihua_score,
              ruleset_id, evidence_json
       FROM public.bazi_ke_xie_summary_tbl
       WHERE chart_id = $1`,
      [chartId]
    );

    if (detailRows.length === 0 && summaryRows.length === 0) {
      return null;
    }

    const details: KeXieDetail[] = detailRows.map((row) => ({
      chart_id: row.chart_id,
      day_master_stem: row.day_master_stem,
      day_master_element: row.day_master_element,
      evidence_type: row.evidence_type,
      source_type: row.source_type,
      strength_state: row.strength_state,
      flags_json: typeof row.flags_json === "string" ? JSON.parse(row.flags_json) : row.flags_json,
      score: typeof row.score === "number" ? row.score : parseFloat(String(row.score)),
      weight_json:
        typeof row.weight_json === "string" ? JSON.parse(row.weight_json) : row.weight_json,
      reason: row.reason,
      evidence_json:
        typeof row.evidence_json === "string" ? JSON.parse(row.evidence_json) : row.evidence_json,
    }));

    const summaryRow = summaryRows[0];
    const summary: KeXieSummary = summaryRow
      ? {
          chart_id: summaryRow.chart_id,
          total_score:
            typeof summaryRow.total_score === "number"
              ? summaryRow.total_score
              : parseFloat(String(summaryRow.total_score)),
          xie_score:
            typeof summaryRow.xie_score === "number"
              ? summaryRow.xie_score
              : parseFloat(String(summaryRow.xie_score)),
          hao_score:
            typeof summaryRow.hao_score === "number"
              ? summaryRow.hao_score
              : parseFloat(String(summaryRow.hao_score)),
          ke_score:
            typeof summaryRow.ke_score === "number"
              ? summaryRow.ke_score
              : parseFloat(String(summaryRow.ke_score)),
          zhihua_score:
            typeof summaryRow.zhihua_score === "number"
              ? summaryRow.zhihua_score
              : parseFloat(String(summaryRow.zhihua_score)),
          ruleset_id: summaryRow.ruleset_id,
          evidence_json:
            typeof summaryRow.evidence_json === "string"
              ? JSON.parse(summaryRow.evidence_json)
              : summaryRow.evidence_json,
        }
      : {
          chart_id: chartId,
          total_score: 0,
          xie_score: 0,
          hao_score: 0,
          ke_score: 0,
          zhihua_score: 0,
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    console.log("[ke_xie] input ok:", Object.fromEntries(searchParams.entries()));
    const chartId = searchParams.get("chart_id");

    if (!chartId) {
      return NextResponse.json({ success: false, error: "missing chart_id" }, { status: 400 });
    }

    const result = await getKeXieFromDB(chartId);
    if (!result) {
      return NextResponse.json({ success: false, error: "no result" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[ke_xie] GET failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "GET failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    console.log("[ke_xie] input ok:", body);
    const { chart_id, ruleset_id = "default" } = body;

    if (!chart_id) {
      return NextResponse.json({ success: false, error: "missing chart_id" }, { status: 400 });
    }

    const result = await calculateAndSaveKeXie(chart_id, ruleset_id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[ke_xie] POST failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "POST failed" },
      { status: 500 }
    );
  }
}
