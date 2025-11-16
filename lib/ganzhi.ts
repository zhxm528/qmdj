/**
 * 干支工具（修正版）
 * - 精确口径：依赖 lunar-javascript 提供的节气交节时刻
 * - 退化口径：在未安装/加载 lunar-javascript 时，使用近似日期（会有±1天误差）
 */

// ===================== 基础表 =====================

export const TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const DIZHI   = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 建寅：寅为正月
const MONTH_DIZHI = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];

// ===================== 小工具 =====================

/** 安全取模（与数学定义一致：返回 [0, m) ） */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** 动态获取 lunar-javascript，失败返回 null（用于 SSR 或可选依赖） */
function getLunarLib(): any | null {
  try {
    
    const Lunar = require("lunar-javascript");
    return Lunar;
  } catch {
    return null;
  }
}

// ===================== 干支年 =====================

/**
 * 公历年份 → 干支年（仅按年号推，不考虑立春换年）
 * 基准年：公元 4 年是甲子年
 */
export function yearToGanzhi(year: number): string {
  const offset = year - 4;
  const gan = TIANGAN[mod(offset, 10)];
  const zhi = DIZHI[mod(offset, 12)];
  return gan + zhi;
}

/** 近似：是否过了“立春”（固定 2 月 4 日）。仅作兜底；精确应使用 isAfterLiChunPrecise。 */
export function isAfterLiChun(month: number, day: number): boolean {
  if (month > 2) return true;
  if (month < 2) return false;
  return day >= 4; // 近似
}

/** 精确：是否过了当年立春（需要 lunar-javascript） */
function isAfterLiChunPrecise(year: number, month: number, day: number, h = 12, m = 0, s = 0): boolean {
  const Lunar = getLunarLib();
  if (!Lunar) return isAfterLiChun(month, day); // 退化
  const solar = Lunar.Solar.fromYmdHms(year, month, day, h, m, s);
  const jieqiTable = solar.getLunar().getJieQiTable();
  const liChun = jieqiTable["立春"]; // Solar
  if (!liChun) return isAfterLiChun(month, day); // 极少数异常退化
  return solar.toYmdHms() >= liChun.toYmdHms();
}

/**
 * 获取指定日期对应的干支年（默认口径：立春换年）
 * - 如需“春节换年”，可另写一个按春节口径的函数
 */
export function getGanzhiYear(year: number, month: number, day: number): string {
  const afterLiChun = isAfterLiChunPrecise(year, month, day);
  const y = afterLiChun ? year : year - 1;
  return yearToGanzhi(y);
}

/** 年干索引（0..9） */
function getYearGan(year: number): number {
  const offset = year - 4;
  return mod(offset, 10);
}

// ===================== 干支月 =====================

/**
 * 五虎遁月：根据“年干”确定寅月天干（修正后的正确映射）
 * 甲、己 → 丙(2)
 * 乙、庚 → 戊(4)
 * 丙、辛 → 庚(6)
 * 丁、壬 → 壬(8)
 * 戊、癸 → 甲(0)
 */
function getYinYueTianGan(yearGan: number): number {
  switch (yearGan) {
    case 0: // 甲
    case 5: // 己
      return 2; // 丙
    case 1: // 乙
    case 6: // 庚
      return 4; // 戊
    case 2: // 丙
    case 7: // 辛
      return 6; // 庚
    case 3: // 丁
    case 8: // 壬
      return 8; // 壬
    case 4: // 戊
    case 9: // 癸
      return 0; // 甲
    default:
      return 2; // 容错
  }
}

