"use client";

import { useState, useEffect, useRef } from "react";

interface MinuteSelectorProps {
  value: string; // MM 格式
  onChange: (minute: string) => void;
  required?: boolean;
}

export default function MinuteSelector({
  value,
  onChange,
  required = false,
}: MinuteSelectorProps) {
  const [minute, setMinute] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 从 value 初始化
  useEffect(() => {
    if (value) {
      setMinute(value);
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

  // 当分钟改变时，更新父组件
  useEffect(() => {
    if (minute !== undefined) {
      onChange(minute);
    }
  }, [minute, onChange]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-card-bg)] text-left flex items-center justify-between"
      >
        <span className={!minute ? "text-[var(--color-muted)]" : "text-[var(--color-text)]"}>
          {minute !== "" ? `${parseInt(minute)}分` : "分"}
        </span>
        <svg
          className="h-5 w-5 text-[var(--color-muted)]"
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
      
      {isDropdownOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-lg shadow-lg p-3 max-h-96 overflow-y-auto"
          style={{ minWidth: "0", maxWidth: "90vw", width: "100%" }}
        >
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 60 }, (_, i) => i).map((m) => {
              const minuteValue = m.toString().padStart(2, '0');
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMinute(minuteValue);
                    setIsDropdownOpen(false);
                  }}
                  className={`text-center py-2 px-2 rounded transition-colors whitespace-nowrap ${
                    minute === minuteValue
                      ? "bg-[var(--color-primary)] text-white"
                      : "hover:bg-[var(--color-hover)] text-[var(--color-text)]"
                  }`}
                >
                  <div className={`text-sm font-medium ${minute === minuteValue ? 'text-white' : 'text-[var(--color-text)]'} whitespace-nowrap`}>{m}分</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

