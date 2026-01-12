/**
 * Step 10: 排大运（10 年一运）
 * 规则：年干阴阳 + 性别判顺逆；节气差 / 3 得起运岁数；月柱为起点推干支。
 */

import { calculateDayun, saveDayunResult } from "./dayun/route";

export interface Step10Result {
  dayun: {
    meta: {
      direction: "FORWARD" | "BACKWARD";
      start_age: number;
      start_year: number | null;
      start_month: number | null;
      diff_days: number;
      target_jieqi_name: string | null;
      target_jieqi_datetime: string | null;
      year_stem_yinyang: "YIN" | "YANG";
      gender: "MALE" | "FEMALE";
      rule_version: string;
    };
    list: Array<{
      seq: number;
      dayun_gan: string;
      dayun_zhi: string;
      dayun_pillar: string;
      start_age: number;
      start_year: number;
      start_month: number;
      end_year: number;
      end_month: number;
      direction: "FORWARD" | "BACKWARD";
      source_month_pillar: string;
    }>;
  };
}

export async function step10(
  input: {
    birth: { year: number; month: number; day: number; hour: number; minute: number };
    gender: string;
    fourPillars: { year: string; month: string; day: string; hour: string };
  },
  chartId: string | null = null
): Promise<Step10Result> {
  console.log("[step10] input ok:", { input, chartId });
  const { birth, gender, fourPillars } = input;
  const calc = calculateDayun({ birth, gender, fourPillars, cycles: 8 });

  if (chartId) {
    await saveDayunResult({
      chart_id: chartId,
      meta: {
        ...calc.meta,
        chart_id: chartId,
      },
      list: calc.list.map((item) => ({ ...item, chart_id: chartId })),
    });
  }

  console.log("[step10] response ok:", { dayunCount: calc.dayun_list?.length || 0 });
  return {
    dayun: {
      meta: {
        direction: calc.meta.direction,
        start_age: calc.meta.start_age,
        start_year: calc.meta.start_year,
        start_month: calc.meta.start_month,
        diff_days: calc.meta.diff_days,
        target_jieqi_name: calc.meta.target_jieqi_name,
        target_jieqi_datetime: calc.meta.target_jieqi_datetime
          ? calc.meta.target_jieqi_datetime.toISOString()
          : null,
        year_stem_yinyang: calc.meta.year_stem_yinyang,
        gender: calc.meta.gender,
        rule_version: calc.meta.rule_version,
      },
      list: calc.list.map((item) => ({
        seq: item.seq,
        dayun_gan: item.dayun_gan,
        dayun_zhi: item.dayun_zhi,
        dayun_pillar: item.dayun_pillar,
        start_age: item.start_age,
        start_year: item.start_year,
        start_month: item.start_month,
        end_year: item.end_year,
        end_month: item.end_month,
        direction: item.direction,
        source_month_pillar: item.source_month_pillar,
      })),
    },
  };
}
