/**
 * 步骤5：看寒暖燥湿与调候（可选但很常用）
 * 依据季节与五行分布判断是否偏寒、偏燥、偏湿、偏热；
 * 这一步常用来修正"强弱→取用"时的细节（有些流派把它当核心）。
 */

import { calculateAndSaveHanZao, getHanZaoFromDB, HanZaoResult } from "./han_zao/route";

export interface Step5Result {
  climate_balance: {
    temperature: string;
    humidity: string;
    dry_wet: string;
    needs: string[];
    notes: string[];
  };
  han_zao?: HanZaoResult | null;
}

export async function step5(
  fourPillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  },
  step3Result: any,
  chartId: string | null = null,
  ruleSet: string = "default"
): Promise<Step5Result> {
  const season = step3Result.month_command.season;
  const dominantQi = step3Result.month_command.dominant_qi;

  // 统计五行分布
  const ganToElement: Record<string, string> = {
    甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
    己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
  };

  const elements: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  
  [fourPillars.year, fourPillars.month, fourPillars.day, fourPillars.hour].forEach(pillar => {
    const stem = pillar.charAt(0);
    const element = ganToElement[stem];
    if (element) elements[element]++;
  });

  // 判断寒暖燥湿
  let temperature = "中等";
  let humidity = "中等";
  let dryWet = "中等";
  const needs: string[] = [];
  const notes: string[] = [];

  if (season === "冬" || elements["水"] > elements["火"]) {
    temperature = "偏寒";
    if (elements["火"] === 0) {
      needs.push("适度火暖");
    }
  } else if (season === "夏" || elements["火"] > elements["水"]) {
    temperature = "偏热";
    if (elements["水"] === 0) {
      needs.push("适度水润");
    }
  }

  if (elements["水"] > elements["火"] + elements["土"]) {
    humidity = "偏湿";
    if (elements["火"] === 0) {
      needs.push("适度火燥");
    }
  } else if (elements["火"] > elements["水"] + elements["土"]) {
    dryWet = "偏燥";
    if (elements["水"] === 0) {
      needs.push("适度水润");
    }
  }

  if (needs.length === 0) {
    notes.push("调候需求不明显");
  }

  let hanZaoData: HanZaoResult | null = null;
  if (chartId) {
    try {
      console.log("[step5] 调用 han_zao API，chart_id:", chartId);
      await calculateAndSaveHanZao(chartId, ruleSet);
      hanZaoData = await getHanZaoFromDB(chartId);
      console.log(
        "[step5] 寒暖燥湿结果:",
        hanZaoData ? `找到 ${hanZaoData.details.length} 条明细` : "null"
      );
    } catch (hanZaoError: any) {
      console.error("[step5] 调用 han_zao API 时出错:", hanZaoError);
      console.error("[step5] han_zao 错误堆栈:", hanZaoError.stack);
    }
  } else {
    console.log("[step5] chart_id 为空，跳过 han_zao 计算");
  }

  return {
    climate_balance: {
      temperature,
      humidity,
      dry_wet: dryWet,
      needs,
      notes,
    },
    han_zao: hanZaoData,
  };
}

