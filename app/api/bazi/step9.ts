/**
 * 步骤9：十神专题画像（静态）
 * 结构化统计 + 权重评分 + 证据归档
 */

import {
  saveTenshenProfile,
  TenshenProfileSummaryRow,
  TenshenProfileItemRow,
  TenshenEvidenceRow,
} from "./tenshen_profile/route";

export interface Step9Result {
  tenshen_profile_static: {
    top_tenshen: string[];
    category_ratio: Record<string, number>;
    items: Array<{
      tenshen_code: string;
      count_total: number;
      score_total: number;
      rank_no: number;
      is_present: boolean;
    }>;
    confidence: number;
    evidence_count: number;
  };
}

const SOURCE_BASE_WEIGHT: Record<
  TenshenEvidenceRow["source_type"],
  number
> = {
  STEM: 1.0,
  HIDDEN_MAIN: 0.7,
  HIDDEN_MID: 0.4,
  HIDDEN_TAIL: 0.2,
};

const TRESHEN_CATEGORY: Record<string, string> = {
  正财: "财",
  偏财: "财",
  正官: "官杀",
  七杀: "官杀",
  正印: "印",
  偏印: "印",
  食神: "食伤",
  伤官: "食伤",
  比肩: "比劫",
  劫财: "比劫",
};

function toPillarCode(pillar: string): TenshenEvidenceRow["pillar"] {
  if (pillar === "year") return "YEAR";
  if (pillar === "month") return "MONTH";
  if (pillar === "day") return "DAY";
  return "HOUR";
}

function toSourceType(
  itemType: string,
  hiddenRole?: string
): TenshenEvidenceRow["source_type"] {
  if (itemType === "stem") return "STEM";
  if (hiddenRole === "main") return "HIDDEN_MAIN";
  if (hiddenRole === "middle") return "HIDDEN_MID";
  return "HIDDEN_TAIL";
}

export async function step9(
  step2Result: any,
  step4Result: any,
  chartId: string | null = null,
  version: string = "v1"
): Promise<Step9Result> {
  console.log("[step9] input ok:", { step2Result, step4Result, chartId, version });
  const details = step2Result?.shishen?.details || [];
  const evidence: TenshenEvidenceRow[] = [];
  const tenshenAgg: Record<
    string,
    {
      count_stem: number;
      count_hidden: number;
      score_stem: number;
      score_hidden: number;
      evidence: any[];
    }
  > = {};

  details.forEach((item: any) => {
    const tenshen = item.tenshen;
    if (!tenshen || tenshen === "日主") return;

    const sourceType = toSourceType(item.item_type, item.hidden_role);
    const baseWeight = SOURCE_BASE_WEIGHT[sourceType];
    const seasonFactor = 1.0;
    const rootFactor = 1.0;
    const relationFactor = 1.0;
    const effectiveWeight = baseWeight * seasonFactor * rootFactor * relationFactor;

    if (!tenshenAgg[tenshen]) {
      tenshenAgg[tenshen] = {
        count_stem: 0,
        count_hidden: 0,
        score_stem: 0,
        score_hidden: 0,
        evidence: [],
      };
    }

    if (sourceType === "STEM") {
      tenshenAgg[tenshen].count_stem += 1;
      tenshenAgg[tenshen].score_stem += effectiveWeight;
    } else {
      tenshenAgg[tenshen].count_hidden += 1;
      tenshenAgg[tenshen].score_hidden += effectiveWeight;
    }

    tenshenAgg[tenshen].evidence.push({
      pillar: item.pillar,
      stem: item.target_stem,
      source_type: sourceType,
      weight: effectiveWeight,
    });

    evidence.push({
      chart_id: chartId || "",
      tenshen_code: tenshen,
      pillar: toPillarCode(item.pillar),
      source_type: sourceType,
      stem_code: item.target_stem,
      element: item.target_element,
      yinyang: item.target_yinyang,
      base_weight: baseWeight,
      season_factor: seasonFactor,
      root_factor: rootFactor,
      relation_factor: relationFactor,
      effective_weight: effectiveWeight,
      tags: [sourceType],
      meta_json: {
        source_branch: item.source_branch || null,
        hidden_role: item.hidden_role || null,
      },
    });
  });

  const items: TenshenProfileItemRow[] = Object.entries(tenshenAgg).map(
    ([tenshen, data]) => {
      const scoreTotal = data.score_stem + data.score_hidden;
      return {
        chart_id: chartId || "",
        tenshen_code: tenshen,
        count_stem: data.count_stem,
        count_hidden: data.count_hidden,
        count_total: data.count_stem + data.count_hidden,
        score_stem: data.score_stem,
        score_hidden: data.score_hidden,
        score_total: scoreTotal,
        rank_no: 0,
        is_present: data.count_stem + data.count_hidden > 0,
        evidence_json: data.evidence,
      };
    }
  );

  items.sort((a, b) => b.score_total - a.score_total);
  items.forEach((item, idx) => {
    item.rank_no = idx + 1;
  });

  const scoreTotalSum = items.reduce((sum, item) => sum + item.score_total, 0);
  const categorySum: Record<string, number> = {
    财: 0,
    官杀: 0,
    印: 0,
    食伤: 0,
    比劫: 0,
  };

  items.forEach((item) => {
    const category = TRESHEN_CATEGORY[item.tenshen_code] || "其他";
    if (!categorySum[category]) categorySum[category] = 0;
    categorySum[category] += item.score_total;
  });

  const categoryRatio: Record<string, number> = {};
  Object.keys(categorySum).forEach((key) => {
    if (scoreTotalSum > 0) {
      categoryRatio[key] = parseFloat((categorySum[key] / scoreTotalSum).toFixed(4));
    } else {
      categoryRatio[key] = 0;
    }
  });

  const topTenshen = items.slice(0, 3).map((item) => item.tenshen_code);
  const confidence = items.length > 0 ? 0.6 : 0;

  const profileJson = {
    top_tenshen: topTenshen,
    category_ratio: categoryRatio,
    items: items.map((item) => ({
      tenshen: item.tenshen_code,
      count_total: item.count_total,
      score_total: item.score_total,
      rank: item.rank_no,
    })),
    evidence_count: evidence.length,
  };

  if (chartId) {
    const summary: TenshenProfileSummaryRow = {
      chart_id: chartId,
      version,
      profile_json: profileJson,
      confidence,
      notes: null,
    };

    await saveTenshenProfile({
      chart_id: chartId,
      summary,
      items: items.map((item) => ({ ...item, chart_id: chartId })),
      evidence: evidence.map((item) => ({ ...item, chart_id: chartId })),
    });
  }

  console.log("[step9] response ok:", { topTenshen, evidenceCount: evidence.length, itemCount: items.length });
  return {
    tenshen_profile_static: {
      top_tenshen: topTenshen,
      category_ratio: categoryRatio,
      items: items.map((item) => ({
        tenshen_code: item.tenshen_code,
        count_total: item.count_total,
        score_total: item.score_total,
        rank_no: item.rank_no,
        is_present: item.is_present,
      })),
      confidence,
      evidence_count: evidence.length,
    },
  };
}
