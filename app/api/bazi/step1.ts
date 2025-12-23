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
}

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
  const ganToElement: Record<string, string> = {
    甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
    己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
  };
  const ganToYinYang: Record<string, string> = {
    甲: "阳", 乙: "阴", 丙: "阳", 丁: "阴", 戊: "阳",
    己: "阴", 庚: "阳", 辛: "阴", 壬: "阳", 癸: "阴",
  };

  return {
    day_master: {
      stem: dayStem,
      element: ganToElement[dayStem] || "",
      yin_yang: ganToYinYang[dayStem] || "",
    },
    day_pillar: {
      stem: dayStem,
      branch: dayBranch,
    },
  };
}

