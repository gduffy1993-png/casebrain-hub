"use client";

import { Badge } from "@/components/ui/badge";
import { Building2, Car, Stethoscope, Users, Scale } from "lucide-react";
import type { PracticeArea } from "@/lib/types/casebrain";

interface PracticeAreaBadgeProps {
  practiceArea: PracticeArea | string | null | undefined;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const practiceAreaConfig: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    colors: string;
  }
> = {
  housing_disrepair: {
    label: "Housing Disrepair",
    icon: Building2,
    colors: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  personal_injury: {
    label: "Personal Injury",
    icon: Car,
    colors: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  clinical_negligence: {
    label: "Clinical Negligence",
    icon: Stethoscope,
    colors: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  },
  family: {
    label: "Family",
    icon: Users,
    colors: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  other_litigation: {
    label: "General Litigation",
    icon: Scale,
    colors: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  },
};

export function PracticeAreaBadge({
  practiceArea,
  size = "md",
  showIcon = true,
  className = "",
}: PracticeAreaBadgeProps) {
  const config =
    practiceAreaConfig[practiceArea ?? "other_litigation"] ??
    practiceAreaConfig.other_litigation;

  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-[10px] py-0 px-1.5 gap-1",
    md: "text-xs py-0.5 px-2 gap-1.5",
    lg: "text-sm py-1 px-3 gap-2",
  }[size];

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  }[size];

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center font-medium ${config.colors} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon className={iconSizes} />}
      {config.label}
    </Badge>
  );
}

/**
 * Get practice area label
 */
export function getPracticeAreaLabel(
  practiceArea: PracticeArea | string | null | undefined
): string {
  const config = practiceAreaConfig[practiceArea ?? "other_litigation"];
  return config?.label ?? "General Litigation";
}

/**
 * Get practice area icon
 */
export function getPracticeAreaIcon(
  practiceArea: PracticeArea | string | null | undefined
): React.ComponentType<{ className?: string }> {
  const config = practiceAreaConfig[practiceArea ?? "other_litigation"];
  return config?.icon ?? Scale;
}

/**
 * Get practice area colors
 */
export function getPracticeAreaColors(
  practiceArea: PracticeArea | string | null | undefined
): string {
  const config = practiceAreaConfig[practiceArea ?? "other_litigation"];
  return config?.colors ?? practiceAreaConfig.other_litigation.colors;
}

