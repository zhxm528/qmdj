"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminMenu } from "@/components/admin/adminMenu";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

function findBreadcrumb(pathname: string): {
  trail: BreadcrumbItem[];
  currentLabel: string;
} {
  const trail: BreadcrumbItem[] = [{ label: "管理后台", href: "/admin" }];
  let currentLabel = "管理后台";

  for (const section of adminMenu) {
    if (!section.children) {
      continue;
    }
    for (const item of section.children) {
      if (item.href === pathname) {
        trail.push({ label: section.label });
        trail.push({ label: item.label, href: item.href });
        currentLabel = item.label;
        return { trail, currentLabel };
      }
    }
  }

  if (pathname === "/admin") {
    return { trail: [{ label: "管理后台" }], currentLabel };
  }

  return { trail, currentLabel };
}

export default function AdminBreadcrumb({
  title,
  className = "",
}: {
  title?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const { trail, currentLabel } = findBreadcrumb(pathname);
  const displayTitle = title || currentLabel;

  return (
    <div className={`min-w-0 ${className}`}>
      <nav className="text-xs text-gray-500">
        <ol className="flex flex-wrap items-center gap-2">
          {trail.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && index !== trail.length - 1 ? (
                <Link href={item.href} className="hover:text-amber-600">
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
              {index < trail.length - 1 && <span className="text-gray-300">/</span>}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
