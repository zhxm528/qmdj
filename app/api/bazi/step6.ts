/**
 * 步骤6：定格局/成局（结构判断）
 * 输出：候选格局 + 成局 + 清纯/破格评分
 */

import { GejuFormation, GejuResult, GejuSummary, saveGejuResult } from "./geju/utils";

export interface Step6Result {
  structure: {
    primary_pattern: string;
    secondary_patterns: string[];
    formed_combinations: string[];
    breakers: string[];
    purity: string;
    notes: string[];
    candidates: Array<{
      pattern_code: string;
      core_tenshen: string | null;
      core_pillar: "YEAR" | "MONTH" | "DAY" | "HOUR" | null;
      is_primary: boolean;
      score: number;
      confidence: number;
      evidence: string[];
      break_reasons: string[];
    }>;
    formations: GejuFormation[];
    summary: GejuSummary;
  };
}

const PATTERN_MAP: Record<string, string> = {
  正官: "正官格",
  七杀: "七杀格",
  正财: "财格",
  偏财: "财格",
  食神: "食神格",
  伤官: "伤官格",
  正印: "印格",
  偏印: "印格",
  比肩: "比劫格",
  劫财: "比劫格",
};

const PURITY_LABELS: Record<GejuSummary["purity_level"], string> = {
  CLEAN: "清",
  RELATIVELY_CLEAN: "较清",
  MIXED: "偏杂",
  HEAVILY_MIXED: "杂",
};

const BREAK_LABELS: Record<GejuSummary["break_level"], string> = {
  NONE: "无破",
  LIGHT: "轻破",
  MEDIUM: "中破",
  HEAVY: "重破",
};

function mapMixingFlags(tenGods: string[]): string[] {
  const flags: string[] = [];
  const has = (items: string[]) => items.some((t) => tenGods.includes(t));

  if (has(["正官"]) && has(["七杀"])) {
    flags.push("官杀混");
  }
  if (has(["正财"]) && has(["偏财"])) {
    flags.push("财混");
  }
  if (has(["食神"]) && has(["伤官"])) {
    flags.push("食伤混");
  }
  if (has(["正印"]) && has(["偏印"])) {
    flags.push("印混");
  }

  return flags;
}

