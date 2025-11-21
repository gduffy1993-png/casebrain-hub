"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  AlertTriangle,
  BarChart2,
  CalendarClock,
  CheckSquare,
  Code,
  GitBranch,
  FileText,
  Files,
  Home,
  Inbox,
  Layers,
  Settings,
  Upload,
  BriefcaseMedical,
  Inbox as InboxIcon,
} from "lucide-react";
import type { ReactNode } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  labsOnly?: boolean;
};

const labsEnabled = process.env.NEXT_PUBLIC_ENABLE_LABS === "true";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <Home className="h-4 w-4" /> },
  {
    label: "Briefing",
    href: "/briefing",
    icon: <CalendarClock className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "Inbox",
    href: "/inbox",
    icon: <Inbox className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "Risk radar",
    href: "/risk",
    icon: <AlertTriangle className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "Knowledge graph",
    href: "/knowledge",
    icon: <GitBranch className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: <BarChart2 className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "Builder",
    href: "/builder",
    icon: <Code className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "PI / Clin Neg",
    href: "/pi-dashboard",
    icon: <BriefcaseMedical className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "PI Report",
    href: "/pi-report",
    icon: <BriefcaseMedical className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "Housing Dashboard",
    href: "/housing-dashboard",
    icon: <Home className="h-4 w-4" />,
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: <CheckSquare className="h-4 w-4" />,
    labsOnly: true,
  },
  { label: "Cases", href: "/cases", icon: <Layers className="h-4 w-4" /> },
  { label: "Upload", href: "/upload", icon: <Upload className="h-4 w-4" /> },
  {
    label: "Intake",
    href: "/intake",
    icon: <InboxIcon className="h-4 w-4" />,
  },
  {
    label: "Templates",
    href: "/templates",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: "Documents",
    href: "/documents",
    icon: <Files className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.labsOnly || labsEnabled,
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-surface">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white font-bold">
          CB
        </div>
        <div>
          <p className="text-base font-semibold text-accent">CaseBrain Hub</p>
          <p className="text-xs uppercase tracking-wider text-accent/50">
            AI paralegal
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-accent/70 hover:bg-primary/5 hover:text-primary",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-4 py-6 text-xs text-accent/50">
        <p>CaseBrain Hub © {new Date().getFullYear()}</p>
        <p>All actions are audited.</p>
      </div>
    </aside>
  );
}

