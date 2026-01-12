import { query, transaction } from "@/lib/db";

export type DayunDirection = "FORWARD" | "BACKWARD";

export interface DayunMeta {
  chart_id: string;
  direction: DayunDirection;
  start_age: number;
  start_datetime: Date | null;
  start_year: number | null;
  start_month: number | null;
  year_stem_yinyang: "YIN" | "YANG";
  gender: "MALE" | "FEMALE";
  rule_version: string;
  diff_days: number;
  target_jieqi_name: string | null;
  target_jieqi_datetime: Date | null;
}

export interface DayunItem {
  chart_id: string;
  seq: number;
  dayun_gan: string;
  dayun_zhi: string;
  dayun_pillar: string;
  start_age: number;
  start_year: number;
  start_month: number;
  end_year: number;
  end_month: number;
  direction: DayunDirection;
  source_month_pillar: string;
  evidence_json: any;
}

export interface DayunResult {
  chart_id: string;
  meta: DayunMeta;
  list: DayunItem[];
}

type BirthInput = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

type DayunCalcInput = {
  birth: BirthInput;
  fourPillars: { year: string; month: string; day: string; hour: string };
  gender: string;
  cycles?: number;
};

const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const GAN_YINYANG: Record<string, "YIN" | "YANG"> = {
  甲: "YANG",
  乙: "YIN",
  丙: "YANG",
  丁: "YIN",
  戊: "YANG",
  己: "YIN",
  庚: "YANG",
  辛: "YIN",
  壬: "YANG",
  癸: "YIN",
};

const JIEQI_APPROX = [
  { name: "小寒", month: 1, day: 5 },
  { name: "大寒", month: 1, day: 20 },
  { name: "立春", month: 2, day: 4 },
  { name: "雨水", month: 2, day: 19 },
  { name: "惊蛰", month: 3, day: 6 },
  { name: "春分", month: 3, day: 21 },
  { name: "清明", month: 4, day: 5 },
  { name: "谷雨", month: 4, day: 20 },
  { name: "立夏", month: 5, day: 6 },
  { name: "小满", month: 5, day: 21 },
  { name: "芒种", month: 6, day: 6 },
  { name: "夏至", month: 6, day: 21 },
  { name: "小暑", month: 7, day: 7 },
  { name: "大暑", month: 7, day: 23 },
  { name: "立秋", month: 8, day: 8 },
  { name: "处暑", month: 8, day: 23 },
  { name: "白露", month: 9, day: 8 },
  { name: "秋分", month: 9, day: 23 },
  { name: "寒露", month: 10, day: 8 },
  { name: "霜降", month: 10, day: 23 },
  { name: "立冬", month: 11, day: 7 },
  { name: "小雪", month: 11, day: 22 },
  { name: "大雪", month: 12, day: 7 },
  { name: "冬至", month: 12, day: 21 },
];

const JIEQI_ORDER = [
  "小寒",
  "大寒",
  "立春",
  "雨水",
  "惊蛰",
  "春分",
  "清明",
  "谷雨",
  "立夏",
  "小满",
  "芒种",
  "夏至",
  "小暑",
  "大暑",
  "立秋",
  "处暑",
  "白露",
  "秋分",
  "寒露",
  "霜降",
  "立冬",
  "小雪",
  "大雪",
  "冬至",
];

function getLunarLib(): any | null {
  try {
    const Lunar = require("lunar-javascript");
    return Lunar;
  } catch {
    return null;
  }
}

function toChinaDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second));
}

function toChinaParts(date: Date) {
  const ms = date.getTime() + 8 * 3600 * 1000;
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  };
}

function parseYmdHms(ymdHms: string) {
  const [datePart, timePart] = ymdHms.split(" ");
  const [y, m, d] = datePart.split("-").map((v) => parseInt(v, 10));
  const [hh, mm, ss] = (timePart || "00:00:00").split(":").map((v) => parseInt(v, 10));
  return { year: y, month: m, day: d, hour: hh || 0, minute: mm || 0, second: ss || 0 };
}

function buildJiaziList(): string[] {
  const list: string[] = [];
  for (let i = 0; i < 60; i += 1) {
    list.push(GAN[i % 10] + ZHI[i % 12]);
  }
  return list;
}