/** 退化口径：固定“节”日的近似（会有 ±1 天误差） */
const JIEQI_MONTHS_APPROX: Array<{ name: string; month: number; day: number; monthOrder: number }> = [
  { name: "小寒", month: 1, day: 5, monthOrder: 12 },  // 丑月（上一年）
  { name: "立春", month: 2, day: 4, monthOrder: 1 },   // 寅
  { name: "惊蛰", month: 3, day: 6, monthOrder: 2 },   // 卯
  { name: "清明", month: 4, day: 5, monthOrder: 3 },   // 辰
  { name: "立夏", month: 5, day: 6, monthOrder: 4 },   // 巳
  { name: "芒种", month: 6, day: 6, monthOrder: 5 },   // 午
  { name: "小暑", month: 7, day: 7, monthOrder: 6 },   // 未
  { name: "立秋", month: 8, day: 8, monthOrder: 7 },   // 申
  { name: "白露", month: 9, day: 8, monthOrder: 8 },   // 酉
  { name: "寒露", month: 10, day: 8, monthOrder: 9 },  // 戌
  { name: "立冬", month: 11, day: 7, monthOrder: 10 }, // 亥
  { name: "大雪", month: 12, day: 7, monthOrder: 11 }, // 子
];

function compareMonthDay(a: { month: number; day: number }, b: { month: number; day: number }): number {
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** 退化：用近似“节”判断月序（1..12），1=寅 … 12=丑 */
function getMonthOrderByJieqiApprox(month: number, day: number): number {
  const target = { month, day };
  if (month === 1 && day < 5) return 11; // 年初落大雪之后至小寒之前 → 子月(11)
  let candidate = JIEQI_MONTHS_APPROX[JIEQI_MONTHS_APPROX.length - 1];
  for (const item of JIEQI_MONTHS_APPROX) {
    if (compareMonthDay(item, target) <= 0) candidate = item; else break;
  }
  return candidate.monthOrder;
}

/** 精确：按真实“交节”判月序（需要 lunar-javascript） */
function getMonthOrderByJieqiPrecise(year: number, month: number, day: number, h = 12, m = 0, s = 0): number {
  const Lunar = getLunarLib();
  if (!Lunar) return getMonthOrderByJieqiApprox(month, day);
  const solar = Lunar.Solar.fromYmdHms(year, month, day, h, m, s);
  const jq = solar.getLunar().getJieQiTable();
  const ORDER = ["立春","惊蛰","清明","立夏","芒种","小暑","立秋","白露","寒露","立冬","大雪","小寒"]; // 12个“节”
  let idx = 11; // 默认“小寒”（对应月序12=丑）
  for (let i = 0; i < ORDER.length; i++) {
    const k = ORDER[i];
    const jt = jq[k];
    if (!jt) continue;
    if (jt.toYmdHms() <= solar.toYmdHms()) idx = i; else break;
  }

  // 若日期在小寒之前，则仍属于上一节“大雪”所对应的子月
  const xiaoHan = jq["小寒"];
  const daXue = jq["大雪"];
  if (xiaoHan && daXue && solar.toYmdHms() < xiaoHan.toYmdHms()) {
    idx = ORDER.indexOf("大雪");
  }

  return idx + 1; // 1..12
}

/**
 * 计算干支月
 * - 若提供 day：用精确“交节”→ 月序 → 月干支
 * - 若不提供 day：仅作近似（用于下拉占位，不作严肃占例）
 */
export function monthToGanzhi(year: number, month: number, day?: number): string {
  if (day !== undefined) {
    // 先算“年柱”的年干（按立春换年）
    const yearGanzhi = getGanzhiYear(year, month, day);
    const yearGanIndex = TIANGAN.indexOf(yearGanzhi.charAt(0));
    const yinYueGan = getYinYueTianGan(yearGanIndex);

    const monthOrder = getMonthOrderByJieqiPrecise(year, month, day); // 1..12
    const gan = TIANGAN[mod(yinYueGan + (monthOrder - 1), 10)];
    const zhi = MONTH_DIZHI[monthOrder - 1];
    return gan + zhi;
  }

  // 未给 day：退化近似（2月→寅月起算，1月→丑月）
  const yearGan = getYearGan(year);
  const yinYueGan = getYinYueTianGan(yearGan);
  const monthOrderApprox = (month >= 2) ? (month - 2) : 11; // 0..11
  const gan = TIANGAN[mod(yinYueGan + monthOrderApprox, 10)];
  const zhi = MONTH_DIZHI[monthOrderApprox];
  return gan + zhi;
}

// ===================== 干支日 =====================

/** 公历 → 儒略日（JDN，格里历） */
export function dateToJulianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day
    + Math.floor((153 * m + 2) / 5)
    + 365 * y
    + Math.floor(y / 4)
    - Math.floor(y / 100)
    + Math.floor(y / 400)
    - 32045;
}

