"use client";

import { useEffect, useState } from "react";

interface CalendarProps {
  year: number;
  month: number;
  day: number;
}

interface DayData {
  solarDay: number; // 公历日期
  lunarDay: string; // 农历日期
  lunarMonth?: string; // 农历月份名称（月初显示）
  shijie?: string; // 节气
  festival?: string; // 节日
  isWeekend: boolean; // 是否周末
  isHoliday: boolean; // 是否假期
  isSelected: boolean; // 是否选中
  weekDay: number; // 星期几 (0-6, 0=周日)
}

// 中国传统节日（农历）
const LUNAR_FESTIVALS: Record<string, string> = {
  "正月初一": "春节",
  "正月十五": "元宵节",
  "二月初二": "龙抬头",
  "五月初五": "端午节",
  "七月初七": "七夕节",
  "七月十五": "中元节",
  "八月十五": "中秋节",
  "九月初九": "重阳节",
  "十月初一": "寒衣节",
  "腊月初八": "腊八节",
  "腊月二十三": "小年",
  "腊月三十": "除夕",
};

// 公历节日
const SOLAR_FESTIVALS: Record<string, string> = {
  "1-1": "元旦",
  "2-14": "情人节",
  "3-8": "妇女节",
  "4-5": "清明节",
  "5-1": "劳动节",
  "5-4": "青年节",
  "6-1": "儿童节",
  "7-1": "建党节",
  "8-1": "建军节",
  "9-10": "教师节",
  "10-1": "国庆节",
  "12-25": "圣诞节",
};

