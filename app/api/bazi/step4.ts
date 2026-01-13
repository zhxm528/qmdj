/**
 * 步骤4：判旺衰：日主强弱与身态
 * 看日主是否得令、得地（通根）、得助（比劫印）、得生（印）、被克泄耗（官杀财食伤）如何。
 * 得出结论：身强 / 身弱 / 从强 / 从弱 / 假从 / 平衡（是否"从"要很谨慎）。
 * 
 * 本步骤会调用以下后台程序：
 * - /api/bazi/tonggen: 获取通根表数据
 * - /api/bazi/tougan: 计算并获取透干表数据
 * - /api/bazi/deling: 计算并获取得令结果
 */

import { calculateAndSaveTonggen, getTonggenFromDB, TonggenResult } from "./tonggen/utils";
import { calculateAndSaveTougan, getTouganFromDB, TouganResult } from "./tougan/route";
import { calculateAndSaveDeling, getDelingFromDB, DelingResult } from "./deling/route";

export interface Step4Result {
  strength_judgement: {
    body_state: string;
    score_summary: {
      favorable_to_dm: {
        resource: number;
        peer: number;
        rooting: number;
        season: number;
      };
      unfavorable_to_dm: {
        output: number;
        wealth: number;
        power: number;
        control: number;
      };
    };
    key_reasons: string[];
  };
  // 新增：通根表数据
  tonggen?: TonggenResult[];
  // 新增：透干表数据
  tougan?: TouganResult[];
  // 新增：得令结果
  deling?: DelingResult | null;
}