/**
 * 干支日（以当日本地 0:00 为界）
 * 基准：1984-02-02 为甲子日
 */
export function dayToGanzhi(year: number, month: number, day: number): string {
  const baseJDN = dateToJulianDay(1984, 2, 2); // 公认甲子日
  const jdn = dateToJulianDay(year, month, day);
  let diff = mod(jdn - baseJDN, 60);
  const gan = TIANGAN[diff % 10];
  const zhi = DIZHI[diff % 12];
  return gan + zhi;
}

/** 获取日干索引（0..9） */
export function getDayGan(year: number, month: number, day: number): number {
  const s = dayToGanzhi(year, month, day);
  return TIANGAN.indexOf(s.charAt(0));
}

// ===================== 干支时 =====================

/** 小时 → 地支索引（0..11 = 子..亥） */
export function getHourDizhiIndex(hour: number): number {
  if (hour === 23 || hour === 0) return 0; // 子
  if (hour >= 1 && hour <= 2)  return 1; // 丑
  if (hour >= 3 && hour <= 4)  return 2; // 寅
  if (hour >= 5 && hour <= 6)  return 3; // 卯
  if (hour >= 7 && hour <= 8)  return 4; // 辰
  if (hour >= 9 && hour <= 10) return 5; // 巳
  if (hour >= 11 && hour <= 12) return 6; // 午
  if (hour >= 13 && hour <= 14) return 7; // 未
  if (hour >= 15 && hour <= 16) return 8; // 申
  if (hour >= 17 && hour <= 18) return 9; // 酉
  if (hour >= 19 && hour <= 20) return 10; // 戌
  if (hour >= 21 && hour <= 22) return 11; // 亥
  return 0; // 兜底
}

/** 由日干推子时起干（五鼠遁日） */
function getZiShiGan(dayGan: number): number {
  // 甲己 → 甲(0)；乙庚 → 丙(2)；丙辛 → 戊(4)；丁壬 → 庚(6)；戊癸 → 壬(8)
  switch (dayGan) {
    case 0: case 5: return 0;
    case 1: case 6: return 2;
    case 2: case 7: return 4;
    case 3: case 8: return 6;
    case 4: case 9: return 8;
    default: return 0;
  }
}

/** 小时 → 干支时 */
export function hourToGanzhi(year: number, month: number, day: number, hour: number): string {
  const dayGan = getDayGan(year, month, day);
  const hourZhiIdx = getHourDizhiIndex(hour);
  const ziGan = getZiShiGan(dayGan);
  const gan = TIANGAN[mod(ziGan + hourZhiIdx, 10)];
  const zhi = DIZHI[hourZhiIdx];
  return gan + zhi;
}

// ===================== 选项/显示 =====================

export function getYearOptions(startYear = 1950, endYear = 2050) {
  const years: Array<{ value: number; label: string; ganzhi: string }> = [];
  for (let y = startYear; y <= endYear; y++) {
    const gz = yearToGanzhi(y);
    years.push({ value: y, label: `${y}年 (${gz})`, ganzhi: gz });
  }
  return years;
}

export function getMonthOptions(year: number) {
  const months: Array<{ value: number; label: string; ganzhi: string }> = [];
  for (let m = 1; m <= 12; m++) {
    const gz = monthToGanzhi(year, m); // 近似，仅作下拉占位
    months.push({ value: m, label: `${m}月 (${gz})`, ganzhi: gz });
  }
  return months;
}

export function getDayOptions(year: number, month: number) {
  if (!year || !month) return [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: Array<{ value: number; label: string; ganzhi: string }> = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const gz = dayToGanzhi(year, month, d);
    days.push({ value: d, label: `${d}日`, ganzhi: gz });
  }
  return days;
}

