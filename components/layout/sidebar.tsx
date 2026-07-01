"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useState, useEffect, Suspense } from "react";
import { usePracticeArea } from "@/components/providers/PracticeAreaProvider";
import { useSeniority } from "@/components/providers/SeniorityProvider";
import type { PracticeArea } from "@/lib/types/casebrain";
import {
  AlertTriangle,
  BarChart2,
  Building2,
  CalendarClock,
  Gavel,
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
  Trash2,
  Search,
  Shield,
  ClipboardList,
  FileCheck2,
  Users,
  ChevronDown,
  ChevronRight,
  User,
  UserCheck,
  GraduationCap,
} from "lucide-react";
import { WhatsAppButton } from "@/components/support/WhatsAppButton";
import type { ReactNode } from "react";
import { Fragment } from "react";
import { createClient } from "@/lib/supabase/browser";
import {
  CRIMINAL_PILOT_NAV_HREFS,
  isCriminalPilotMode,
  isPilotDemoUploadDisabled,
  shouldShowInternalDevTools,
} from "@/lib/pilot-mode";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  labsOnly?: boolean;
  badge?: string;
  hasRoleFilter?: boolean;
  practiceArea?: string;
  usePracticeAreaRoles?: boolean; // If true, show practice-area-specific roles instead of general roles
  hideFromNav?: boolean; // Criminal-first: hidden from sidebar for now (per plan)
};

type SolicitorRole = 
  | "all"
  | "solicitor"
  | "senior_solicitor"
  | "partner"
  | "paralegal"
  | "trainee"
  | "family_solicitor"
  | "housing_solicitor"
  | "pi_solicitor"
  | "clinical_neg_solicitor"
  | "criminal_solicitor"
  | "general_litigation_solicitor";

type RoleOption = {
  value: SolicitorRole;
  label: string;
  icon: ReactNode;
  practiceArea?: string; // If set, this role filters to this practice area
};

// Map sidebar role values to seniority labels
const SENIORITY_MAP: Record<string, "Solicitor" | "Senior Solicitor" | "Partner" | "Paralegal" | "Trainee"> = {
  solicitor: "Solicitor",
  senior_solicitor: "Senior Solicitor",
  partner: "Partner",
  paralegal: "Paralegal",
  trainee: "Trainee",
};

const GENERAL_ROLE_OPTIONS: RoleOption[] = [
  { value: "all", label: "All Roles", icon: <Users className="h-3 w-3" /> },
  { value: "solicitor", label: "Solicitor", icon: <User className="h-3 w-3" /> },
  { value: "senior_solicitor", label: "Senior Solicitor", icon: <UserCheck className="h-3 w-3" /> },
  { value: "partner", label: "Partner", icon: <GraduationCap className="h-3 w-3" /> },
  { value: "paralegal", label: "Paralegal", icon: <FileText className="h-3 w-3" /> },
  { value: "trainee", label: "Trainee", icon: <GraduationCap className="h-3 w-3" /> },
];

const PRACTICE_AREA_ROLE_OPTIONS: RoleOption[] = [
  { value: "all", label: "All Cases", icon: <Users className="h-3 w-3" /> },
  { value: "family_solicitor", label: "Family Solicitor", icon: <User className="h-3 w-3" />, practiceArea: "family" },
  { value: "housing_solicitor", label: "Housing Solicitor", icon: <Home className="h-3 w-3" />, practiceArea: "housing_disrepair" },
  { value: "pi_solicitor", label: "PI Solicitor", icon: <BriefcaseMedical className="h-3 w-3" />, practiceArea: "personal_injury" },
  { value: "clinical_neg_solicitor", label: "Clinical Neg Solicitor", icon: <BriefcaseMedical className="h-3 w-3" />, practiceArea: "clinical_negligence" },
  { value: "criminal_solicitor", label: "Criminal Defence Solicitor", icon: <Shield className="h-3 w-3" />, practiceArea: "criminal" },
  { value: "general_litigation_solicitor", label: "General Litigation Solicitor", icon: <FileText className="h-3 w-3" />, practiceArea: "other_litigation" },
];