function normalizeGender(raw: string): "MALE" | "FEMALE" {
  if (!raw) return "MALE";
  if (raw === "男" || raw.toLowerCase() === "male" || raw.toLowerCase() === "m") return "MALE";
  if (raw === "女" || raw.toLowerCase() === "female" || raw.toLowerCase() === "f") return "FEMALE";
  return "MALE";
}

function getDirection(yearStemYinyang: "YIN" | "YANG", gender: "MALE" | "FEMALE"): DayunDirection {
  if ((yearStemYinyang === "YANG" && gender === "MALE") || (yearStemYinyang === "YIN" && gender === "FEMALE")) {
    return "FORWARD";
  }
  return "BACKWARD";
}

function getJieqiListForYear(year: number) {
  const Lunar = getLunarLib();
  if (Lunar) {
    try {
      const solar = Lunar.Solar.fromYmdHms(year, 1, 1, 12, 0, 0);
      const table = solar.getLunar().getJieQiTable();
      const list = JIEQI_ORDER.map((name) => {
        const jq = table[name];
        if (!jq) return null;
        const parts = parseYmdHms(jq.toYmdHms());
        return { name, date: toChinaDate(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second) };
      }).filter(Boolean) as Array<{ name: string; date: Date }>;
      if (list.length > 0) return list;
    } catch {
      // fall through to approx
    }
  }

  return JIEQI_APPROX.map((item) => ({
    name: item.name,
    date: toChinaDate(year, item.month, item.day, 12, 0, 0),
  }));
}

function findTargetJieqi(birth: Date, direction: DayunDirection) {
  const birthParts = toChinaParts(birth);
  const years = [birthParts.year - 1, birthParts.year, birthParts.year + 1];
  const list = years.flatMap((y) => getJieqiListForYear(y));
  const sorted = list.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (direction === "FORWARD") {
    return sorted.find((item) => item.date.getTime() > birth.getTime()) || sorted[sorted.length - 1];
  }

  const reversed = [...sorted].reverse();
  return reversed.find((item) => item.date.getTime() < birth.getTime()) || sorted[0];
}

export function calculateDayun(input: DayunCalcInput) {
  const { birth, fourPillars, gender, cycles = 8 } = input;
  const birthDate = toChinaDate(birth.year, birth.month, birth.day, birth.hour, birth.minute, 0);
  const yearStem = fourPillars.year.charAt(0);
  const yearStemYinyang = GAN_YINYANG[yearStem] || "YANG";
  const normalizedGender = normalizeGender(gender);
  const direction = getDirection(yearStemYinyang, normalizedGender);

  const target = findTargetJieqi(birthDate, direction);
  const diffDaysRaw = Math.abs(target.date.getTime() - birthDate.getTime()) / (24 * 3600 * 1000);
  const startAge = Math.round((diffDaysRaw / 3) * 100) / 100;
  const targetParts = toChinaParts(target.date);
  const startYear = targetParts.year;
  const startMonth = targetParts.month;

  const jiazi = buildJiaziList();
  const monthPillar = fourPillars.month;
  const monthIndex = jiazi.indexOf(monthPillar);
  const list: DayunItem[] = [];

  if (monthIndex >= 0) {
    for (let i = 1; i <= cycles; i += 1) {
      const offset = direction === "FORWARD" ? i : -i;
      const idx = (monthIndex + offset + 60) % 60;
      const pillar = jiazi[idx];
      const startAgeI = Math.round((startAge + (i - 1) * 10) * 100) / 100;
      const startYearI = startYear + (i - 1) * 10;
      list.push({
        chart_id: "",
        seq: i,
        dayun_gan: pillar.charAt(0),
        dayun_zhi: pillar.charAt(1),
        dayun_pillar: pillar,
        start_age: startAgeI,
        start_year: startYearI,
        start_month: startMonth,
        end_year: startYearI + 9,
        end_month: startMonth,
        direction,
        source_month_pillar: monthPillar,
        evidence_json: {
          month_pillar: monthPillar,
          direction_rule: "year_stem_yinyang + gender",
          diff_days: diffDaysRaw,
          rule_version: "main_v1",
        },
      });
    }
  }

  return {
    meta: {
      direction,
      start_age: startAge,
      start_datetime: target.date,
      start_year: startYear,
      start_month: startMonth,
      year_stem_yinyang: yearStemYinyang,
      gender: normalizedGender,
      rule_version: "main_v1",
      diff_days: Math.round(diffDaysRaw * 100) / 100,
      target_jieqi_name: target.name,
      target_jieqi_datetime: target.date,
    },
    list,
  };
}