export function getHourOptions(year: number, month: number, day: number) {
  const hours: Array<{ value: number; label: string; ganzhi: string }> = [];
  for (let h = 0; h < 24; h++) {
    const gz = hourToGanzhi(year, month, day, h);
    hours.push({ value: h, label: `${String(h).padStart(2, "0")}时`, ganzhi: gz });
  }
  return hours;
}

export function getShichenName(hour: number): { name: string; timeRange: string } {
  const shichenMap: { [k: number]: { name: string; start: number; end: number } } = {
    0: { name: "子时", start: 23, end: 0 },
    1: { name: "丑时", start: 1, end: 2 },
    2: { name: "寅时", start: 3, end: 4 },
    3: { name: "卯时", start: 5, end: 6 },
    4: { name: "辰时", start: 7, end: 8 },
    5: { name: "巳时", start: 9, end: 10 },
    6: { name: "午时", start: 11, end: 12 },
    7: { name: "未时", start: 13, end: 14 },
    8: { name: "申时", start: 15, end: 16 },
    9: { name: "酉时", start: 17, end: 18 },
    10:{ name: "戌时", start: 19, end: 20 },
    11:{ name: "亥时", start: 21, end: 22 },
  };
  const dizhiIndex = getHourDizhiIndex(hour);
  const s = shichenMap[dizhiIndex];
  if (s.start > s.end) {
    return { name: s.name, timeRange: `${s.start}:00–${String(s.end).padStart(2,"0")}:59` };
  }
  return { name: s.name, timeRange: `${String(s.start).padStart(2,"0")}:00–${String(s.end+1).padStart(2,"0")}:00` };
}

// ===================== 农历转换工具 =====================

/**
 * 将公历日期转换为农历显示字符串
 * 返回格式：如 "冬月初五"
 */
export function dateToLunar(year: number, month: number, day: number): string {
  const Lunar = getLunarLib();
  if (!Lunar) return "";

  try {
    const solar = Lunar.Solar.fromYmd(year, month, day);
    const lunar = solar.getLunar();
    const lunarMonthCn = lunar.getMonthInChinese();
    const lunarDayCn = lunar.getDayInChinese();
    const monthLabel = normalizeMonthName(lunarMonthCn);
    return `${monthLabel}${lunarDayCn}`;
  } catch {
    return "";
  }
}

/** 计算年、月、日、时四柱（优先使用 lunar-javascript，失败时回退到内部算法） */
export function getFourPillars(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0
): { year: string; month: string; day: string; hour: string } {
  const Lunar = getLunarLib();
  if (Lunar) {
    try {
      const solar = Lunar.Solar.fromYmdHms(year, month, day, hour, minute, second);
      const lunar = solar.getLunar();
      return {
        year: lunar.getYearInGanZhiExact(),
        month: lunar.getMonthInGanZhiExact(),
        day: lunar.getDayInGanZhiExact(),
        hour: lunar.getTimeInGanZhi(),
      };
    } catch (error) {
      // fall back to internal calculation below
    }
  }

  // 回退算法：处理子时换日（23:00-00:59 属于第二天的子时）
  let calcYear = year;
  let calcMonth = month;
  let calcDay = day;
  if (hour >= 23 || hour < 1) {
    const nextDate = new Date(year, month - 1, day);
    nextDate.setDate(nextDate.getDate() + 1);
    calcYear = nextDate.getFullYear();
    calcMonth = nextDate.getMonth() + 1;
    calcDay = nextDate.getDate();
  }

  return {
    year: getGanzhiYear(calcYear, calcMonth, calcDay),
    month: monthToGanzhi(calcYear, calcMonth, calcDay),
    day: dayToGanzhi(calcYear, calcMonth, calcDay),
    hour: hourToGanzhi(calcYear, calcMonth, calcDay, hour),
  };
}

// ===================== 数字/农历显示小工具 =====================

