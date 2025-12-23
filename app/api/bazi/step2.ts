/**
 * 步骤2：补齐基础盘面信息
 * 列出：十神（相对日主）、地支藏干、十二长生（可选）、纳音（多数情况下可选）。
 * 把天干地支的合、冲、刑、害、破以及干合、干克关系标出来。
 */

export interface Step2Result {
  five_elements: {
    stems: {
      year_stem: { stem: string; element: string };
      month_stem: { stem: string; element: string };
      day_stem: { stem: string; element: string };
      hour_stem: { stem: string; element: string };
    };
    branches: {
      year_branch: { branch: string; element: string };
      month_branch: { branch: string; element: string };
      day_branch: { branch: string; element: string };
      hour_branch: { branch: string; element: string };
    };
    optional_summary: {
      count_by_element: { 木: number; 火: number; 土: number; 金: number; 水: number };
      notes: string;
    };
  };
  hidden_stems: {
    year_branch: string[];
    month_branch: string[];
    day_branch: string[];
    hour_branch: string[];
  };
  ten_gods: {
    year_stem: string;
    month_stem: string;
    hour_stem: string;
    branches_main: {
      year_branch: string;
      month_branch: string;
      day_branch: string;
      hour_branch: string;
    };
  };
  relations: {
    stem_combos: string[];
    stem_clashes: string[];
    branch_combos: string[];
    branch_clashes: string[];
    branch_harms: string[];
    branch_punishments: string[];
    branch_breaks: string[];
  };
  optional: {
    twelve_growth: Record<string, string>;
    na_yin: Record<string, string>;
  };
}

// 天干五行表
const GAN_TO_ELEMENT: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

// 地支五行表
const BRANCH_TO_ELEMENT: Record<string, string> = {
  寅: "木", 卯: "木", 巳: "火", 午: "火", 辰: "土", 戌: "土", 丑: "土", 未: "土",
  申: "金", 酉: "金", 子: "水", 亥: "水",
};

// 地支藏干表
const BRANCH_HIDDEN_STEMS: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "戊", "庚"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

// 十神表（以日干为基准）
const TEN_GODS: Record<string, Record<string, string>> = {
  甲: { 甲: "比肩", 乙: "劫财", 丙: "食神", 丁: "伤官", 戊: "偏财", 己: "正财", 庚: "七杀", 辛: "正官", 壬: "偏印", 癸: "正印" },
  乙: { 甲: "劫财", 乙: "比肩", 丙: "伤官", 丁: "食神", 戊: "正财", 己: "偏财", 庚: "正官", 辛: "七杀", 壬: "正印", 癸: "偏印" },
  丙: { 甲: "偏印", 乙: "正印", 丙: "比肩", 丁: "劫财", 戊: "食神", 己: "伤官", 庚: "偏财", 辛: "正财", 壬: "七杀", 癸: "正官" },
  丁: { 甲: "正印", 乙: "偏印", 丙: "劫财", 丁: "比肩", 戊: "伤官", 己: "食神", 庚: "正财", 辛: "偏财", 壬: "正官", 癸: "七杀" },
  戊: { 甲: "七杀", 乙: "正官", 丙: "偏印", 丁: "正印", 戊: "比肩", 己: "劫财", 庚: "食神", 辛: "伤官", 壬: "偏财", 癸: "正财" },
  己: { 甲: "正官", 乙: "七杀", 丙: "正印", 丁: "偏印", 戊: "劫财", 己: "比肩", 庚: "伤官", 辛: "食神", 壬: "正财", 癸: "偏财" },
  庚: { 甲: "偏财", 乙: "正财", 丙: "七杀", 丁: "正官", 戊: "偏印", 己: "正印", 庚: "比肩", 辛: "劫财", 壬: "食神", 癸: "伤官" },
  辛: { 甲: "正财", 乙: "偏财", 丙: "正官", 丁: "七杀", 戊: "正印", 己: "偏印", 庚: "劫财", 辛: "比肩", 壬: "伤官", 癸: "食神" },
  壬: { 甲: "食神", 乙: "伤官", 丙: "偏财", 丁: "正财", 戊: "七杀", 己: "正官", 庚: "偏印", 辛: "正印", 壬: "比肩", 癸: "劫财" },
  癸: { 甲: "伤官", 乙: "食神", 丙: "正财", 丁: "偏财", 戊: "正官", 己: "七杀", 庚: "正印", 辛: "偏印", 壬: "劫财", 癸: "比肩" },
};

// 天干合
const STEM_COMBOS: string[][] = [
  ["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"],
];

// 天干冲（相克）
const STEM_CLASHES: string[][] = [
  ["甲", "庚"], ["乙", "辛"], ["丙", "壬"], ["丁", "癸"],
];

// 地支六合
const BRANCH_COMBOS: string[][] = [
  ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"],
];

// 地支六冲
const BRANCH_CLASHES: string[][] = [
  ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
];

// 地支六害
const BRANCH_HARMS: string[][] = [
  ["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"],
];

// 地支三刑
const BRANCH_PUNISHMENTS: string[][] = [
  ["寅", "巳", "申"], // 无恩之刑
  ["丑", "戌", "未"], // 恃势之刑
  ["子", "卯"],       // 无礼之刑
  ["辰", "午", "酉", "亥"], // 自刑
];

// 地支相破
const BRANCH_BREAKS: string[][] = [
  ["子", "酉"], ["寅", "亥"], ["卯", "午"], ["辰", "丑"], ["巳", "申"], ["未", "戌"],
];

