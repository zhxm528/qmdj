/**
 * 步骤1：定日主（命主）
 * 以日干为核心，先明确"我是谁"（后面所有十神、喜忌都围绕它展开）。
 */

import { extractPillars } from "./fourpillars/route";
import { GAN_TO_ELEMENT, GAN_TO_YINYANG, getDayMasterInfo } from "./rizhuwuxing/route";

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
  // 提取四柱的天干地支
  const pillars = extractPillars(fourPillars);
  const yearStem = pillars.year.stem;
  const yearBranch = pillars.year.branch;
  const monthStem = pillars.month.stem;
  const monthBranch = pillars.month.branch;
  const dayStem = pillars.day.stem;
  const dayBranch = pillars.day.branch;
  const hourStem = pillars.hour.stem;
  const hourBranch = pillars.hour.branch;


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

  // 获取日主信息
  const dayMasterInfo = getDayMasterInfo(dayStem);

  return {
    day_master: {
      stem: dayMasterInfo.stem,
      element: dayMasterInfo.element,
      yin_yang: dayMasterInfo.yin_yang,
    },
    day_pillar: {
      stem: dayStem,
      branch: dayBranch,
    },
    five_elements: fiveElements,
  };
}

