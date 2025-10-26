"use client";

import { useState, useEffect } from "react";
import YearPicker from "./YearPicker";
import MonthPicker from "./MonthPicker";

interface DateSelectorProps {
  value: string; // YYYY-MM-DD 格式
  onChange: (date: string) => void;
  required?: boolean;
}

export default function DateSelector({
  value,
  onChange,
  required = false,
}: DateSelectorProps) {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");

  // 从 value 初始化
  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(parts[1]);
        setDay(parts[2]);
      }
    }
  }, [value]);

  // 当年月日改变时，更新父组件
  useEffect(() => {
    if (year && month) {
      // 检查当前日期是否有效（用于处理月份切换导致的日期超出）
      const daysInMonth = getDaysInMonth(parseInt(year), parseInt(month));
      const currentDay = day ? parseInt(day) : 1;
      
      if (currentDay > daysInMonth) {
        // 如果日期超出，自动调整为该月最后一天
        setDay(daysInMonth.toString().padStart(2, "0"));
      }
    }
  }, [year, month, day]);

  useEffect(() => {
    if (year && month && day) {
      const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      onChange(formattedDate);
    }
  }, [year, month, day, onChange]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        日期 <span className="text-red-500">{required && "*"}</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {/* 年份选择 */}
        <YearPicker value={year} onChange={setYear} required={required} />

        {/* 月份选择 */}
        <MonthPicker
          value={month}
          onChange={setMonth}
          year={year}
          required={required}
        />

        {/* 日期选择 */}
        <div className="relative">
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            disabled={!year || !month}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            required={required}
          >
            <option value="">日</option>
            {year && month && Array.from(
              { length: getDaysInMonth(parseInt(year), parseInt(month)) },
              (_, i) => i + 1
            ).map((d) => (
              <option key={d} value={d.toString().padStart(2, "0")}>
                {d}日
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 获取指定年月的天数
 */
function getDaysInMonth(year: number, month: number): number {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

