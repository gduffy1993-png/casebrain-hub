"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SkeletonPanelProps {
  className?: string;
  lines?: number;
  showHeader?: boolean;
  animate?: boolean;
}

/**
 * Skeleton loading state for panels
 */
export function SkeletonPanel({
  className = "",
  lines = 3,
  showHeader = true,
  animate = true,
}: SkeletonPanelProps) {
  const animationClass = animate ? "animate-pulse" : "";

  return (
    <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
      {showHeader && (
        <CardHeader className="pb-2">
          <div className={`h-4 w-32 rounded bg-white/10 ${animationClass}`} />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-3 rounded bg-white/5 ${animationClass}`}
            style={{ width: `${Math.random() * 40 + 60}%` }}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Inline skeleton for text content
 */
export function SkeletonText({
  width = "100%",
  className = "",
}: {
  width?: string | number;
  className?: string;
}) {
  return (
    <div
      className={`h-3 rounded bg-white/10 animate-pulse ${className}`}
      style={{ width }}
    />
  );
}

/**
 * Skeleton for badges
 */
export function SkeletonBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-5 w-16 rounded-full bg-white/10 animate-pulse ${className}`}
    />
  );
}

/**
 * Skeleton for icons
 */
export function SkeletonIcon({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded bg-white/10 animate-pulse ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Full page loading state
 */
export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded bg-white/10 animate-pulse" />
          <div className="h-4 w-40 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-white/10 animate-pulse" />
          <div className="h-9 w-24 rounded-lg bg-white/10 animate-pulse" />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 xl:grid-cols-[360px_1fr_320px]">
        <aside className="space-y-4">
          <SkeletonPanel lines={5} />
          <SkeletonPanel lines={3} />
        </aside>
        <main className="space-y-4">
          <SkeletonPanel lines={6} />
          <SkeletonPanel lines={4} />
          <SkeletonPanel lines={5} />
        </main>
        <aside className="space-y-4">
          <SkeletonPanel lines={4} />
          <SkeletonPanel lines={3} />
        </aside>
      </div>
    </div>
  );
}

