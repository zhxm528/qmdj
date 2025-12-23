/**
 * 步骤3：抓月令与季节（定大方向）
 * 以月支（月令）为第一权重：这决定"当令之气"（季节力量），很多判断从这里定调。
 */

export interface Step3Result {
  month_command: {
    month_branch: string;
    season: string;
    dominant_qi: string;
    supporting_elements_rank: string[];
  };
}

// 地支对应的季节和当令之气
const BRANCH_SEASON: Record<string, { season: string; dominantQi: string; elements: string[] }> = {
  寅: { season: "春", dominantQi: "木旺", elements: ["木", "火", "水", "土", "金"] },
  卯: { season: "春", dominantQi: "木旺", elements: ["木", "火", "水", "土", "金"] },
  辰: { season: "春", dominantQi: "土旺", elements: ["土", "木", "火", "水", "金"] },
  巳: { season: "夏", dominantQi: "火旺", elements: ["火", "土", "木", "金", "水"] },
  午: { season: "夏", dominantQi: "火旺", elements: ["火", "土", "木", "金", "水"] },
  未: { season: "夏", dominantQi: "土旺", elements: ["土", "火", "木", "金", "水"] },
  申: { season: "秋", dominantQi: "金旺", elements: ["金", "水", "土", "火", "木"] },
  酉: { season: "秋", dominantQi: "金旺", elements: ["金", "水", "土", "火", "木"] },
  戌: { season: "秋", dominantQi: "土旺", elements: ["土", "金", "水", "火", "木"] },
  亥: { season: "冬", dominantQi: "水旺", elements: ["水", "木", "金", "土", "火"] },
  子: { season: "冬", dominantQi: "水旺", elements: ["水", "木", "金", "土", "火"] },
  丑: { season: "冬", dominantQi: "土旺", elements: ["土", "水", "金", "木", "火"] },
};

export function step3(fourPillars: {
  year: string;
  month: string;
  day: string;
  hour: string;
}): Step3Result {
  const monthBranch = fourPillars.month.charAt(1);
  const monthInfo = BRANCH_SEASON[monthBranch] || {
    season: "未知",
    dominantQi: "未知",
    elements: ["未知"],
  };

  return {
    month_command: {
      month_branch: monthBranch,
      season: monthInfo.season,
      dominant_qi: monthInfo.dominantQi,
      supporting_elements_rank: monthInfo.elements,
    },
  };
}

