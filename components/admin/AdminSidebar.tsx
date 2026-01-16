"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { adminMenu } from "@/components/admin/adminMenu";

const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className={`h-4 w-4 transition-transform ${open ? "rotate-90" : "rotate-0"}`}
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({
    system: true,
    member: true,
    context: true,
    term: true,
  });

  const menu = adminMenu;

  const toggleSection = (key: string) => {
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside
      className={`sticky top-0 h-screen border-r border-amber-100 bg-white transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-4">
        <span
          className={`text-sm font-semibold tracking-wide text-gray-600 transition-opacity ${
            collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          管理后台
        </span>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50"
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              aria-hidden="true"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              aria-hidden="true"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M11 18l-6-6 6-6" />
            </svg>
          )}
        </button>
      </div>

      <nav className="px-2 pb-6 overflow-y-auto h-[calc(100vh-64px)]">
        {menu.map((section) => {
          const isOpen = openKeys[section.key];
          return (
            <div key={section.key} className="mb-2">
              <button
                type="button"
                className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-amber-50 ${
                  collapsed ? "justify-center" : "justify-between"
                }`}
                onClick={() => toggleSection(section.key)}
              >
                <span className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
                  <span className="text-amber-600">{section.icon}</span>
                  <span
                    className={`transition-opacity ${
                      collapsed ? "opacity-0 w-0" : "opacity-100"
                    }`}
                  >
                    {section.label}
                  </span>
                </span>
                {!collapsed && <IconChevron open={isOpen} />}
              </button>

              <div
                className={`mt-1 space-y-1 overflow-hidden transition-all duration-200 ${
                  isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                } ${collapsed ? "pl-0" : "pl-8"}`}
              >
                {section.children?.map((item) => {
                  const active = item.href && pathname === item.href;
                  return (
                    <Link
                      key={item.key}
                      href={item.href || "#"}
                      className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
                        active
                          ? "bg-amber-100 text-amber-700"
                          : "text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <span className="text-amber-500">{item.icon}</span>
                      <span className={collapsed ? "hidden" : "block"}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
