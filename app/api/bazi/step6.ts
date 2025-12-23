/**
 * 步骤6：定格局/成局（结构判断）
 * 看是否形成：某种格局（如官格、财格、食伤格等——不同派别定义不同），或三合/三会/六合等"成局"。
 * 判断"格局是否清纯""有无破格""成不成、真不真"。
 */

export interface Step6Result {
  structure: {
    primary_pattern: string;
    secondary_patterns: string[];
    formed_combinations: string[];
    breakers: string[];
    purity: string;
    notes: string[];
  };
}

export function step6(
  fourPillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  },
  dayMaster: string,
  step2Result: any,
  step4Result: any
): Step6Result {
  const tenGods = step2Result.ten_gods;
  const monthStemTenGod = tenGods.month_stem;

  // 判断主格局（以月干十神为主）
  let primaryPattern = "普通格局";
  const secondaryPatterns: string[] = [];
  const breakers: string[] = [];
  const notes: string[] = [];

  if (monthStemTenGod === "正官" || monthStemTenGod === "七杀") {
    primaryPattern = "官杀格";
  } else if (monthStemTenGod === "正财" || monthStemTenGod === "偏财") {
    primaryPattern = "财格";
  } else if (monthStemTenGod === "食神" || monthStemTenGod === "伤官") {
    primaryPattern = "食伤格";
  } else if (monthStemTenGod === "正印" || monthStemTenGod === "偏印") {
    primaryPattern = "印格";
  } else if (monthStemTenGod === "比肩" || monthStemTenGod === "劫财") {
    primaryPattern = "比劫格";
  }

  // 检查破格
  if (step2Result.relations.branch_clashes.length > 0) {
    breakers.push(...step2Result.relations.branch_clashes.map((c: string) => `${c}可能引动波动`));
  }

  // 检查成局（三合、三会等）
  const formedCombinations: string[] = [];
  // TODO: 实现三合三会判断

  let purity = "一般";
  if (breakers.length === 0 && formedCombinations.length > 0) {
    purity = "较清";
  } else if (breakers.length > 0) {
    purity = "有破";
  }

  return {
    structure: {
      primary_pattern: primaryPattern,
      secondary_patterns: secondaryPatterns,
      formed_combinations: formedCombinations,
      breakers,
      purity,
      notes,
    },
  };
}