function numberToChinese(num: number): string {
  const digits = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (num >= 1000 && num < 10000) {
    return String(num).split("").map(d => digits[parseInt(d)]).join("");
  }
  if (num === 0) return "〇";
  const units = ["", "十", "百", "千", "万"];
  let result = "";
  let unitIndex = 0;
  let temp = num;
  while (temp > 0) {
    const digit = temp % 10;
    if (digit !== 0 || unitIndex === 0) {
      result = digits[digit] + units[unitIndex] + result;
    }
    temp = Math.floor(temp / 10);
    unitIndex++;
  }
  return result;
}

function normalizeMonthName(month: string): string {
  if (!month) return "";
  if (month.includes("月")) return month;
  const map: Record<string, string> = {
    "正":"正月", "二":"二月", "三":"三月", "四":"四月", "五":"五月", "六":"六月",
    "七":"七月", "八":"八月", "九":"九月", "十":"十月", "冬":"冬月", "腊":"腊月",
  };
  return map[month] || `${month}月`;
}

function getLunarMonthAlias(lunarMonth: string): string {
  const nm = normalizeMonthName(lunarMonth);
  const alias: Record<string, string> = {
    "正月":"正月","二月":"二月","三月":"三月","四月":"四月","五月":"五月","六月":"六月",
    "七月":"七月","八月":"八月","九月":"九月","十月":"十月",
    "十一月":"冬月","冬月":"冬月","腊月":"腊月","十二月":"腊月",
  };
  return alias[nm] || nm;
}

// ===================== 汇总展示 =====================

/**
 * 汇总格式化（优先用精确节气；库缺失时仍可运行但部分为近似）
 */
export function formatDateInfo(year: number, month: number, day: number, hour: number): string {
  const Lunar = getLunarLib();

  // 公历
  const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  const timeStr = `${String(hour).padStart(2,"0")}:00`;

  try {
    if (!Lunar) throw new Error("lunar-javascript not available");

    const solar = Lunar.Solar.fromYmd(year, month, day);
    const lunar = solar.getLunar();

    // 农历
    const lunarYear = lunar.getYear(); // 农历纪年数字（仅用于展示汉字数字）
    const lunarYearChinese = numberToChinese(lunarYear);
    const lunarMonthCn = lunar.getMonthInChinese();
    const lunarDayCn = lunar.getDayInChinese();
    const monthLabel = normalizeMonthName(lunarMonthCn);
    const monthAliasLabel = getLunarMonthAlias(lunarMonthCn);
    const zodiac = lunar.getYearShengXiao();
    const lunarYearGanzhi = lunar.getYearInGanZhi(); // ✅ 用库的年干支（农历纪年视角）

    // 干支（按立春口径）
    const ganzhiYear = getGanzhiYear(year, month, day);
    const ganzhiMonth = monthToGanzhi(year, month, day);
    const ganzhiDay = dayToGanzhi(year, month, day);
    const ganzhiHour = hourToGanzhi(year, month, day, hour);

    const shichen = getShichenName(hour);

    let result = `公历：${dateStr} ${timeStr}\n\n`;
    result += `农历：${lunarYearChinese}年${monthLabel}${lunarDayCn}（${lunarYearGanzhi}年·${zodiac}年，${monthAliasLabel}${lunarDayCn}）\n\n`;
    result += `干支：年 ${ganzhiYear}，月 ${ganzhiMonth}，日 ${ganzhiDay}\n\n`;
    result += `时辰：${shichen.name}（${shichen.timeRange}），干支为 ${ganzhiHour}时。`;
    return result;

  } catch {
    // 无库/失败：仍返回可用信息（年/月柱近似与否见各函数说明）
    const gzYear = getGanzhiYear(year, month, day);
    const gzMonth = monthToGanzhi(year, month, day);
    const gzDay = dayToGanzhi(year, month, day);
    const gzHour = hourToGanzhi(year, month, day, hour);
    const shichen = getShichenName(hour);

    return `公历：${dateStr} ${timeStr}\n\n` +
           `农历：转换不可用\n\n` +
           `干支：年 ${gzYear}，月 ${gzMonth}，日 ${gzDay}\n\n` +
           `时辰：${shichen.name}（${shichen.timeRange}），干支为 ${gzHour}时。`;
  }
}
