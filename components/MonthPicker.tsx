"use client";

import { useState, useEffect, useRef } from "react";
import { getMonthOptions } from "@/lib/ganzhi";

interface MonthPickerProps {
  value: string; // 选中的月份（字符串）
  onChange: (month: string) => void;
  year: string; // 年份（用于计算干支月）
  disabled?: boolean;
  required?: boolean;
}

export default function MonthPicker({
  value,
  onChange,
  year,
  disabled = false,
  required = false,
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // 获取月份的农历信息（必须在所有条件返回之前调用）
  const [monthLunarInfo, setMonthLunarInfo] = useState<{ [key: number]: any }>({});

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

  // 获取月份选项（如果年份存在）
  const monthOptions = year ? getMonthOptions(parseInt(year)) : [];

  // 获取月份对应的干支
  const getMonthGanzhi = (month: number) => {
    return monthOptions.find((m) => m.value === month)?.ganzhi || "";
  };

  useEffect(() => {
    // 批量获取月份的农历信息（使用该月第一天）
    const fetchMonthLunarInfo = async () => {
      if (!year || monthOptions.length === 0) return;
      
      const promises = monthOptions.map(async (month) => {
        try {
          const response = await fetch("/api/nongli", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year: parseInt(year), month: month.value, day: 1 }),
          });
          if (response.ok) {
            const data = await response.json();
            return { month: month.value, lunar: data.lunar };
          }
        } catch (error) {
          console.error(`获取 ${year}年${month.value}月农历信息失败:`, error);
        }
        return null;
      });

      const results = await Promise.all(promises);
      const infoMap: { [key: number]: any } = {};
      results.forEach((result) => {
        if (result) {
          infoMap[result.month] = result.lunar;
        }
      });
      setMonthLunarInfo(infoMap);
    };

    if (isOpen && year) {
      fetchMonthLunarInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, year]);

  // 如果未选择年份，返回禁用状态
  if (!year) {
    return (
      <button
        type="button"
        disabled
        className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] appearance-none bg-[var(--color-elevated)] text-left text-[var(--color-muted)] cursor-not-allowed"
        aria-label="请先选择年份"
      >
        <span>月</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* 输入框 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] appearance-none bg-[var(--color-card-bg)] text-left hover:border-[var(--color-primary)] transition-colors disabled:bg-[var(--color-elevated)] disabled:cursor-not-allowed disabled:hover:border-[var(--color-border)]"
        aria-label="选择月份"
      >
        <span className={value ? "text-[var(--color-text-strong)]" : "text-[var(--color-muted)]"}>
          {value
            ? `${parseInt(value)}月${getMonthGanzhi(parseInt(value)) ? ` (${getMonthGanzhi(parseInt(value))})` : ""}`
            : "月"}
        </span>
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 w-full min-w-[280px] md:min-w-[320px] md:max-w-[400px]">
          {/* 标题栏 */}
          <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] rounded-t-lg">
            <h3 className="text-sm font-medium text-[var(--color-text)] text-center">
              选择月份
            </h3>
          </div>

          {/* 4x3 月份网格 */}
          <div className="grid grid-cols-4 gap-1.5 p-3 bg-[var(--color-card-bg)]">
            {monthOptions.map((month) => {
              const isSelected = value === month.value.toString().padStart(2, "0");
              const lunar = monthLunarInfo[month.value];

              return (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => {
                    onChange(month.value.toString().padStart(2, "0"));
                    setIsOpen(false);
                  }}
                  className={`aspect-square flex flex-col items-center justify-center rounded transition-all ${
                    isSelected
                      ? "bg-[var(--color-primary)] text-white font-bold scale-105 shadow-md"
                      : "hover:bg-[var(--color-hover)] text-[var(--color-text)] hover:scale-105 active:scale-95"
                  }`}
                  aria-label={`选择 ${month.label}`}
                >
                  <div className={`text-xs md:text-sm font-semibold ${isSelected ? "text-white" : "text-[var(--color-text-strong)]"}`}>
                    {month.value}月
                  </div>
                  <div className={`text-[10px] md:text-xs mt-0.5 ${isSelected ? "text-amber-100" : "text-[var(--color-muted)]"}`}>
                    {month.ganzhi}
                  </div>
                  {lunar && (
                    <div className={`text-[9px] mt-0.5 ${isSelected ? "text-amber-200" : "text-[var(--color-link)]"}`}>
                      {lunar.displayWithAlias || lunar.monthAlias}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 底部提示 */}
          <div className="px-4 py-2 bg-[var(--color-surface)] border-t border-[var(--color-border)] text-xs text-[var(--color-muted)] text-center rounded-b-lg">
            点击月份选择 · {year}年
          </div>
        </div>
      )}
    </div>
  );
}

