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

  // 如果未选择年份，直接返回禁用状态
  if (!year) {
    return (
      <button
        type="button"
        disabled
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-gray-100 text-left text-gray-400 cursor-not-allowed"
        aria-label="请先选择年份"
      >
        <span>月</span>
      </button>
    );
  }

  // 获取月份选项
  const monthOptions = getMonthOptions(parseInt(year));

  // 获取月份对应的干支
  const getMonthGanzhi = (month: number) => {
    return monthOptions.find((m) => m.value === month)?.ganzhi || "";
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* 输入框 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-white text-left hover:border-amber-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed disabled:hover:border-gray-300"
        aria-label="选择月份"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value
            ? `${parseInt(value)}月${getMonthGanzhi(parseInt(value)) ? ` (${getMonthGanzhi(parseInt(value))})` : ""}`
            : "月"}
        </span>
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-50 w-full min-w-[280px] md:min-w-[320px] md:max-w-[400px]">
          {/* 标题栏 */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h3 className="text-sm font-medium text-gray-700 text-center">
              选择月份
            </h3>
          </div>

          {/* 4x3 月份网格 */}
          <div className="grid grid-cols-4 gap-1.5 p-3 bg-white">
            {monthOptions.map((month) => {
              const isSelected = value === month.value.toString().padStart(2, "0");

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
                      ? "bg-amber-600 text-white font-bold scale-105 shadow-md"
                      : "hover:bg-amber-50 text-gray-700 hover:scale-105 active:scale-95"
                  }`}
                  aria-label={`选择 ${month.label}`}
                >
                  <div className={`text-xs md:text-sm font-semibold ${isSelected ? "text-white" : "text-gray-900"}`}>
                    {month.value}月
                  </div>
                  <div className={`text-[10px] md:text-xs mt-0.5 ${isSelected ? "text-amber-100" : "text-gray-500"}`}>
                    {month.ganzhi}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 底部提示 */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center rounded-b-lg">
            点击月份选择 · {year}年
          </div>
        </div>
      )}
    </div>
  );
}