export async function step4(
  fourPillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  },
  dayMaster: string,
  dayMasterElement: string,
  step2Result: any,
  step3Result: any,
  chartId: string | null = null,
  ruleSet: string = "default"
): Promise<Step4Result> {
  console.log("[step4] input ok:", { fourPillars, dayMaster, dayMasterElement, step2Result, step3Result, chartId, ruleSet });
  const yearStem = fourPillars.year.charAt(0);
  const yearBranch = fourPillars.year.charAt(1);
  const monthStem = fourPillars.month.charAt(0);
  const monthBranch = fourPillars.month.charAt(1);
  const dayStem = fourPillars.day.charAt(0);
  const dayBranch = fourPillars.day.charAt(1);
  const hourStem = fourPillars.hour.charAt(0);
  const hourBranch = fourPillars.hour.charAt(1);

  // 天干五行
  const ganToElement: Record<string, string> = {
    甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
    己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
  };

  // 地支五行
  const branchToElement: Record<string, string> = {
    寅: "木", 卯: "木", 巳: "火", 午: "火", 辰: "土", 戌: "土", 丑: "土", 未: "土",
    申: "金", 酉: "金", 子: "水", 亥: "水",
  };

  // 十神表
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

  const tenGodsMap = TEN_GODS[dayMaster] || {};

  // 计算得分
  let resource = 0; // 印（生我）
  let peer = 0;    // 比劫（同我）
  let rooting = 0; // 通根（地支有同五行）
  let season = 0;  // 得令（月令同五行）
  let output = 0;  // 食伤（我生）
  let wealth = 0;  // 财（我克）
  let power = 0;   // 官杀（克我）
  let control = 0; // 其他控制因素

  const stems = [yearStem, monthStem, dayStem, hourStem];
  const branches = [yearBranch, monthBranch, dayBranch, hourBranch];

  // 分析天干
  stems.forEach(stem => {
    const tenGod = tenGodsMap[stem] || "";
    if (tenGod === "正印" || tenGod === "偏印") resource++;
    if (tenGod === "比肩" || tenGod === "劫财") peer++;
    if (tenGod === "食神" || tenGod === "伤官") output++;
    if (tenGod === "正财" || tenGod === "偏财") wealth++;
    if (tenGod === "正官" || tenGod === "七杀") power++;
  });

  // 分析地支（通根）
  branches.forEach(branch => {
    const branchElement = branchToElement[branch];
    if (branchElement === dayMasterElement) {
      rooting += 1;
    }
    // 检查藏干
    const hiddenStems = step2Result.hidden_stems;
    const branchHidden = 
      branch === yearBranch ? hiddenStems.year_branch :
      branch === monthBranch ? hiddenStems.month_branch :
      branch === dayBranch ? hiddenStems.day_branch :
      hiddenStems.hour_branch;
    branchHidden.forEach((hs: string) => {
      if (ganToElement[hs] === dayMasterElement) {
        rooting += 0.5;
      }
    });
  });

  // 得令（月令）
  const monthElement = branchToElement[monthBranch];
  if (monthElement === dayMasterElement) {
    season = 1;
  }

  // 判断身态
  const favorable = resource + peer + rooting + season;
  const unfavorable = output + wealth + power + control;
  const diff = favorable - unfavorable;

  let bodyState = "平衡";
  const reasons: string[] = [];

  if (diff > 2) {
    bodyState = "身强";
  } else if (diff < -2) {
    bodyState = "身弱";
  } else {
    bodyState = "平衡";
  }

  if (season > 0) {
    reasons.push(`月令在${monthBranch}，${step3Result.month_command.dominant_qi}，对${dayMasterElement}有${monthElement === dayMasterElement ? "助" : "克泄"}作用`);
  }
  if (rooting > 0) {
    reasons.push(`日支${dayBranch}为${dayMasterElement}根，提供通根支持`);
  }
  if (resource + peer > 0) {
    reasons.push(`盘中印比${resource + peer}个，提供生助`);
  }
  if (output + wealth + power > 0) {
    reasons.push(`盘中官财食伤${output + wealth + power}个，消耗/制约日主`);
  }

  // 调用通根表 API
  let tonggenData: TonggenResult[] | undefined = undefined;
  try {
    await calculateAndSaveTonggen();
    tonggenData = await getTonggenFromDB();
  } catch (tonggenError: any) {
    console.error("[step4] 调用 tonggen API 时出错:", tonggenError);
    console.error("[step4] tonggen 错误堆栈:", tonggenError.stack);
    // 不抛出错误，继续执行
  }

  // 调用透干表 API（需要 chartId）
  let touganData: TouganResult[] | undefined = undefined;
  if (chartId) {
    try {
      // 先计算并保存透干表
      await calculateAndSaveTougan(chartId);
      // 然后获取透干表结果
      touganData = await getTouganFromDB(chartId);
    } catch (touganError: any) {
      console.error("[step4] 调用 tougan API 时出错:", touganError);
      console.error("[step4] tougan 错误堆栈:", touganError.stack);
      // 不抛出错误，继续执行
    }
    }

  // 调用得令计算 API（需要 chartId）
  let delingData: DelingResult | null = null;
  if (chartId) {
    try {
      // 先计算并保存得令结果
      await calculateAndSaveDeling(chartId, ruleSet);
      // 然后获取得令结果
      delingData = await getDelingFromDB(chartId, ruleSet);
      if (delingData) {
      }
    } catch (delingError: any) {
      console.error("[step4] 调用 deling API 时出错:", delingError);
      console.error("[step4] deling 错误堆栈:", delingError.stack);
      // 不抛出错误，继续执行
    }
    }
  console.log("[step4] response ok:", { bodyState, tonggenCount: tonggenData?.length || 0, touganCount: touganData?.length || 0, deling: !!delingData });
  return {
    strength_judgement: {
      body_state: bodyState,
      score_summary: {
        favorable_to_dm: {
          resource: Math.round(resource),
          peer: Math.round(peer),
          rooting: Math.round(rooting),
          season: Math.round(season),
        },
        unfavorable_to_dm: {
          output: Math.round(output),
          wealth: Math.round(wealth),
          power: Math.round(power),
          control: Math.round(control),
        },
      },
      key_reasons: reasons,
    },
    tonggen: tonggenData,
    tougan: touganData,
    deling: delingData,
  };
}
