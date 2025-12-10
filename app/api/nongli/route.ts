import { NextRequest, NextResponse } from "next/server";

/**
 * 农历转换 API
 * 将公历日期转换为农历信息
 */
export async function POST(req: NextRequest) {
  try {
    // 检查请求体是否为空
    const text = await req.text();
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "请求体为空" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON 解析错误:", parseError);
      return NextResponse.json(
        { error: "请求体格式错误，无法解析 JSON" },
        { status: 400 }
      );
    }

    const { year, month, day } = body;

    if (!year || !month || !day) {
      return NextResponse.json(
        { error: "缺少必要参数：year, month, day" },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);

    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum)) {
      return NextResponse.json(
        { error: "参数格式错误" },
        { status: 400 }
      );
    }

    // 动态导入 lunar-javascript
    const Lunar = require("lunar-javascript");
    const solar = Lunar.Solar.fromYmd(yearNum, monthNum, dayNum);
    const lunar = solar.getLunar();

    // 获取农历信息
    const lunarYear = lunar.getYear();
    const lunarMonth = lunar.getMonthInChinese();
    const lunarDay = lunar.getDayInChinese();
    const lunarYearGanzhi = getLunarYearGanzhi(lunarYear);
    const zodiac = lunar.getYearShengXiao();
    
    // 注意：lunar-javascript 库没有 isLeapMonth() 方法
    // 将简化的月份名称转换为完整格式（如"冬" -> "冬月"）
    const actualMonth = normalizeMonthName(lunarMonth);
    
    // 获取月份别名
    const monthAlias = getLunarMonthAlias(lunarMonth);
    const monthLabel = actualMonth;
    const monthAliasLabel = monthAlias;

    // 数字转中文数字
    const lunarYearChinese = numberToChinese(lunarYear);

    return NextResponse.json({
      lunar: {
        year: lunarYear,
        yearChinese: lunarYearChinese,
        month: actualMonth,
        monthAlias: monthAlias,
        day: lunarDay,
        yearGanzhi: lunarYearGanzhi,
        zodiac: zodiac,
        isLeapMonth: false, // lunar-javascript 库不支持判断闰月
        display: `${lunarYearChinese}年${monthLabel}${lunarDay}`,
        displayWithAlias: `${monthAliasLabel}${lunarDay}`,
      },
    });
  } catch (error) {
    console.error("农历转换错误:", error);
    return NextResponse.json(
      { error: "农历转换失败" },
      { status: 500 }
    );
  }
}

/**
 * 将公历年份转换为干支年（用于农历年份）
 */
function getLunarYearGanzhi(year: number): string {
  const TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  
  // 基准年：公元 4 年为甲子年
  const offset = year - 4;
  const tianganIndex = offset % 10;
  const dizhiIndex = offset % 12;
  
  const gan = tianganIndex < 0 ? TIANGAN[10 + tianganIndex] : TIANGAN[tianganIndex];
  const zhi = dizhiIndex < 0 ? DIZHI[12 + dizhiIndex] : DIZHI[dizhiIndex];
  
  return gan + zhi;
}

/**
 * 将简化的月份名称转换为完整格式（如"冬" -> "冬月"）
 */
function normalizeMonthName(month: string): string {
  if (!month) return "";
  if (month.includes('月')) return month;
  
  // 简化的月份名称映射
  const monthMap: { [key: string]: string } = {
    "正": "正月",
    "二": "二月",
    "三": "三月",
    "四": "四月",
    "五": "五月",
    "六": "六月",
    "七": "七月",
    "八": "八月",
    "九": "九月",
    "十": "十月",
    "冬": "冬月",
    "腊": "腊月",
  };
  
  return monthMap[month] || month + "月";
}

/**
 * 获取农历月份别名
 * 注意：lunar-javascript 库返回的月份名称是简化的（如"冬"、"腊"），
 * normalizeMonthName 已经将它们转换为标准格式（如"冬月"、"腊月"）。
 * 这里返回标准化后的月份名称，因为"冬月"和"腊月"本身已经是别名形式。
 * 
 * 如果库在某些情况下返回完整的月份名称（如"十一月"、"十二月"），
 * 则会将它们映射为别名（"冬月"、"腊月"）。
 */
function getLunarMonthAlias(lunarMonth: string): string {
  // 先标准化月份名称
  const normalizedMonth = normalizeMonthName(lunarMonth);
  
  const aliasMap: { [key: string]: string } = {
    "正月": "正月",
    "二月": "二月",
    "三月": "三月",
    "四月": "四月",
    "五月": "五月",
    "六月": "六月",
    "七月": "七月",
    "八月": "八月",
    "九月": "九月",
    "十月": "十月",
    // 如果库返回完整月份名称，映射为别名
    "十一月": "冬月",
    "冬月": "冬月",  // 已经是别名形式
    "腊月": "腊月",  // 已经是别名形式
    "十二月": "腊月",
  };
  
  return aliasMap[normalizedMonth] || normalizedMonth;
}

/**
 * 数字转中文数字（支持年份）
 */
function numberToChinese(num: number): string {
  const digits = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  
  // 处理年份特殊情况，如 2023 -> 二〇二三
  if (num >= 1000 && num < 10000) {
    const numStr = num.toString();
    return numStr.split('').map(d => digits[parseInt(d)]).join('');
  }
  
  return "〇";
}

