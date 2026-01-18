"use client";

import { useState, useEffect, useRef } from "react";

interface GenderSelectorProps {
  value: string; // "男" 或 "女"
  onChange: (gender: string) => void;
  required?: boolean;
}

export default function GenderSelector({
  value,
  onChange,
  required = false,
}: GenderSelectorProps) {
  const [gender, setGender] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 从 value 初始化
  useEffect(() => {
    if (value) {
      setGender(value);
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

  // 当性别改变时，更新父组件
  useEffect(() => {
    if (gender) {
      onChange(gender);
    }
  }, [gender, onChange]);

  const genders = ["男", "女"];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-card-bg)] text-left flex items-center justify-between"
      >
        <span className={!gender ? "text-[var(--color-muted)]" : "text-[var(--color-text)]"}>
          {gender || "请选择"}
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
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-lg shadow-lg p-2">
          <div className="space-y-1">
            {genders.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGender(g);
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-center py-2 px-4 rounded transition-colors ${
                  gender === g
                    ? "bg-[var(--color-primary)] text-white"
                    : "hover:bg-[var(--color-hover)] text-[var(--color-text)]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
