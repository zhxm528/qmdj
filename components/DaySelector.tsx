"use client";

import { useState, useEffect, useRef } from "react";
import { dayToGanzhi } from "@/lib/ganzhi";

interface DaySelectorProps {
  value: string; // 日期（01-31）
  onChange: (day: string) => void;
  year: string;
  month: string;
  required?: boolean;
}

export default function DaySelector({ value, onChange, year, month, required = false }: DaySelectorProps) {
  const [day, setDay] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setDay(value);
    }
  }, [value]);

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

  useEffect(() => {
    if (day) {
      onChange(day);
    }
  }, [day, onChange]);

  const getDaysInMonth = (year: number, month: number): number => {
    if (!year || !month) return 31;
    return new Date(year, month, 0).getDate();
  };

  // 获取当前选中日的干支
  const getDayGanzhi = () => {
    if (!year || !month || !day) return "";
    return dayToGanzhi(parseInt(year), parseInt(month), parseInt(day));
  };

  // 获取日期的农历信息
  const [dayLunarInfo, setDayLunarInfo] = useState<{ [key: number]: any }>({});

  useEffect(() => {
    // 批量获取日期的农历信息
    const fetchDayLunarInfo = async () => {
      if (!year || !month) return;
      
      const daysInMonth = getDaysInMonth(parseInt(year), parseInt(month));
      const promises = Array.from({ length: daysInMonth }, (_, i) => i + 1).map(async (d) => {
        try {
          const response = await fetch("/api/nongli", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year: parseInt(year), month: parseInt(month), day: d }),
          });
          if (response.ok) {
            const data = await response.json();
            return { day: d, lunar: data.lunar };
          }
        } catch (error) {
          console.error(`获取 ${year}年${month}月${d}日农历信息失败:`, error);
        }
        return null;
      });

      const results = await Promise.all(promises);
      const infoMap: { [key: number]: any } = {};
      results.forEach((result) => {
        if (result) {
          infoMap[result.day] = result.lunar;
        }
      });
      setDayLunarInfo(infoMap);
    };

    if (isDropdownOpen && year && month) {
      fetchDayLunarInfo();
    }
  }, [isDropdownOpen, year, month]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={!year || !month}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed text-left flex items-center justify-between"
      >
        <span className={!day ? "text-gray-500" : ""}>
          {day ? `${parseInt(day)}日 ${getDayGanzhi() ? `(${getDayGanzhi()})` : ""}` : "日"}
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
      
      {isDropdownOpen && year && month && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-h-96 overflow-y-auto" style={{ minWidth: '600px' }}>
          <div className="grid grid-cols-7 gap-2">
            {Array.from(
              { length: getDaysInMonth(parseInt(year), parseInt(month)) },
              (_, i) => i + 1
            ).map((d) => {
              const dayValue = d.toString().padStart(2, "0");
              const ganzhi = dayToGanzhi(parseInt(year), parseInt(month), d);
              const lunar = dayLunarInfo[d];
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDay(dayValue);
                    setIsDropdownOpen(false);
                  }}
                  className={`text-center py-2 px-2 rounded transition-colors whitespace-nowrap ${
                    day === dayValue
                      ? "bg-amber-500 text-white"
                      : "hover:bg-amber-50"
                  }`}
                  title={lunar ? `${d}日 (${lunar.display} ${ganzhi})` : `${d}日 (${ganzhi})`}
                >
                  <div className={`text-sm font-medium ${day === dayValue ? 'text-white' : ''} whitespace-nowrap`}>{d}</div>
                  {lunar ? (
                    <>
                      <div className={`text-xs ${day === dayValue ? 'text-amber-100' : 'text-gray-600'} whitespace-nowrap`}>
                        {lunar.displayWithAlias || lunar.monthAlias + lunar.day}
                      </div>
                      <div className={`text-xs ${day === dayValue ? 'text-amber-200' : 'text-amber-600'} whitespace-nowrap`}>{ganzhi}</div>
                    </>
                  ) : (
                    <div className={`text-xs ${day === dayValue ? 'text-amber-200' : 'text-amber-600'} whitespace-nowrap`}>{ganzhi}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

