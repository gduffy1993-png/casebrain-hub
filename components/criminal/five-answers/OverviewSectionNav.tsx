"use client";

const SECTIONS = [
  { id: "overview-understand", label: "Understand" },
  { id: "overview-trust", label: "Truth map" },
  { id: "overview-prepare", label: "Court prep" },
  { id: "overview-send", label: "Exports" },
  { id: "overview-review", label: "Review" },
] as const;

export function OverviewSectionNav() {
  return (
    <nav
      className="flex flex-wrap gap-1.5 text-[11px]"
      aria-label="Overview sections"
      data-testid="overview-section-nav"
    >
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="rounded-md border border-slate-700/70 bg-slate-900/50 px-2.5 py-1 text-slate-400 hover:text-slate-200 hover:border-slate-600"
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
