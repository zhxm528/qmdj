"use client";

import { useState, useEffect, useRef } from "react";
import { hourToGanzhi } from "@/lib/ganzhi";

interface HourSelectorProps {
  value: string; // HH 格式
  onChange: (hour: string) => void;
  year: string;
  month: string;
  day: string;
  required?: boolean;
}

export default function HourSelector({
  value,
  onChange,
  year,
  month,
  day,
  required = false,
}: HourSelectorProps) {
  const [hour, setHour] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 从 value 初始化
  useEffect(() => {
    if (value) {
      setHour(value);
    }
  }, [value]);

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  // 当小时改变时，更新父组件
  useEffect(() => {
    if (hour) {
      onChange(hour);
    }
  }, [hour, onChange]);

  // 获取当前选中时的干支
  const getHourGanzhi = () => {
    if (!year || !month || !day || !hour) return "";
    return hourToGanzhi(parseInt(year), parseInt(month), parseInt(day), parseInt(hour));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={!year || !month || !day}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed text-left flex items-center justify-between"
      >
        <span className={!hour ? "text-gray-500" : ""}>
          {hour !== "" ? `${parseInt(hour)}时 ${getHourGanzhi() ? `(${getHourGanzhi()})` : ""}` : "时"}
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
      
      {isDropdownOpen && year && month && day && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-h-96 overflow-y-auto" style={{ minWidth: '600px' }}>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 24 }, (_, i) => i).map((h) => {
              const hourValue = h.toString().padStart(2, '0');
              const ganzhi = hourToGanzhi(parseInt(year), parseInt(month), parseInt(day), h);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setHour(hourValue);
                    setIsDropdownOpen(false);
                  }}
                  className={`text-center py-2 px-2 rounded transition-colors whitespace-nowrap ${
                    hour === hourValue
                      ? "bg-amber-500 text-white"
                      : "hover:bg-amber-50"
                  }`}
                  title={`${h}时 ${ganzhi}`}
                >
                  <div className={`text-sm font-medium ${hour === hourValue ? 'text-white' : ''} whitespace-nowrap`}>{h}时</div>
                  <div className={`text-xs ${hour === hourValue ? 'text-amber-200' : 'text-amber-600'} whitespace-nowrap`}>{ganzhi}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