/** Pilot / criminal-first: Cases submenu shows only list + criminal defence (set NEXT_PUBLIC_SIDEBAR_ALL_PRACTICE_AREAS=true to restore full list). */
const showAllPracticeAreasInCasesNav = process.env.NEXT_PUBLIC_SIDEBAR_ALL_PRACTICE_AREAS === "true";
const CASES_SIDEBAR_ROLE_OPTIONS: RoleOption[] = showAllPracticeAreasInCasesNav
  ? PRACTICE_AREA_ROLE_OPTIONS
  : PRACTICE_AREA_ROLE_OPTIONS.filter((r) => r.value === "all" || r.value === "criminal_solicitor");

const labsEnabled = process.env.NEXT_PUBLIC_ENABLE_LABS === "true";

const NAV_ITEMS: NavItem[] = [
  { label: "Court Today", href: "/court-today", icon: <Gavel className="h-4 w-4" /> },
  {
    label: "Supervisor Queue",
    href: "/supervisor-queue",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    label: "Audit Log",
    href: "/audit-log",
    icon: <ClipboardList className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "Proof Review",
    href: "/proof-review",
    icon: <FileCheck2 className="h-4 w-4" />,
    labsOnly: true,
  },
  { label: "Dashboard", href: "/dashboard", icon: <Home className="h-4 w-4" /> },
  { label: "Police station", href: "/police-station", icon: <Building2 className="h-4 w-4" /> },
  // Compliance and Team tabs hidden for v1 pilot - code preserved but not shown in nav
  // { 
  //   label: "Compliance", 
  //   href: "/compliance", 
  //   icon: <Shield className="h-4 w-4" />,
  //   badge: "New",
  // },
  // {
  //   label: "Team",
  //   href: "/team",
  //   icon: <Users className="h-4 w-4" />,
  // },
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
    label: "Risk Radar",
    href: "/risk",
    icon: <AlertTriangle className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "Knowledge Graph",
    href: "/knowledge",
    icon: <GitBranch className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: <BarChart2 className="h-4 w-4" />,
    hideFromNav: true,
  },
  {
    label: "Builder",
    href: "/builder",
    icon: <Code className="h-4 w-4" />,
    labsOnly: true,
    badge: "Beta",
  },
  {
    label: "PI / Clin Neg",
    href: "/pi-dashboard",
    icon: <BriefcaseMedical className="h-4 w-4" />,
    labsOnly: true,
    hasRoleFilter: true,
    practiceArea: "personal_injury",
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: <CheckSquare className="h-4 w-4" />,
    labsOnly: true,
  },
  { 
    label: "Cases", 
    href: "/cases", 
    icon: <Layers className="h-4 w-4" />,
    hasRoleFilter: true,
    usePracticeAreaRoles: true, // Use practice-area-specific roles
  },
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
    hideFromNav: true,
  },
  {
    label: "Documents",
    href: "/documents",
    icon: <Files className="h-4 w-4" />,
    labsOnly: true,
  },
  {
    label: "Search",
    href: "/search",
    icon: <Search className="h-4 w-4" />,
  },
  {
    label: "Golden Sweep",
    href: "/eval",
    icon: <BarChart2 className="h-4 w-4" />,
    hideFromNav: true,
    labsOnly: true,
  },
  {
    label: "Battleboard Sweep",
    href: "/battleboard-sweep",
    icon: <BarChart2 className="h-4 w-4" />,
    hideFromNav: true,
    labsOnly: true,
  },
  {
    label: "Bin",
    href: "/bin",
    icon: <Trash2 className="h-4 w-4" />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentPracticeArea, setPracticeArea } = usePracticeArea();
  const { setSeniority } = useSeniority();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Record<string, SolicitorRole>>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  // Load selected roles from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("sidebar_selected_roles");
    if (stored) {
      try {
        setSelectedRoles(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save selected roles to localStorage
  const updateRole = (itemKey: string, role: SolicitorRole) => {
    const newRoles = { ...selectedRoles, [itemKey]: role };
    setSelectedRoles(newRoles);
    localStorage.setItem("sidebar_selected_roles", JSON.stringify(newRoles));

    // Only sync URL on the cases list. On /cases/[caseId] (or nested routes), the role row's
    // onClick navigates to /cases?... — if we push here first we stay on the case page and
    // Criminal Defense appears to "do nothing".
    const onCasesList =
      pathname === "/cases" || pathname === "/cases/";
    if (onCasesList) {
      const url = new URL(window.location.href);
      if (role === "all") {
        url.searchParams.delete("role");
      } else {
        url.searchParams.set("role", role);
      }
      router.push(`${url.pathname}${url.search}`);
    }
  };

  const toggleExpanded = (itemKey: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemKey)) {
      newExpanded.delete(itemKey);
    } else {
      newExpanded.add(itemKey);
    }
    setExpandedItems(newExpanded);
  };

  const pilotNavActive = isCriminalPilotMode() && !shouldShowInternalDevTools(userId);
  const pilotNavSet = new Set<string>(CRIMINAL_PILOT_NAV_HREFS);

  const pilotUploadHidden = pilotNavActive && isPilotDemoUploadDisabled(userId);

  const matterFocus =
    pilotNavActive &&
    (Boolean(pathname?.match(/^\/cases\/[^/]+/)) || pathname?.startsWith("/court-today"));

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.hideFromNav) return false;
    if (pilotUploadHidden && item.href === "/upload") return false;
    if (pilotNavActive && !pilotNavSet.has(item.href)) return false;
    return !item.labsOnly || labsEnabled || shouldShowInternalDevTools(userId);
  });

  return (
    <aside
      className={`flex h-full flex-col border-r border-slate-800 bg-slate-900 text-slate-100 transition-[width] ${
        matterFocus ? "w-[3.75rem]" : "w-64"
      }`}
      data-matter-focus={matterFocus ? "true" : "false"}
    >
      {/* Logo Section */}
      <div className={`flex items-center gap-3 py-4 ${matterFocus ? "justify-center px-2" : "px-6 py-6"}`}>
        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white font-bold shadow-glow-sm">
            CB
          </div>
          {!matterFocus ? (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-secondary opacity-50 blur-xl" />
          ) : null}
        </div>
        {!matterFocus ? (
          <div>
            <p className="text-base font-bold text-white">CaseBrain</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              Criminal defence workflow
            </p>
          </div>
        ) : null}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {visibleItems.map((item) => {
          const sectionLabel =
            item.href === "/court-today"
              ? "Court diary"
              : item.href === "/cases"
                ? "Case work"
                : item.href === "/dashboard"
                  ? "Workspace"
                  : null;
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const itemKey = item.href;
          const isExpanded = expandedItems.has(itemKey);
          const selectedRole = selectedRoles[itemKey] ?? "all";

          if (item.hasRoleFilter) {
            return (
              <Fragment key={item.href}>
                {sectionLabel && (
                  <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 first:pt-1">
                    {sectionLabel}
                  </p>
                )}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleExpanded(itemKey)}
                    className={clsx(
                      "flex-1 group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-accent-soft hover:text-accent hover:bg-white/5",
                    )}
                  >
                    <span
                      className={clsx(
                        "transition-colors",
                        isActive ? "text-primary" : "text-accent-muted group-hover:text-accent-soft",
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                        {item.badge}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-accent-muted" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-accent-muted" />
                    )}
                  </button>
                  {!isExpanded && (
                    <Link
                      href={item.href}
                      className={clsx(
                        "p-2 rounded-lg transition-colors",
                        isActive
                          ? "text-primary hover:bg-primary/20"
                          : "text-accent-muted hover:text-accent hover:bg-white/5",
                      )}
                      onClick={(e) => {
                        // Only add practiceArea param if item has one (for role items)
                        // For seniority items or items without practiceArea, just navigate normally
                        if (item.practiceArea) {
                          e.preventDefault();
                          router.push(`${item.href}?practiceArea=${item.practiceArea}`);
                        }
                        // Otherwise, let the Link handle navigation naturally
                        // This ensures "Solicitor" etc. just navigate without changing practice area
                      }}
                    >
                      <span className="sr-only">Go to {item.label}</span>
                    </Link>
                  )}
                </div>
                
                {isExpanded && (() => {
                  const roleOptions = item.usePracticeAreaRoles
                    ? CASES_SIDEBAR_ROLE_OPTIONS
                    : GENERAL_ROLE_OPTIONS;
                  
                  return (
                    <div className="ml-4 space-y-0.5 border-l border-white/5 pl-3">
                      {roleOptions.map((role) => {
                        // Only highlight based on practice area for role items (not seniority items)
                        const rolePracticeArea = role.practiceArea as PracticeArea | undefined;
                        const isPracticeAreaActive = rolePracticeArea && rolePracticeArea === currentPracticeArea;
                        // For seniority items, only highlight if selected (not based on practice area)
                        const isSeniorityActive = !rolePracticeArea && selectedRole === role.value;
                        const isActive = isPracticeAreaActive || isSeniorityActive;
                        
                        return (
                          <button
                            key={role.value}
                            onClick={() => {
                              updateRole(itemKey, role.value);
                              
                              // If this is a practice area role (has practiceArea), set practice area and clear seniority
                              // Practice area roles are complete (e.g. "PI Solicitor" doesn't need additional seniority)
                              if (role.practiceArea) {
                                setPracticeArea(role.practiceArea as PracticeArea);
                                setSeniority(null); // Clear seniority when selecting a complete practice area role
                              } else if (role.value !== "all" && SENIORITY_MAP[role.value]) {
                                // If this is a seniority role, update seniority but keep current practice area
                                setSeniority(SENIORITY_MAP[role.value]);
                              } else if (role.value === "all") {
                                // "All Roles" clears seniority
                                setSeniority(null);
                              }
                              
                              const params = new URLSearchParams();
                              
                              // If role has a practice area, add it to params
                              if (role.practiceArea) {
                                params.set("practiceArea", role.practiceArea);
                              } else if (item.practiceArea) {
                                // Use item's practice area if role doesn't have one
                                params.set("practiceArea", item.practiceArea);
                              }
                              
                              // Add role param (unless it's "all")
                              if (role.value !== "all") {
                                params.set("role", role.value);
                              }
                              
                              const queryString = params.toString();
                              router.push(`${item.href}${queryString ? `?${queryString}` : ""}`);
                            }}
                            className={clsx(
                              "w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors text-left",
                              isActive
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "text-accent-soft hover:text-accent hover:bg-white/5",
                            )}
                          >
                            <span className="text-accent-muted">{role.icon}</span>
                            <span>{role.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              </Fragment>
            );
          }

          return (
            <Fragment key={item.href}>
              {sectionLabel && !matterFocus && (
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 first:pt-1">
                  {sectionLabel}
                </p>
              )}
            <Link
              href={item.href}
              title={matterFocus ? item.label : undefined}
              className={clsx(
                "group flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                matterFocus ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-accent-soft hover:text-accent hover:bg-white/5",
              )}
            >
              <span
                className={clsx(
                  "transition-colors",
                  isActive ? "text-primary" : "text-accent-muted group-hover:text-accent-soft",
                )}
              >
                {item.icon}
              </span>
              {!matterFocus ? <span className="flex-1">{item.label}</span> : null}
              {!matterFocus && item.badge ? (
                <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                  {item.badge}
                </span>
              ) : null}
              {!matterFocus && isActive ? (
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              ) : null}
            </Link>
            </Fragment>
          );
        })}
      </nav>

      {/* Footer */}
      {pilotNavActive && !matterFocus ? (
        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            CaseBrain · Criminal Defence Workflow © {new Date().getFullYear()}
          </p>
        </div>
      ) : pilotNavActive && matterFocus ? null : (
        <div className="border-t border-white/10 px-4 py-4 space-y-3">
          <WhatsAppButton />
          <div className="rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
            <p className="text-xs font-medium text-accent-soft">
              CaseBrain Hub © {new Date().getFullYear()}
            </p>
            <p className="mt-1 text-[10px] text-accent-muted">
              All actions are logged for audit compliance.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={
      <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-100">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="h-11 w-11 rounded-xl bg-surface-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-surface-muted animate-pulse" />
            <div className="h-3 w-16 rounded bg-surface-muted animate-pulse" />
          </div>
        </div>
      </aside>
    }>
      <SidebarContent />
    </Suspense>
  );
}
