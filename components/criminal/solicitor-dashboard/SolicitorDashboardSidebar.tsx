"use client";

import Link from "next/link";
import {
  Briefcase,
  Calendar,
  FileText,
  Gavel,
  LayoutDashboard,
  Search,
  Settings,
  Upload,
  Users,
} from "lucide-react";
import type { DashboardRecentCase } from "@/lib/criminal/solicitor-dashboard/types";

const NAV: Array<{
  href: string;
  label: string;
  icon: typeof Gavel;
  muted?: boolean;
}> = [
  { href: "/court-today", label: "Court Today", icon: Gavel },
  { href: "/cases", label: "Cases", icon: Briefcase },
  { href: "/upload", label: "Upload Papers", icon: Upload },
  { href: "/search", label: "Search", icon: Search },
  { href: "/cases", label: "Chase Manager", icon: FileText },
  { href: "/settings", label: "Templates", icon: LayoutDashboard, muted: true },
  { href: "/court-today", label: "Calendar", icon: Calendar, muted: true },
  { href: "/supervisor-queue", label: "Reports", icon: Users, muted: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

function readinessColor(pct: number | null): string {
  if (pct == null) return "stroke-slate-500";
  if (pct >= 70) return "stroke-emerald-400";
  if (pct >= 45) return "stroke-amber-400";
  return "stroke-rose-400";
}

function RecentRing({ pct }: { pct: number | null }) {
  const value = pct ?? 0;
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0" aria-hidden>
      <circle cx="18" cy="18" r={r} fill="none" stroke="#334155" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        className={readinessColor(pct)}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={pct == null ? c : offset}
        transform="rotate(-90 18 18)"
      />
      <text x="18" y="20" textAnchor="middle" className="fill-slate-200 text-[8px] font-semibold">
        {pct == null ? "—" : `${pct}%`}
      </text>
    </svg>
  );
}

export function SolicitorDashboardSidebar({
  activePath,
  recentCases,
  userEmail,
}: {
  activePath: string;
  recentCases: DashboardRecentCase[];
  userEmail?: string | null;
}) {
  return (
    <aside
      className="flex w-[260px] shrink-0 flex-col bg-[#0f172a] text-slate-200 border-r border-slate-800/80"
      data-testid="solicitor-dashboard-sidebar"
    >
      <div className="px-5 py-5 border-b border-slate-800/80">
        <Link href="/cases" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold">
            CB
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">CaseBrain</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/cases"
              ? activePath.startsWith("/cases")
              : activePath === item.href || activePath.startsWith(`${item.href}/`);
          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : item.muted
                    ? "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-5 pb-2 px-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Recent cases</p>
        </div>
        <ul className="space-y-1">
          {recentCases.length ? (
            recentCases.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link
                  href={c.href}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-800/70"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-slate-100">{c.label}</p>
                    <p className="truncate text-[10px] text-slate-500">{c.chargeLine}</p>
                  </div>
                  <RecentRing pct={c.readinessPercent} />
                </Link>
              </li>
            ))
          ) : (
            <li className="px-2.5 py-2 text-[11px] text-slate-500">No recent cases safely listed.</li>
          )}
        </ul>
      </nav>

      <div className="border-t border-slate-800/80 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-[11px] font-semibold text-white">
            CB
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-slate-100">Criminal Defence Solicitor</p>
            <p className="truncate text-[10px] text-slate-500">{userEmail || "Signed in"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
