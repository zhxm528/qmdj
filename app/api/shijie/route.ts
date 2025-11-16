import { NextResponse } from "next/server";

type Shijie = {
  name: string;
  month: number;
  day: number;
};

// 24节气近似日期（公历）
const JIEQI: Shijie[] = [
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

function compareMonthDay(a: { month: number; day: number }, b: { month: number; day: number }) {
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function getShijie(year: number, month: number, day: number) {
  // 找到不晚于给定日期的最近节气
  const target = { month, day };
  let candidateIndex = 0;
  let candidate = JIEQI[0];

  for (let i = 0; i < JIEQI.length; i++) {
    const item = JIEQI[i];
    if (compareMonthDay(item, target) <= 0) {
      candidate = item;
      candidateIndex = i;
    }
  }

  // 年初（1月1-4日）在小寒之前，归到上一年的冬至
  let candidateYear = year;
  if (month === 1 && day < 5) {
    candidate = { name: "冬至", month: 12, day: 21 };
    candidateIndex = JIEQI.length - 1; // 冬至是最后一个节气
    candidateYear = year - 1; // 冬至是上一年的
  }

  // 获取下一个节气（如果当前是最后一个，则下一个是第一个）
  const nextIndex = (candidateIndex + 1) % JIEQI.length;
  const nextJieqi = JIEQI[nextIndex];
  
  // 如果下一个节气是下一年的节气（比如从冬至到小寒），需要调整年份
  let nextYear = year;
  if (candidateIndex === JIEQI.length - 1 && nextIndex === 0) {
    // 从冬至到小寒，是跨年的，小寒是当前年的
    nextYear = year;
  } else if (candidate.month > nextJieqi.month) {
    // 如果当前节气月份大于下一个节气月份（比如12月到1月），也是跨年
    nextYear = year + 1;
  }

  return {
    shijie: candidate.name,
    startShijie: candidate.name,
    endShijie: nextJieqi.name,
    occursOn: `${candidateYear}-${String(candidate.month).padStart(2, "0")}-${String(candidate.day).padStart(2, "0")}`,
    nextOccursOn: `${nextYear}-${String(nextJieqi.month).padStart(2, "0")}-${String(nextJieqi.day).padStart(2, "0")}`,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, time, lunarYear, lunarMonth, lunarDay } = body || {};

    if (!date || !time) {
      return NextResponse.json({ error: "date 和 time 为必填" }, { status: 400 });
    }

    let y: number, m: number, d: number;

    // 如果提供了农历日期，先转换为公历日期
    if (lunarYear && lunarMonth && lunarDay) {
      try {
        const Lunar = require("lunar-javascript");
        // 解析农历月份（处理"正月"、"冬月"等格式）
        const monthMap: Record<string, number> = {
          "正": 1, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6,
          "七": 7, "八": 8, "九": 9, "十": 10, "冬": 11, "腊": 12,
          "正月": 1, "二月": 2, "三月": 3, "四月": 4, "五月": 5, "六月": 6,
          "七月": 7, "八月": 8, "九月": 9, "十月": 10, "冬月": 11, "腊月": 12,
        };
        
        // 解析农历日期（处理"初一"、"十五"等格式）
        const dayMap: Record<string, number> = {
          "初一": 1, "初二": 2, "初三": 3, "初四": 4, "初五": 5, "初六": 6,
          "初七": 7, "初八": 8, "初九": 9, "初十": 10,
          "十一": 11, "十二": 12, "十三": 13, "十四": 14, "十五": 15,
          "十六": 16, "十七": 17, "十八": 18, "十九": 19, "二十": 20,
          "廿一": 21, "廿二": 22, "廿三": 23, "廿四": 24, "廿五": 25,
          "廿六": 26, "廿七": 27, "廿八": 28, "廿九": 29, "三十": 30,
        };

        const lunarMonthNum = monthMap[lunarMonth] || parseInt(lunarMonth);
        const lunarDayNum = dayMap[lunarDay] || parseInt(lunarDay);
        const lunarYearNum = parseInt(lunarYear);

        if (isNaN(lunarYearNum) || isNaN(lunarMonthNum) || isNaN(lunarDayNum)) {
          throw new Error("农历日期格式错误");
        }

        // 使用 lunar-javascript 将农历转换为公历
        const lunar = Lunar.Lunar.fromYmd(lunarYearNum, lunarMonthNum, lunarDayNum);
        const solar = lunar.getSolar();
        y = solar.getYear();
        m = solar.getMonth();
        d = solar.getDay();
      } catch (error) {
        // 如果农历转换失败，回退到使用公历日期
        const parts = String(date).split("-").map((s: string) => parseInt(s, 10));
        if (parts.length !== 3) {
          return NextResponse.json({ error: "date 格式应为 YYYY-MM-DD" }, { status: 400 });
        }
        [y, m, d] = parts;
      }
    } else {
      // 使用公历日期
      const parts = String(date).split("-").map((s: string) => parseInt(s, 10));
      if (parts.length !== 3) {
        return NextResponse.json({ error: "date 格式应为 YYYY-MM-DD" }, { status: 400 });
      }
      [y, m, d] = parts;
    }

    if (!y || !m || !d) {
      return NextResponse.json({ error: "日期格式错误" }, { status: 400 });
    }

    // time 暂不精确参与节气判断（需要更复杂天文算法）；保留回显
    const result = getShijie(y, m, d);

    return NextResponse.json({ ...result, date, time });
  } catch (error) {
    return NextResponse.json({ error: "解析请求失败" }, { status: 400 });
  }
}


