"use client";

import { useState, useEffect, useRef } from "react";
import { getYearOptions } from "@/lib/ganzhi";

interface YearPickerProps {
  value: string; // 选中的年份（字符串）
  onChange: (year: string) => void;
  required?: boolean;
}

export default function YearPicker({ value, onChange, required = false }: YearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(value ? parseInt(value) : new Date().getFullYear());
  const [startYear, setStartYear] = useState(1950); // 起始显示年份
  const panelRef = useRef<HTMLDivElement>(null);

  // 当年份变化时，调整起始年份以保持选中年份在视图中
  useEffect(() => {
    if (value) {
      const year = parseInt(value);
      setCurrentYear(year);
      // 计算起始年份，使得选中年份在4x4网格的中心或可见位置
      const yearsPerPage = 16;
      const start = Math.floor((year - 1950) / yearsPerPage) * yearsPerPage + 1950;
      setStartYear(start);
    }
  }, [value]);

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // 生成4x4年份网格数据
  const generateYearGrid = () => {
    const years = [];
    for (let i = 0; i < 16; i++) {
      const year = startYear + i;
      if (year >= 1950 && year <= 3950) {
        years.push(year);
      }
    }
    return years;
  };

  const years = generateYearGrid();

  // 翻页函数
  const handlePrevPage = () => {
    if (startYear >= 1950 + 16) {
      setStartYear(startYear - 16);
    }
  };

  const handleNextPage = () => {
    if (startYear < 3950 - 16) {
      setStartYear(startYear + 16);
    }
  };

  // 选择年份
  const handleSelectYear = (year: number) => {
    onChange(year.toString());
    setIsOpen(false);
  };

  // 获取年份对应的干支
  const getYearGanzhi = (year: number) => {
    const options = getYearOptions(year, year);
    return options[0]?.ganzhi || "";
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* 输入框 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-white text-left hover:border-amber-500 transition-colors"
        aria-label="选择年份"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value ? `${value}年${value ? ` (${getYearGanzhi(parseInt(value))})` : ""}` : "年"}
        </span>
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-50 w-full min-w-[280px] md:min-w-[320px] md:max-w-[400px]">
          {/* 翻页控制 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={startYear <= 1950}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              上一页
            </button>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {startYear} - {Math.min(startYear + 15, 3950)}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={startYear >= 3950 - 16}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              下一页
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 4x4 年份网格 */}
          <div className="grid grid-cols-4 gap-1.5 p-3 bg-white">
            {years.map((year) => {
              const ganzhi = getYearGanzhi(year);
              const isSelected = value === year.toString();

              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleSelectYear(year)}
                  className={`aspect-square flex flex-col items-center justify-center rounded transition-all ${
                    isSelected
                      ? "bg-amber-600 text-white font-bold scale-105 shadow-md"
                      : "hover:bg-amber-50 text-gray-700 hover:scale-105 active:scale-95"
                  }`}
                  aria-label={`选择 ${year}年 (${ganzhi})`}
                >
                  <div className={`text-xs md:text-sm font-semibold ${isSelected ? "text-white" : "text-gray-900"}`}>
                    {year}
                  </div>
                  <div className={`text-[10px] md:text-xs mt-0.5 ${isSelected ? "text-amber-100" : "text-gray-500"}`}>
                    {ganzhi}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 选择提示 */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center rounded-b-lg">
            点击年份选择 · 范围 1950-3950 年
          </div>
        </div>
      )}
    </div>
  );
}

