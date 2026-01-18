"use client";

import { useState } from "react";

interface SidebarDrawerProps {
  title?: string;
  children?: React.ReactNode;
}

export default function SidebarDrawer({ title = "侧边栏", children }: SidebarDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "收起侧边栏" : "展开侧边栏"}
        onClick={() => setOpen(!open)}
        className="fixed right-4 bottom-24 z-50 rounded-full bg-[var(--color-primary)] text-white shadow-lg w-12 h-12 flex items-center justify-center hover:bg-[var(--color-primary-strong)] transition-colors"
      >
        {open ? (
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12h18" />
            <path d="M3 6h18" />
            <path d="M3 18h18" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-50 h-full w-72 bg-[var(--color-card-bg)] shadow-xl border-l border-[var(--color-border)]">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="font-semibold text-[var(--color-text-strong)]">{title}</div>
              <button
                type="button"
                aria-label="收起侧边栏"
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 text-sm text-[var(--color-text)] space-y-2">
              {children || <div>侧边栏内容</div>}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
