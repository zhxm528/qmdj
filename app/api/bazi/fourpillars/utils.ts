/**
 * 四柱天干地支提取工具函数
 * 从四柱字符串中提取天干地支信息
 */

export interface FourPillars {
  year: string;
  month: string;
  day: string;
  hour: string;
}

export interface ExtractedPillars {
  year: {
    stem: string;
    branch: string;
  };
  month: {
    stem: string;
    branch: string;
  };
  day: {
    stem: string;
    branch: string;
  };
  hour: {
    stem: string;
    branch: string;
  };
}

/**
 * 从四柱字符串中提取天干地支
 * @param fourPillars 四柱对象，格式：{ year: "甲子", month: "乙丑", day: "丙寅", hour: "丁卯" }
 * @returns 提取后的天干地支对象
 */
export function extractPillars(fourPillars: FourPillars): ExtractedPillars {
  return {
    year: {
      stem: fourPillars.year.charAt(0),
      branch: fourPillars.year.charAt(1),
    },
    month: {
      stem: fourPillars.month.charAt(0),
      branch: fourPillars.month.charAt(1),
    },
    day: {
      stem: fourPillars.day.charAt(0),
      branch: fourPillars.day.charAt(1),
    },
    hour: {
      stem: fourPillars.hour.charAt(0),
      branch: fourPillars.hour.charAt(1),
    },
  };
}

/**
 * 从四柱字符串中提取单个柱的天干地支
 * @param pillar 柱字符串，格式：如 "甲子"
 * @returns 天干地支对象 { stem: "甲", branch: "子" }
 */
export function extractPillar(pillar: string): { stem: string; branch: string } {
  return {
    stem: pillar.charAt(0),
    branch: pillar.charAt(1),
  };
}