export async function step6(
  fourPillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  },
  dayMaster: string,
  step2Result: any,
  step4Result: any,
  chartId: string | null = null
): Promise<Step6Result> {
  console.log("[step6] input ok:", { fourPillars, dayMaster, step2Result, step4Result, chartId });
  const monthStemTenGod =
    step2Result?.structure_table?.pillars?.find((p: any) => p.pillar === "month")?.stem?.tenshen ||
    step2Result?.ten_gods?.month_stem ||
    "";

  const patternCode = PATTERN_MAP[monthStemTenGod] || "普通格局";
  const breakers: string[] = [];
  const notes: string[] = [];

  const relationBreakers: string[] = [
    ...(step2Result?.relations?.branch_clashes || []).map((c: string) => `${c}冲`),
    ...(step2Result?.relations?.branch_harms || []).map((c: string) => `${c}害`),
    ...(step2Result?.relations?.branch_punishments || []).map((c: string) => `${c}刑`),
    ...(step2Result?.relations?.branch_breaks || []).map((c: string) => `${c}破`),
  ];
  breakers.push(...relationBreakers);

  const formations: GejuFormation[] = [];
  const formedCombinations: string[] = [];
  const structureRelations = step2Result?.structure_table?.relations?.structures || [];
  structureRelations.forEach((item: any) => {
    const isComplete = !!item.is_complete;
    const formationType = item.type || "其他";
    const formationCode = `${(item.members || []).join("")}${item.element || ""}局`;
    const status: GejuFormation["status"] = isComplete ? "FORMED" : "PARTIAL";
    const score = isComplete ? 80 : 60;
    const formation: GejuFormation = {
      chart_id: chartId || "",
      formation_type: formationType,
      formation_code: formationCode,
      members: {
        members: item.members || [],
        element: item.element || "",
        is_complete: isComplete,
      },
      status,
      score,
      confidence: isComplete ? 0.7 : 0.5,
      break_reasons_json: [],
      evidence_json: {
        source: "structure_table",
        members: item.members || [],
        element: item.element || "",
      },
    };
    formations.push(formation);
    formedCombinations.push(`${formationType}:${formationCode}`);
  });

  const tenGods = [
    step2Result?.ten_gods?.year_stem,
    step2Result?.ten_gods?.month_stem,
    step2Result?.ten_gods?.hour_stem,
  ].filter(Boolean) as string[];
  const mixingFlags = mapMixingFlags(tenGods);

  const baseScore = 70;
  const delingBonus = step4Result?.deling?.is_deling ? 8 : 0;
  const breakerPenalty = breakers.length * 4;
  const mixingPenalty = mixingFlags.length * 6;
  const candidateScore = Math.max(
    0,
    Math.min(100, baseScore + delingBonus - breakerPenalty - mixingPenalty)
  );

  const candidates = [
    {
      pattern_code: patternCode,
      core_tenshen: monthStemTenGod || null,
      core_pillar: "MONTH" as const,
      is_primary: true,
      score: candidateScore,
      confidence: 0.6,
      evidence: [
        monthStemTenGod ? `月干十神为${monthStemTenGod}` : "月干十神未明",
        step4Result?.deling?.is_deling ? "得令成立" : "未明显得令",
      ],
      break_reasons: breakers,
    },
  ];

  const primaryPattern = candidates[0]?.pattern_code || "普通格局";
  const secondaryPatterns: string[] = [];

  const purityScore = Math.max(0, Math.min(100, candidateScore - breakers.length * 2));
  const purityLevel: GejuSummary["purity_level"] =
    purityScore >= 80
      ? "CLEAN"
      : purityScore >= 65
      ? "RELATIVELY_CLEAN"
      : purityScore >= 45
      ? "MIXED"
      : "HEAVILY_MIXED";

  const breakLevel: GejuSummary["break_level"] =
    breakers.length === 0
      ? "NONE"
      : breakers.length <= 1
      ? "LIGHT"
      : breakers.length <= 3
      ? "MEDIUM"
      : "HEAVY";

  const summary: GejuSummary = {
    chart_id: chartId || "",
    primary_pattern_code: primaryPattern,
    purity_score: purityScore,
    purity_level: purityLevel,
    break_level: breakLevel,
    break_reasons_json: breakers,
    mixing_flags_json: mixingFlags,
    confidence: 0.55,
    evidence_json: {
      month_stem_tenshen: monthStemTenGod,
      deling: step4Result?.deling?.is_deling || false,
      mixing_flags: mixingFlags,
    },
  };

  if (chartId) {
    const resultToSave: GejuResult = {
      chart_id: chartId,
      candidates: candidates.map((c) => ({
        chart_id: chartId,
        candidate_id: null,
        pattern_code: c.pattern_code,
        core_tenshen: c.core_tenshen,
        core_pillar: c.core_pillar,
        is_primary: c.is_primary,
        score: c.score,
        confidence: c.confidence,
        evidence_json: {
          evidence: c.evidence,
          break_reasons: c.break_reasons,
        },
      })),
      formations: formations.map((f) => ({ ...f, chart_id: chartId })),
      summary: { ...summary, chart_id: chartId },
    };
    await saveGejuResult(resultToSave);
  } else {
    notes.push("chart_id 为空，跳过入库");
  }

  const purityLabel = PURITY_LABELS[purityLevel];
  const breakLabel = BREAK_LABELS[breakLevel];
  const purityText = breakLabel === "无破" ? purityLabel : `${purityLabel} / ${breakLabel}`;

  console.log("[step6] response ok:", { primaryPattern, candidateCount: candidates.length });
  return {
    structure: {
      primary_pattern: primaryPattern,
      secondary_patterns: secondaryPatterns,
      formed_combinations: formedCombinations,
      breakers,
      purity: purityText,
      notes,
      candidates,
      formations,
      summary,
    },
  };
}