// 法定节假日（公历）
const LEGAL_HOLIDAYS: Record<string, boolean> = {
  "1-1": true, // 元旦
  "5-1": true, // 劳动节
  "10-1": true, // 国庆节
  "10-2": true,
  "10-3": true,
  "10-4": true,
  "10-5": true,
  "10-6": true,
  "10-7": true,
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

// 24节气列表
const JIEQI_LIST = [
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

function getJieqi(month: number, day: number): string | null {
  const jieqi = JIEQI_LIST.find((j) => j.month === month && j.day === day);
  return jieqi ? jieqi.name : null;
}

export default function Calendar({ year, month, day }: CalendarProps) {
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [monthTitle, setMonthTitle] = useState("");

  useEffect(() => {
    const fetchMonthData = async () => {
      if (!year || !month) return;

      setLoading(true);
      setMonthTitle(`${year}年${month}月`);

      try {
        // 获取该月的天数
        const daysInMonth = new Date(year, month, 0).getDate();
        const firstDay = new Date(year, month - 1, 1);
        const firstDayWeek = firstDay.getDay(); // 0=周日, 1=周一, ...
        // 转换为周一为0的格式
        const firstDayWeekAdjusted = firstDayWeek === 0 ? 6 : firstDayWeek - 1;

        const days: DayData[] = [];

        // 填充前面的空白（上个月的日期）
        for (let i = 0; i < firstDayWeekAdjusted; i++) {
          days.push({
            solarDay: 0,
            lunarDay: "",
            isWeekend: false,
            isHoliday: false,
            isSelected: false,
            weekDay: i,
          });
        }

        // 获取该月所有日期的数据
        const promises = [];
        for (let d = 1; d <= daysInMonth; d++) {
          promises.push(
            (async () => {
              try {
                // 获取农历信息
                const lunarResp = await fetch("/api/nongli", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ year, month, day: d }),
                });
                const lunarData = await lunarResp.json();

                const date = new Date(year, month - 1, d);
                const weekDay = date.getDay();
                const weekDayAdjusted = weekDay === 0 ? 6 : weekDay - 1;
                const isWeekend = weekDay === 0 || weekDay === 6;
                const holidayKey = `${month}-${d}`;
                const isHoliday = LEGAL_HOLIDAYS[holidayKey] || false;

                // 获取农历日期
                const lunarMonth = lunarData.lunar?.month || "";
                const lunarDay = lunarData.lunar?.day || "";
                const lunarDateStr = `${lunarMonth}${lunarDay}`;

                // 查找节日
                let festival = LUNAR_FESTIVALS[lunarDateStr] || "";
                if (!festival) {
                  festival = SOLAR_FESTIVALS[holidayKey] || "";
                }

                // 查找节气
                const shijie = getJieqi(month, d);

                // 判断是否是农历月初（显示月份名称）
                let lunarMonthName: string | undefined;
                if (lunarDay === "初一" || lunarDay === "朔") {
                  lunarMonthName = lunarMonth;
                }

                return {
                  solarDay: d,
                  lunarDay: lunarDay,
                  lunarMonth: lunarMonthName,
                  shijie: shijie || undefined,
                  festival: festival || undefined,
                  isWeekend,
                  isHoliday,
                  isSelected: d === day,
                  weekDay: weekDayAdjusted,
                };
              } catch (error) {
                console.error(`获取日期 ${d} 信息失败:`, error);
                const date = new Date(year, month - 1, d);
                const weekDay = date.getDay();
                const weekDayAdjusted = weekDay === 0 ? 6 : weekDay - 1;
                return {
                  solarDay: d,
                  lunarDay: "",
                  isWeekend: weekDay === 0 || weekDay === 6,
                  isHoliday: false,
                  isSelected: d === day,
                  weekDay: weekDayAdjusted,
                };
              }
            })()
          );
        }

        const results = await Promise.all(promises);
        days.push(...results);

        // 填充后面的空白（下个月的日期，使网格完整）
        const totalCells = Math.ceil(days.length / 7) * 7;
        while (days.length < totalCells) {
          days.push({
            solarDay: 0,
            lunarDay: "",
            isWeekend: false,
            isHoliday: false,
            isSelected: false,
            weekDay: days.length % 7,
          });
        }

        setDaysData(days);
      } catch (error) {
        console.error("获取万年历信息失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthData();
  }, [year, month, day]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">万年历</h2>
        <div className="text-center text-gray-500 py-4">加载中...</div>
      </div>
    );
  }

  const renderDayCell = (dayData: DayData, index: number) => {
    if (dayData.solarDay === 0) {
      return (
        <div key={index} className="border border-gray-200 p-2 min-h-[80px] bg-gray-50"></div>
      );
    }

    // 确定底部显示的内容（优先级：节日 > 节气 > 农历月份 > 农历日期）
    let bottomContent = "";
    let bottomColor = "text-gray-500"; // 默认灰色（农历日期）

    if (dayData.festival) {
      bottomContent = dayData.festival;
      bottomColor = "text-red-600"; // 红色（节日）
    } else if (dayData.shijie) {
      bottomContent = dayData.shijie;
      bottomColor = "text-green-600"; // 绿色（节气）
    } else if (dayData.lunarMonth) {
      bottomContent = dayData.lunarMonth;
      bottomColor = "text-green-600"; // 绿色（农历月份）
    } else {
      bottomContent = dayData.lunarDay;
      bottomColor = "text-gray-500"; // 灰色（农历日期）
    }

    return (
      <div
        key={index}
        className={`border-2 p-2 min-h-[80px] flex flex-col relative ${
          dayData.isSelected
            ? "bg-yellow-100 border-yellow-400"
            : "border-gray-200 bg-white"
        }`}
      >
        {/* 左上角：特殊标识 */}
        <div className="absolute top-1 left-1 text-xs">
          {dayData.isHoliday && <span className="text-red-600">休</span>}
          {!dayData.isHoliday && dayData.isWeekend && (
            <span className="text-red-600">末</span>
          )}
        </div>

        {/* 右上角：公历日期 */}
        <div className="absolute top-1 right-1">
          <span
            className={`text-sm font-semibold ${
              dayData.isWeekend ? "text-red-600" : "text-blue-600"
            }`}
          >
            {String(dayData.solarDay).padStart(2, "0")}
          </span>
        </div>

        {/* 底部中央：农历日期/节气/节日 */}
        <div className="mt-auto text-center">
          <span className={`text-xs ${bottomColor}`}>{bottomContent}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
        {monthTitle || "万年历"}
      </h2>
      <div className="w-full">
        {/* 星期标题行 */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className="text-center text-sm font-semibold text-gray-700 py-2"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-0">
          {daysData.map((dayData, index) => renderDayCell(dayData, index))}
        </div>
      </div>
    </div>
  );
}
