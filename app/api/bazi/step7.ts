/**
 * 步骤7：取用神、喜神、忌神（落库）
 * 基于：强弱、格局、调候、合冲刑害的破坏与扶助
 */

import { saveYongshenResult, YongshenResultRow, ElementScoreRow } from "./yongshen/route";

export interface Step7Result {
  useful_gods: {
    yong_shen: {
      element: string;
      ten_god: string;
      why: string;
    };
    xi_shen: Array<{
      element: string;
      ten_god: string;
      why: string;
    }>;
    ji_shen: Array<{
      element: string;
      ten_god: string;
      why: string;
    }>;
  };
  element_preference: {
    favorable: string[];
    neutral: string[];
    unfavorable: string[];
  };
  db_result?: {
    calc_version: string;
    confidence: number;
  };
}

const ELEMENTS = ["木", "火", "土", "金", "水"];

function buildElementScores(
  favorable: string[],
  unfavorable: string[]
): ElementScoreRow[] {
  return ELEMENTS.map((element) => {
    let score = 0.5;
    if (favorable.includes(element)) score += 0.3;
    if (unfavorable.includes(element)) score -= 0.3;
    score = Math.max(0, Math.min(1, score));
    return {
      chart_id: "",
      element,
      score_total: score,
      score_by_layer: {
        strength: score,
        structure: 0,
        balance: 0,
        correction: 0,
      },
      reason_json: {
        favorable: favorable.includes(element),
        unfavorable: unfavorable.includes(element),
      },
    };
  });
}

export async function step7(
  step4Result: any,
  step5Result: any,
  step6Result: any,
  chartId: string | null = null,
  calcVersion: string = "v1",
  schoolCode: string | null = null
): Promise<Step7Result> {
  console.log("[step7] input ok:", { step4Result, step5Result, step6Result, chartId, calcVersion, schoolCode });
  const bodyState = step4Result.strength_judgement.body_state;
  const climateNeeds = step5Result.climate_balance.needs || [];

  let yongShen = { element: "", ten_god: "", why: "" };
  const xiShen: Array<{ element: string; ten_god: string; why: string }> = [];
  const jiShen: Array<{ element: string; ten_god: string; why: string }> = [];
  const favorable: string[] = [];
  let unfavorable: string[] = [];

  if (bodyState === "身弱") {
    yongShen = { element: "土", ten_god: "印", why: "身弱需印生扶" };
    xiShen.push({ element: "金", ten_god: "比劫", why: "助身" });
    favorable.push("土", "金");
    unfavorable.push("火", "木");
  } else if (bodyState === "身强") {
    yongShen = { element: "水", ten_god: "食伤", why: "身强需泄秀" };
    xiShen.push({ element: "木", ten_god: "财", why: "耗身" });
    favorable.push("水", "木");
    unfavorable.push("土", "金");
  } else {
    yongShen = { element: "水", ten_god: "食伤", why: "平衡需疏泄" };
    favorable.push("水", "木");
    unfavorable.push("火", "土");
  }

  if (climateNeeds.includes("适度水润")) {
    if (!favorable.includes("水")) favorable.push("水");
    if (unfavorable.includes("火")) {
      unfavorable = unfavorable.filter((e) => e !== "火");
    }
  }
  if (climateNeeds.includes("适度火暖")) {
    if (!favorable.includes("火")) favorable.push("火");
    if (unfavorable.includes("水")) {
      unfavorable = unfavorable.filter((e) => e !== "水");
    }
  }

  unfavorable.forEach((element) => {
    const tenGodMap: Record<string, string> = {
      木: "财",
      火: "官杀",
      土: "印",
      金: "比劫",
      水: "食伤",
    };
    jiShen.push({
      element,
      ten_god: tenGodMap[element] || "",
      why: `对${bodyState}不利`,
    });
  });

  const elementScores = buildElementScores(favorable, unfavorable);
  const primaryElement =
    yongShen.element && ELEMENTS.includes(yongShen.element) ? yongShen.element : "土";
  const secondaryElement =
    xiShen.length > 0 && ELEMENTS.includes(xiShen[0].element) ? xiShen[0].element : null;

  if (chartId) {
    const strengthScore =
      step4Result?.strength_judgement?.score_summary?.favorable_to_dm || {};
    const dmStrengthScore =
      (strengthScore.resource || 0) +
      (strengthScore.peer || 0) +
      (strengthScore.rooting || 0) +
      (strengthScore.season || 0);

    const resultRow: YongshenResultRow = {
      chart_id: chartId,
      calc_version: calcVersion,
      school_code: schoolCode,
      dm_strength_level: bodyState,
      dm_strength_score: dmStrengthScore,
      primary_yongshen_element: primaryElement,
      secondary_yongshen_element: secondaryElement,
      xishen_elements: favorable,
      jishen_elements: unfavorable,
      confidence: 0.55,
      evidence_json: {
        body_state: bodyState,
        climate_needs: climateNeeds,
        structure: step6Result?.structure?.primary_pattern || "",
      },
    };

    await saveYongshenResult({
      chart_id: chartId,
      result: resultRow,
      element_scores: elementScores.map((e) => ({ ...e, chart_id: chartId })),
    });
  }

  console.log("[step7] response ok:", { yongShen: yongShen.element, xiShenCount: xiShen.length, jiShenCount: jiShen.length });
  return {
    useful_gods: {
      yong_shen: yongShen,
      xi_shen: xiShen,
      ji_shen: jiShen,
    },
    element_preference: {
      favorable,
      neutral: [],
      unfavorable,
    },
    db_result: {
      calc_version: calcVersion,
      confidence: 0.55,
    },
  };
}