export async function saveDayunResult(result: DayunResult): Promise<DayunResult> {
  return await transaction(async (client) => {
    const { chart_id, meta, list } = result;

    try {
      await client.query(
        `INSERT INTO public.bazi_dayun_meta_tbl(
          chart_id, direction, start_age, start_datetime, start_year, start_month,
          year_stem_yinyang, gender, rule_version, diff_days,
          target_jieqi_name, target_jieqi_datetime, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (chart_id, rule_version) DO UPDATE SET
          direction = EXCLUDED.direction,
          start_age = EXCLUDED.start_age,
          start_datetime = EXCLUDED.start_datetime,
          start_year = EXCLUDED.start_year,
          start_month = EXCLUDED.start_month,
          year_stem_yinyang = EXCLUDED.year_stem_yinyang,
          gender = EXCLUDED.gender,
          diff_days = EXCLUDED.diff_days,
          target_jieqi_name = EXCLUDED.target_jieqi_name,
          target_jieqi_datetime = EXCLUDED.target_jieqi_datetime,
          created_at = NOW()`,
        [
          chart_id,
          meta.direction,
          meta.start_age,
          meta.start_datetime,
          meta.start_year,
          meta.start_month,
          meta.year_stem_yinyang,
          meta.gender,
          meta.rule_version,
          meta.diff_days,
          meta.target_jieqi_name,
          meta.target_jieqi_datetime,
          new Date(),
        ]
      );

      await client.query(`DELETE FROM public.bazi_dayun_result_tbl WHERE chart_id = $1`, [chart_id]);

      if (list.length > 0) {
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        for (const item of list) {
          placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, $${paramIndex + 13})`
          );
          values.push(
            chart_id,
            item.seq,
            item.dayun_gan,
            item.dayun_zhi,
            item.dayun_pillar,
            item.start_age,
            item.start_year,
            item.start_month,
            item.end_year,
            item.end_month,
            item.direction,
            item.source_month_pillar,
            JSON.stringify(item.evidence_json ?? {}),
            new Date()
          );
          paramIndex += 14;
        }

        await client.query(
          `INSERT INTO public.bazi_dayun_result_tbl(
            chart_id, seq, dayun_gan, dayun_zhi, dayun_pillar, start_age,
            start_year, start_month, end_year, end_month, direction,
            source_month_pillar, evidence_json, created_at
          ) VALUES ${placeholders.join(",")}`,
          values
        );
      }
    } catch (dbError: any) {
      if (dbError.code === "42P01") {
      } else {
      }
    }

    return result;
  });
}

export async function getDayunFromDB(chartId: string): Promise<DayunResult | null> {
  try {
    const metaRows = await query<DayunMeta>(
      `SELECT chart_id, direction, start_age, start_datetime, start_year, start_month,
              year_stem_yinyang, gender, rule_version, diff_days,
              target_jieqi_name, target_jieqi_datetime
       FROM public.bazi_dayun_meta_tbl
       WHERE chart_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [chartId]
    );

    const listRows = await query<DayunItem>(
      `SELECT chart_id, seq, dayun_gan, dayun_zhi, dayun_pillar, start_age,
              start_year, start_month, end_year, end_month, direction,
              source_month_pillar, evidence_json
       FROM public.bazi_dayun_result_tbl
       WHERE chart_id = $1
       ORDER BY seq ASC`,
      [chartId]
    );

    if (metaRows.length === 0 && listRows.length === 0) return null;

    const meta = metaRows[0];
    const list = listRows.map((row) => ({
      ...row,
      evidence_json:
        typeof row.evidence_json === "string" ? JSON.parse(row.evidence_json) : row.evidence_json,
    }));

    return {
      chart_id: chartId,
      meta,
      list,
    };
  } catch (error: any) {
    if (error.code === "42P01") {
      return null;
    }
    return null;
  }
}