export function step2(
  fourPillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  },
  dayMaster: string
): Step2Result {
  const yearStem = fourPillars.year.charAt(0);
  const yearBranch = fourPillars.year.charAt(1);
  const monthStem = fourPillars.month.charAt(0);
  const monthBranch = fourPillars.month.charAt(1);
  const dayStem = fourPillars.day.charAt(0);
  const dayBranch = fourPillars.day.charAt(1);
  const hourStem = fourPillars.hour.charAt(0);
  const hourBranch = fourPillars.hour.charAt(1);

  // 五行信息
  const fiveElements = {
    stems: {
      year_stem: { stem: yearStem, element: GAN_TO_ELEMENT[yearStem] || "" },
      month_stem: { stem: monthStem, element: GAN_TO_ELEMENT[monthStem] || "" },
      day_stem: { stem: dayStem, element: GAN_TO_ELEMENT[dayStem] || "" },
      hour_stem: { stem: hourStem, element: GAN_TO_ELEMENT[hourStem] || "" },
    },
    branches: {
      year_branch: { branch: yearBranch, element: BRANCH_TO_ELEMENT[yearBranch] || "" },
      month_branch: { branch: monthBranch, element: BRANCH_TO_ELEMENT[monthBranch] || "" },
      day_branch: { branch: dayBranch, element: BRANCH_TO_ELEMENT[dayBranch] || "" },
      hour_branch: { branch: hourBranch, element: BRANCH_TO_ELEMENT[hourBranch] || "" },
    },
    optional_summary: {
      count_by_element: { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 },
      notes: "统计口径：天干1次+地支主五行1次；未把藏干计入",
    },
  };

  // 统计五行数量
  const elementCount = fiveElements.optional_summary.count_by_element;
  [fiveElements.stems.year_stem, fiveElements.stems.month_stem, fiveElements.stems.day_stem, fiveElements.stems.hour_stem].forEach(s => {
    if (s.element && elementCount[s.element as keyof typeof elementCount] !== undefined) {
      elementCount[s.element as keyof typeof elementCount]++;
    }
  });
  [fiveElements.branches.year_branch, fiveElements.branches.month_branch, fiveElements.branches.day_branch, fiveElements.branches.hour_branch].forEach(b => {
    if (b.element && elementCount[b.element as keyof typeof elementCount] !== undefined) {
      elementCount[b.element as keyof typeof elementCount]++;
    }
  });

  // 地支藏干
  const hiddenStems = {
    year_branch: BRANCH_HIDDEN_STEMS[yearBranch] || [],
    month_branch: BRANCH_HIDDEN_STEMS[monthBranch] || [],
    day_branch: BRANCH_HIDDEN_STEMS[dayBranch] || [],
    hour_branch: BRANCH_HIDDEN_STEMS[hourBranch] || [],
  };

  // 十神
  const tenGodsMap = TEN_GODS[dayMaster] || {};
  const tenGods = {
    year_stem: tenGodsMap[yearStem] || "",
    month_stem: tenGodsMap[monthStem] || "",
    hour_stem: tenGodsMap[hourStem] || "",
    branches_main: {
      year_branch: tenGodsMap[hiddenStems.year_branch[0]] || "",
      month_branch: tenGodsMap[hiddenStems.month_branch[0]] || "",
      day_branch: tenGodsMap[hiddenStems.day_branch[0]] || "",
      hour_branch: tenGodsMap[hiddenStems.hour_branch[0]] || "",
    },
  };

  // 关系分析
  const stems = [yearStem, monthStem, dayStem, hourStem];
  const branches = [yearBranch, monthBranch, dayBranch, hourBranch];

  const stemCombos: string[] = [];
  const stemClashes: string[] = [];
  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      const pair = [stems[i], stems[j]].sort();
      if (STEM_COMBOS.some(c => c[0] === pair[0] && c[1] === pair[1])) {
        stemCombos.push(`${pair[0]}${pair[1]}合`);
      }
      if (STEM_CLASHES.some(c => c[0] === pair[0] && c[1] === pair[1] || c[0] === pair[1] && c[1] === pair[0])) {
        stemClashes.push(`${pair[0]}${pair[1]}冲`);
      }
    }
  }

  const branchCombos: string[] = [];
  const branchClashes: string[] = [];
  const branchHarms: string[] = [];
  const branchPunishments: string[] = [];
  const branchBreaks: string[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const pair = [branches[i], branches[j]].sort();
      if (BRANCH_COMBOS.some(c => c[0] === pair[0] && c[1] === pair[1])) {
        branchCombos.push(`${pair[0]}${pair[1]}合`);
      }
      if (BRANCH_CLASHES.some(c => c[0] === pair[0] && c[1] === pair[1])) {
        branchClashes.push(`${pair[0]}${pair[1]}冲`);
      }
      if (BRANCH_HARMS.some(c => c[0] === pair[0] && c[1] === pair[1])) {
        branchHarms.push(`${pair[0]}${pair[1]}害`);
      }
      if (BRANCH_BREAKS.some(c => c[0] === pair[0] && c[1] === pair[1])) {
        branchBreaks.push(`${pair[0]}${pair[1]}破`);
      }
    }
  }

  // 检查三刑
  for (const punishment of BRANCH_PUNISHMENTS) {
    const found = punishment.filter(p => branches.includes(p));
    if (found.length >= 2) {
      branchPunishments.push(found.join("") + "刑");
    }
  }

  return {
    five_elements: fiveElements,
    hidden_stems: hiddenStems,
    ten_gods: tenGods,
    relations: {
      stem_combos: stemCombos,
      stem_clashes: stemClashes,
      branch_combos: branchCombos,
      branch_clashes: branchClashes,
      branch_harms: branchHarms,
      branch_punishments: branchPunishments,
      branch_breaks: branchBreaks,
    },
    optional: {
      twelve_growth: {}, // TODO: 实现十二长生
      na_yin: {}, // TODO: 实现纳音
    },
  };
}

