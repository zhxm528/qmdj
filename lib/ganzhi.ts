/**
 * 干支年转换工具
 * 根据 yearto.md 规则实现
 */

// 天干表
const TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

// 地支表
const DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 月支表（建寅：寅月为第1月）
const MONTH_DIZHI = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];

/**
 * 将公历年份转换为干支年
 * @param year 公历年份
 * @returns 干支年字符串，如"甲子"
 */
export function yearToGanzhi(year: number): string {
  // 基准年：公元 4 年为甲子年
  const offset = year - 4;
  
  // 计算天干和地支序号
  const tianganIndex = offset % 10;
  const dizhiIndex = offset % 12;
  
  // 处理负数
  const gan = tianganIndex < 0 ? TIANGAN[10 + tianganIndex] : TIANGAN[tianganIndex];
  const zhi = dizhiIndex < 0 ? DIZHI[12 + dizhiIndex] : DIZHI[dizhiIndex];
  
  return gan + zhi;
}

/**
 * 判断日期是否在立春之后（需要转换干支年）
 * @param month 月份（1-12）
 * @param day 日期（1-31）
 * @returns true 如果在立春之后，false 如果在立春之前
 */
export function isAfterLiChun(month: number, day: number): boolean {
  // 立春通常发生在 2 月 3-5 日
  // 简化处理：2 月 4 日及之后视为立春后
  if (month > 2) return true;
  if (month < 2) return false;
  return day >= 4;
}

/**
 * 获取指定日期对应的干支年
 * @param year 公历年份
 * @param month 月份
 * @param day 日期
 * @returns 干支年字符串
 */
export function getGanzhiYear(year: number, month: number, day: number): string {
  // 检查是否在立春之后
  const afterLiChun = isAfterLiChun(month, day);
  
  // 如果在立春前，使用上一年的干支
  // 如果在立春后，使用当前年的干支
  const ganzhiYear = afterLiChun ? year : year - 1;
  
  return yearToGanzhi(ganzhiYear);
}

/**
 * 获取年份选项（包含阳历年和干支年）
 * @param startYear 起始年份
 * @param endYear 结束年份
 * @returns 年份选项数组
 */
export function getYearOptions(startYear: number = 1950, endYear: number = 2050) {
  const years: Array<{ value: number; label: string; ganzhi: string }> = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const ganzhi = yearToGanzhi(year);
    years.push({
      value: year,
      label: `${year}年 (${ganzhi})`,
      ganzhi,
    });
  }
  
  return years;
}

/**
 * 五虎遁月法：根据年干确定寅月起干
 * @param yearGan 年天干（0-9）
 * @returns 寅月的天干序号
 */
function getYinYueTianGan(yearGan: number): number {
  const lookup: { [key: number]: number } = {
    0: 0, // 甲年 → 寅月天干 = 甲(0)
    5: 0, // 己年 → 寅月天干 = 甲(0)
    1: 2, // 乙年 → 寅月天干 = 丙(2)
    6: 2, // 庚年 → 寅月天干 = 丙(2)
    2: 4, // 丙年 → 寅月天干 = 戊(4)
    7: 4, // 辛年 → 寅月天干 = 戊(4)
    3: 6, // 丁年 → 寅月天干 = 庚(6)
    8: 6, // 壬年 → 寅月天干 = 庚(6)
    4: 8, // 戊年 → 寅月天干 = 壬(8)
    9: 8, // 癸年 → 寅月天干 = 壬(8)
  };
  return lookup[yearGan] || 0;
}

/**
 * 获取年干序号
 * @param year 公历年份
 * @returns 年干序号（0-9）
 */
function getYearGan(year: number): number {
  const offset = year - 4;
  return offset % 10 < 0 ? 10 + (offset % 10) : offset % 10;
}

/**
 * 将阳历月份转换为干支月
 * 注：简化版本，按整月分配，未考虑具体节气时刻
 * @param year 公历年份
 * @param month 阳历月份（1-12）
 * @returns 干支月字符串，如"甲寅"
 */
export function monthToGanzhi(year: number, month: number): string {
  // 获取年干序号
  const yearGan = getYearGan(year);
  
  // 确定寅月起干
  const yinYueGan = getYinYueTianGan(yearGan);
  
  // 计算月干（从寅月(0)开始，月序从0开始）
  // 阳历1月对应寅月(0), 2月对应卯月(1)...
  // 需要转换为干支月的月序（建寅：2月=1月序）
  let monthOrder = 0;
  if (month >= 2) {
    // 阳历2月及之后（从寅月开始）
    monthOrder = month - 2; // 2月→0, 3月→1, ..., 12月→10, 1月→11
  } else {
    // 阳历1月（丑月，月序11）
    monthOrder = 11;
  }
  
  // 计算月干：从寅月起干向前推进 monthOrder 位
  const monthGanIndex = (yinYueGan + monthOrder) % 10;
  
  // 计算月支
  const monthZhi = MONTH_DIZHI[monthOrder];
  
  // 组合干支月
  return TIANGAN[monthGanIndex] + monthZhi;
}

/**
 * 获取月份选项（包含阳历月和干支月）
 * @param year 公历年份
 * @returns 月份选项数组
 */
export function getMonthOptions(year: number) {
  const months: Array<{ value: number; label: string; ganzhi: string }> = [];
  
  for (let month = 1; month <= 12; month++) {
    const ganzhi = monthToGanzhi(year, month);
    months.push({
      value: month,
      label: `${month}月 (${ganzhi})`,
      ganzhi,
    });
  }
  
  return months;
}

