"use client";

import { useState, useEffect, useRef } from "react";
import YearPicker from "./YearPicker";
import MonthPicker from "./MonthPicker";
import { dayToGanzhi, dateToLunar } from "@/lib/ganzhi";

interface DateSelectorProps {
  value: string; // YYYY-MM-DD 格式
  onChange: (date: string) => void;
  required?: boolean;
  inline?: boolean; // 是否内联模式，用于与其他组件等宽布局
}

export default function DateSelector({
  value,
  onChange,
  required = false,
}: DateSelectorProps) {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const dayDropdownRef = useRef<HTMLDivElement>(null);

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
    if (!year || !month || !day) return;

    const daysInMonth = getDaysInMonth(parseInt(year, 10), parseInt(month, 10));
    const currentDay = parseInt(day, 10);

    if (Number.isNaN(currentDay)) {
      return;
    }

    if (currentDay > daysInMonth) {
      const adjusted = daysInMonth.toString().padStart(2, "0");
      if (adjusted !== day) {
        setDay(adjusted);
      }
      return;
    }

    const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    if (formattedDate !== value) {
      onChange(formattedDate);
    }
  }, [year, month, day, value, onChange]);

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dayDropdownRef.current && !dayDropdownRef.current.contains(event.target as Node)) {
        setIsDayDropdownOpen(false);
      }
    }

    if (isDayDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDayDropdownOpen]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        日期 <span className="text-red-500">{required && "*"}</span>
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
        <div className="relative" ref={dayDropdownRef}>
          <button
            type="button"
            onClick={() => setIsDayDropdownOpen(!isDayDropdownOpen)}
            disabled={!year || !month}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed text-left flex items-center justify-between"
          >
            <span className={!day ? "text-gray-500" : ""}>
              {day ? `${day}日` : "日"}
            </span>
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          
          {isDayDropdownOpen && year && month && (
            <div
              className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-h-96 overflow-y-auto"
              style={{ minWidth: "0", maxWidth: "90vw", width: "100%" }}
            >
              <div className="grid grid-cols-4 gap-2">
                {Array.from(
                  { length: getDaysInMonth(parseInt(year), parseInt(month)) },
                  (_, i) => i + 1
                ).map((d) => {
                  const dayValue = d.toString().padStart(2, "0");
                  const ganzhi = year && month ? dayToGanzhi(parseInt(year), parseInt(month), d) : "";
                  const lunar = year && month ? dateToLunar(parseInt(year), parseInt(month), d) : "";
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDay(dayValue);
                        setIsDayDropdownOpen(false);
                      }}
                      className={`text-center py-2 px-2 rounded transition-colors whitespace-nowrap ${
                        day === dayValue
                          ? "bg-amber-500 text-white"
                          : "hover:bg-amber-50"
                      }`}
                      title={`${d}日 (${lunar} ${ganzhi})`}
                    >
                      <div className={`text-sm font-medium ${day === dayValue ? 'text-white' : ''} whitespace-nowrap`}>{d}</div>
                      <div className={`text-xs ${day === dayValue ? 'text-amber-100' : 'text-gray-600'} whitespace-nowrap`}>{lunar}</div>
                      <div className={`text-xs ${day === dayValue ? 'text-amber-200' : 'text-amber-600'} whitespace-nowrap`}>{ganzhi}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
