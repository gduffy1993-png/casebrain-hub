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
  Trash2,
  Search,
  Shield,
  Users,
  ChevronDown,
  ChevronRight,
  User,
  UserCheck,
  GraduationCap,
} from "lucide-react";
import type { ReactNode } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  labsOnly?: boolean;
  badge?: string;
  hasRoleFilter?: boolean;
  practiceArea?: string;
  usePracticeAreaRoles?: boolean; // If true, show practice-area-specific roles instead of general roles
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
  { value: "general_litigation_solicitor", label: "General Litigation Solicitor", icon: <FileText className="h-3 w-3" />, practiceArea: "other_litigation" },
];

const labsEnabled = process.env.NEXT_PUBLIC_ENABLE_LABS === "true";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <Home className="h-4 w-4" /> },
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
    labsOnly: true,
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
    
    // Update URL if on cases page
    if (pathname?.startsWith("/cases")) {
      const currentUrl = window.location.href;
      const url = new URL(currentUrl);
      if (role === "all") {
        url.searchParams.delete("role");
      } else {
        url.searchParams.set("role", role);
      }
      router.push(url.pathname + url.search);
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

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.labsOnly || labsEnabled,
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r border-white/10 bg-surface/50 backdrop-blur-xl">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white font-bold shadow-glow-sm">
            CB
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-secondary opacity-50 blur-xl" />
        </div>
        <div>
          <p className="text-base font-bold text-accent">CaseBrain</p>
          <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">
            Intelligent Legal Workspace
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const itemKey = item.href;
          const isExpanded = expandedItems.has(itemKey);
          const selectedRole = selectedRoles[itemKey] ?? "all";

          if (item.hasRoleFilter) {
            return (
              <div key={item.href} className="space-y-1">
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
                    ? PRACTICE_AREA_ROLE_OPTIONS 
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
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
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
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
          <p className="text-xs font-medium text-accent-soft">
            CaseBrain Hub © {new Date().getFullYear()}
          </p>
          <p className="mt-1 text-[10px] text-accent-muted">
            All actions are logged for audit compliance.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={
      <aside className="flex h-full w-64 flex-col border-r border-white/10 bg-surface/50 backdrop-blur-xl">
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
