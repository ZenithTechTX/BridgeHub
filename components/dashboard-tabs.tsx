"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Play Bridge" },
  { href: "/dashboard/tables", label: "All Tables" },
  { href: "/dashboard/vugraph", label: "Vugraph" },
  { href: "/dashboard/record", label: "My Record" },
  { href: "/dashboard/account", label: "My Account" },
];

export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex h-11 shrink-0 items-center gap-1 border-b bg-background px-4">
      {tabs.map((tab) => {
        const active =
          tab.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex h-full items-center border-b-2 px-3 text-sm font-medium transition-colors",
              active
                ? "border-indigo-700 text-foreground"
                : "border-transparent text-muted-foreground hover:border-indigo-300 hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
