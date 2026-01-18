"use client";

import { useState, useEffect, useRef } from "react";
import { getYearOptions } from "@/lib/ganzhi";

interface YearPickerProps {
  value: string; // 选中的年份（字符串）
  onChange: (year: string) => void;
  required?: boolean;
}

const YEARS_PER_PAGE = 16; // 每页显示的年份数量

export default function YearPicker({ value, onChange, required = false }: YearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentYearValue = value ? parseInt(value) : new Date().getFullYear();
  const [currentYear, setCurrentYear] = useState(currentYearValue);
  // 计算初始起始年份，使得当前年份在视图中可见
  const initialStartYear = Math.floor((currentYearValue - 1950) / YEARS_PER_PAGE) * YEARS_PER_PAGE + 1950;
  const [startYear, setStartYear] = useState(initialStartYear); // 起始显示年份
  const panelRef = useRef<HTMLDivElement>(null);

  // 当年份变化时，调整起始年份以保持选中年份在视图中
  useEffect(() => {
    if (value) {
      const year = parseInt(value);
      setCurrentYear(year);
      // 计算起始年份，使得选中年份在4x4网格的中心或可见位置
      const start = Math.floor((year - 1950) / YEARS_PER_PAGE) * YEARS_PER_PAGE + 1950;
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
    for (let i = 0; i < YEARS_PER_PAGE; i++) {
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
    if (startYear >= 1950 + YEARS_PER_PAGE) {
      setStartYear(startYear - YEARS_PER_PAGE);
    }
  };

  const handleNextPage = () => {
    if (startYear < 3950 - YEARS_PER_PAGE) {
      setStartYear(startYear + YEARS_PER_PAGE);
    }
  };

  // 选择年份
  const handleSelectYear = (year: number) => {
    onChange(year.toString());
    setIsOpen(false);
  };

  // 获取年份对应的干支和农历信息
  const [yearLunarInfo, setYearLunarInfo] = useState<{ [key: number]: any }>({});
  
  useEffect(() => {
    // 批量获取年份的农历信息（使用默认日期1月1日）
    const fetchYearLunarInfo = async () => {
      const yearsToFetch = [];
      for (let i = 0; i < YEARS_PER_PAGE; i++) {
        const year = startYear + i;
        if (year >= 1950 && year <= 3950) {
          yearsToFetch.push(year);
        }
      }
      
      const promises = yearsToFetch.map(async (year) => {
        try {
          const response = await fetch("/api/nongli", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year, month: 1, day: 1 }),
          });
          if (response.ok) {
            const data = await response.json();
            return { year, lunar: data.lunar };
          }
        } catch (error) {
          console.error(`获取 ${year} 年农历信息失败:`, error);
        }
        return null;
      });
      
      const results = await Promise.all(promises);
      const infoMap: { [key: number]: any } = {};
      results.forEach((result) => {
        if (result) {
          infoMap[result.year] = result.lunar;
        }
      });
      setYearLunarInfo(infoMap);
    };

    if (isOpen) {
      fetchYearLunarInfo();
    }
  }, [isOpen, startYear]);

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
        className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] appearance-none bg-[var(--color-card-bg)] text-left hover:border-[var(--color-primary)] transition-colors"
        aria-label="选择年份"
      >
        <span className={value ? "text-[var(--color-text-strong)]" : "text-[var(--color-muted)]"}>
          {value ? `${value}年${value ? ` (${getYearGanzhi(parseInt(value))})` : ""}` : "年"}
        </span>
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 w-full min-w-[280px] md:min-w-[320px] md:max-w-[400px]">
          {/* 翻页控制 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] rounded-t-lg">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={startYear <= 1950}
              className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-hover)] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              上一页
            </button>
            <span className="text-sm font-medium text-[var(--color-text)] hidden sm:block">
              {startYear} - {Math.min(startYear + YEARS_PER_PAGE - 1, 3950)}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={startYear >= 3950 - YEARS_PER_PAGE}
              className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-hover)] rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              下一页
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 4x4 年份网格 */}
          <div className="grid grid-cols-4 gap-1.5 p-3 bg-[var(--color-card-bg)]">
            {years.map((year) => {
              const ganzhi = getYearGanzhi(year);
              const isSelected = value === year.toString();
              const lunar = yearLunarInfo[year];

              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleSelectYear(year)}
                  className={`aspect-square flex flex-col items-center justify-center rounded transition-all ${
                    isSelected
                      ? "bg-[var(--color-primary)] text-white font-bold scale-105 shadow-md"
                      : "hover:bg-[var(--color-hover)] text-[var(--color-text)] hover:scale-105 active:scale-95"
                  }`}
                  aria-label={`选择 ${year}年 (${ganzhi})`}
                >
                  <div className={`text-xs md:text-sm font-semibold ${isSelected ? "text-white" : "text-[var(--color-text-strong)]"}`}>
                    {year}
                  </div>
                  <div className={`text-[10px] md:text-xs mt-0.5 ${isSelected ? "text-amber-100" : "text-[var(--color-muted)]"}`}>
                    {ganzhi}
                  </div>
                  {lunar && (
                    <div className={`text-[9px] mt-0.5 ${isSelected ? "text-amber-200" : "text-[var(--color-link)]"}`}>
                      {lunar.yearChinese}年
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 选择提示 */}
          <div className="px-4 py-2 bg-[var(--color-surface)] border-t border-[var(--color-border)] text-xs text-[var(--color-muted)] text-center rounded-b-lg">
            点击年份选择 · 范围 1950-3950 年
          </div>
        </div>
      )}
    </div>
  );
}

