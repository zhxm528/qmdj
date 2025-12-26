/**
 * 步骤1：定日主（命主）
 * 以日干为核心，先明确"我是谁"（后面所有十神、喜忌都围绕它展开）。
 */

export interface Step1Result {
  day_master: {
    stem: string;
    element: string;
    yin_yang: string;
  };
  day_pillar: {
    stem: string;
    branch: string;
  };
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
}

// 天干五行表
const GAN_TO_ELEMENT: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

// 地支五行表
const BRANCH_TO_ELEMENT: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土",
  巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金",
  戌: "土", 亥: "水",
};

export function step1(fourPillars: {
  year: string;
  month: string;
  day: string;
  hour: string;
}): Step1Result {
  const dayPillar = fourPillars.day;
  const dayStem = dayPillar.charAt(0);
  const dayBranch = dayPillar.charAt(1);

  // 天干五行和阴阳
  const ganToYinYang: Record<string, string> = {
    甲: "阳", 乙: "阴", 丙: "阳", 丁: "阴", 戊: "阳",
    己: "阴", 庚: "阳", 辛: "阴", 壬: "阳", 癸: "阴",
  };

  // 提取四柱的天干地支
  const yearStem = fourPillars.year.charAt(0);
  const yearBranch = fourPillars.year.charAt(1);
  const monthStem = fourPillars.month.charAt(0);
  const monthBranch = fourPillars.month.charAt(1);
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
      notes: "",
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

  return {
    day_master: {
      stem: dayStem,
      element: GAN_TO_ELEMENT[dayStem] || "",
      yin_yang: ganToYinYang[dayStem] || "",
    },
    day_pillar: {
      stem: dayStem,
      branch: dayBranch,
    },
    five_elements: fiveElements,
  };
}

