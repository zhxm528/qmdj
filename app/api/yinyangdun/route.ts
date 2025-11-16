import { NextResponse } from "next/server";
import { getFourPillars } from "@/lib/ganzhi";

type DunType = "阳遁" | "阴遁";
type Yuan = "上元" | "中元" | "下元";

type JieqiInfo = { name: string; month: number; day: number };

type IntervalRule = {
  start: string;
  end: string;
  dunType: DunType;
  ju: Record<Yuan, number>;
};

const JIEQI: JieqiInfo[] = [
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

const JIEQI_MAP = JIEQI.reduce<Record<string, { month: number; day: number }>>((acc, item) => {
  acc[item.name] = { month: item.month, day: item.day };
  return acc;
}, {});

const UPPER_DAY_PILLARS = [
  "甲子", "乙丑", "丙寅", "丁卯", "戊辰",
  "己卯", "庚辰", "辛巳", "壬午", "癸未",
  "甲午", "乙未", "丙申", "丁酉", "戊戌",
  "己酉", "庚戌", "辛亥", "壬子", "癸丑",
];

const MIDDLE_DAY_PILLARS = [
  "己巳", "庚午", "辛未", "壬申", "癸酉",
  "甲申", "乙酉", "丙戌", "丁亥", "戊子",
  "己亥", "庚子", "辛丑", "壬寅", "癸卯",
  "甲寅", "乙卯", "丙辰", "丁巳", "戊午",
];

const LOWER_DAY_PILLARS = [
  "甲戌", "乙亥", "丙子", "丁丑", "戊寅",
  "己丑", "庚寅", "辛卯", "壬辰", "癸巳",
  "甲辰", "乙巳", "丙午", "丁未", "戊申",
  "己未", "庚申", "辛酉", "壬戌", "癸亥",
];

const DAY_PILLAR_TO_YUAN: Record<string, Yuan> = (() => {
  const map: Record<string, Yuan> = {};
  for (const pillar of UPPER_DAY_PILLARS) map[pillar] = "上元";
  for (const pillar of MIDDLE_DAY_PILLARS) map[pillar] = "中元";
  for (const pillar of LOWER_DAY_PILLARS) map[pillar] = "下元";
  return map;
})();

const INTERVAL_RULES: IntervalRule[] = [
  { start: "冬至", end: "小寒", dunType: "阳遁", ju: { 上元: 1, 中元: 7, 下元: 4 } },
  { start: "小寒", end: "大寒", dunType: "阳遁", ju: { 上元: 2, 中元: 8, 下元: 5 } },
  { start: "大寒", end: "立春", dunType: "阳遁", ju: { 上元: 3, 中元: 9, 下元: 6 } },
  { start: "立春", end: "雨水", dunType: "阳遁", ju: { 上元: 8, 中元: 5, 下元: 2 } },
  { start: "雨水", end: "惊蛰", dunType: "阳遁", ju: { 上元: 9, 中元: 6, 下元: 3 } },
  { start: "惊蛰", end: "春分", dunType: "阳遁", ju: { 上元: 1, 中元: 7, 下元: 4 } },
  { start: "春分", end: "清明", dunType: "阳遁", ju: { 上元: 3, 中元: 9, 下元: 6 } },
  { start: "清明", end: "谷雨", dunType: "阳遁", ju: { 上元: 4, 中元: 1, 下元: 7 } },
  { start: "谷雨", end: "立夏", dunType: "阳遁", ju: { 上元: 5, 中元: 2, 下元: 8 } },
  { start: "立夏", end: "小满", dunType: "阴遁", ju: { 上元: 4, 中元: 1, 下元: 7 } },
  { start: "小满", end: "芒种", dunType: "阴遁", ju: { 上元: 5, 中元: 2, 下元: 8 } },
  { start: "芒种", end: "夏至", dunType: "阴遁", ju: { 上元: 6, 中元: 3, 下元: 9 } },
  { start: "夏至", end: "小暑", dunType: "阴遁", ju: { 上元: 9, 中元: 3, 下元: 6 } },
  { start: "小暑", end: "大暑", dunType: "阴遁", ju: { 上元: 8, 中元: 2, 下元: 5 } },
  { start: "大暑", end: "立秋", dunType: "阴遁", ju: { 上元: 7, 中元: 1, 下元: 4 } },
  { start: "立秋", end: "处暑", dunType: "阴遁", ju: { 上元: 2, 中元: 5, 下元: 8 } },
  { start: "处暑", end: "白露", dunType: "阴遁", ju: { 上元: 1, 中元: 4, 下元: 7 } },
  { start: "白露", end: "秋分", dunType: "阴遁", ju: { 上元: 9, 中元: 3, 下元: 6 } },
  { start: "秋分", end: "寒露", dunType: "阴遁", ju: { 上元: 7, 中元: 1, 下元: 4 } },
  { start: "寒露", end: "霜降", dunType: "阴遁", ju: { 上元: 6, 中元: 9, 下元: 3 } },
  { start: "霜降", end: "立冬", dunType: "阴遁", ju: { 上元: 5, 中元: 8, 下元: 2 } },
  { start: "立冬", end: "小雪", dunType: "阴遁", ju: { 上元: 6, 中元: 9, 下元: 3 } },
  { start: "小雪", end: "大雪", dunType: "阴遁", ju: { 上元: 5, 中元: 8, 下元: 2 } },
  { start: "大雪", end: "冬至", dunType: "阴遁", ju: { 上元: 4, 中元: 7, 下元: 1 } },
];

function buildJieqiTimeline(year: number) {
  const entries: Array<{ name: string; date: Date }> = [];
  for (let offset = -1; offset <= 1; offset++) {
    const currentYear = year + offset;
    for (const item of JIEQI) {
      entries.push({
        name: item.name,
        date: new Date(currentYear, item.month - 1, item.day),
      });
    }
  }
  entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  return entries;
}

function findIntervalIndex(year: number, month: number, day: number): number {
  const target = new Date(year, month - 1, day);
  const timeline = buildJieqiTimeline(year);

  for (let i = 0; i < timeline.length - 1; i++) {
    const current = timeline[i];
    const next = timeline[i + 1];
    if (target >= current.date && target < next.date) {
      const idx = INTERVAL_RULES.findIndex((rule) => rule.start === current.name);
      if (idx !== -1) {
        return idx;
      }
    }
  }

  const fallbackStart = timeline[timeline.length - 2]?.name;
  const fallbackIdx = INTERVAL_RULES.findIndex((rule) => rule.start === fallbackStart);
  return fallbackIdx === -1 ? 0 : fallbackIdx;
}

function getYuanByDayPillar(dayPillar: string): Yuan | null {
  return DAY_PILLAR_TO_YUAN[dayPillar] ?? null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, time } = body || {};
    if (!date || !time) {
      return NextResponse.json({ error: "date 和 time 为必填" }, { status: 400 });
    }

    const [y, m, d] = String(date).split("-").map((s: string) => parseInt(s, 10));
    const [hourStr, minuteStr = "0"] = String(time).split(":");
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (!y || !m || !d || Number.isNaN(hour) || hour < 0 || hour > 23 || Number.isNaN(minute)) {
      return NextResponse.json({ error: "date/time 格式不正确" }, { status: 400 });
    }

    const pillars = getFourPillars(y, m, d, hour, minute);
    const dayPillar = pillars.day;
    const yuan = getYuanByDayPillar(dayPillar);
    if (!yuan) {
      return NextResponse.json({ error: `无法判定日柱 ${dayPillar} 所属的三元` }, { status: 400 });
    }

    const intervalIndex = findIntervalIndex(y, m, d);
    const interval = INTERVAL_RULES[intervalIndex];
    const ju = interval.ju[yuan];

    return NextResponse.json({
      dunType: interval.dunType,
      ju,
      date,
      time,
    });
  } catch (error) {
    return NextResponse.json({ error: "解析请求失败" }, { status: 400 });
  }
}


