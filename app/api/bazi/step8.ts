/**
 * 步骤8：验盘（病药自洽）
 * 做一致性校验并落库
 */

import { saveCheckResult, CheckIssue, CheckResultRow } from "./check/utils";

export interface Step8Result {
  consistency_check: {
    main_conflict: string;
    medicine: string;
    risk_points: string[];
    self_consistency: string;
    notes: string[];
    consistency_score: number;
    disease_tags: string[];
    remedy_candidates: {
      primary_yongshen: string | null;
      tiao_hou: string | null;
      bridge_element: string | null;
      avoid_elements: string[];
    };
    issues: CheckIssue[];
  };
}

function calcConsistencyScore(issues: CheckIssue[]): number {
  const base = 1;
  const penalty = issues.reduce((acc, item) => {
    if (item.severity === "HIGH") return acc + 0.2;
    if (item.severity === "MEDIUM") return acc + 0.1;
    return acc + 0.05;
  }, 0);
  return Math.max(0, Math.min(1, base - penalty));
}

export async function step8(
  step4Result: any,
  step6Result: any,
  step7Result: any,
  step2Result: any,
  step5Result: any,
  chartId: string | null = null,
  calcVersion: string = "v1"
): Promise<Step8Result> {
  console.log("[step8] input ok:", { step4Result, step6Result, step7Result });
  const bodyState = step4Result?.strength_judgement?.body_state || "";
  const yongshenElement = step7Result?.useful_gods?.yong_shen?.element || "";
  const climateNeeds = step5Result?.climate_balance?.needs || [];

  const diseaseTags: string[] = [];
  if (bodyState === "身弱") diseaseTags.push("dm_too_weak");
  if (bodyState === "身强") diseaseTags.push("dm_too_strong");
  if (climateNeeds.includes("适度火暖")) diseaseTags.push("cold_need_fire");
  if (climateNeeds.includes("适度水润")) diseaseTags.push("dry_need_moist");

  const issues: CheckIssue[] = [];
  if (diseaseTags.includes("dm_too_weak") && ["水", "木"].includes(yongshenElement)) {
    issues.push({
      chart_id: chartId || "",
      issue_type: "remedy_mismatch",
      severity: "HIGH",
      message: "身弱但用神偏泄耗，扶抑矛盾",
      evidence_json: { body_state: bodyState, yongshen: yongshenElement },
    });
  }

  if (diseaseTags.includes("cold_need_fire") && yongshenElement && yongshenElement !== "火") {
    issues.push({
      chart_id: chartId || "",
      issue_type: "climate_mismatch",
      severity: "MEDIUM",
      message: "寒病需火，但用神非火",
      evidence_json: { climate: "cold_need_fire", yongshen: yongshenElement },
    });
  }

  const consistencyScore = calcConsistencyScore(issues);
  const selfConsistency = consistencyScore >= 0.7 ? "consistent" : "needs_review";

  const riskPoints = issues.map((i) => i.message);
  const mainConflict = `${bodyState}，用神取${yongshenElement || "-"}，需检验病药匹配`;
  const medicine = `用神${yongshenElement || "-"}，喜神${step7Result?.useful_gods?.xi_shen
    ?.map((x: any) => x.element)
    .join("，") || "-"}`;

  const remedyCandidates = {
    primary_yongshen: yongshenElement || null,
    tiao_hou: climateNeeds.includes("适度火暖")
      ? "火暖"
      : climateNeeds.includes("适度水润")
      ? "水润"
      : null,
    bridge_element: null,
    avoid_elements: step7Result?.element_preference?.unfavorable || [],
  };

  if (chartId) {
    const resultRow: CheckResultRow = {
      chart_id: chartId,
      calc_version: calcVersion,
      is_valid: true,
      consistency_score: consistencyScore,
      disease_tags_json: diseaseTags,
      remedy_json: remedyCandidates,
      issues_json: issues.map((i) => ({
        type: i.issue_type,
        severity: i.severity,
        message: i.message,
      })),
      evidence_json: {
        body_state: bodyState,
        yongshen: yongshenElement,
        climate_needs: climateNeeds,
      },
    };

    await saveCheckResult({
      chart_id: chartId,
      result: resultRow,
      issues: issues.map((i) => ({ ...i, chart_id: chartId })),
    });
  }

  console.log("[step8] response ok:", { mainConflict, medicine });
  return {
    consistency_check: {
      main_conflict: mainConflict,
      medicine,
      risk_points: riskPoints,
      self_consistency: selfConsistency,
      notes: selfConsistency === "consistent" ? [] : ["建议结合具体事件验证"],
      consistency_score: consistencyScore,
      disease_tags: diseaseTags,
      remedy_candidates: remedyCandidates,
      issues,
    },
  };
}
