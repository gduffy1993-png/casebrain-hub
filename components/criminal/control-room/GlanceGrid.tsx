"use client";

export function GlanceItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-foreground mt-0.5 line-clamp-3">{value}</dd>
    </div>
  );
}

export function SummaryBlock({ label, items, compact }: { label: string; items: string[]; compact?: boolean }) {
  const shown = compact ? items.slice(0, 2) : items;
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <ul className={`list-disc pl-3.5 space-y-0.5 text-foreground ${compact ? "text-xs" : "text-sm"}`}>
        {shown.map((item, i) => (
          <li key={i} className="line-clamp-3">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RiskColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="min-w-0 rounded-md border border-border/40 bg-muted/10 p-2.5">
      <p className="text-[11px] font-semibold text-foreground mb-1">{title}</p>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">None in this category on current file.</p>
      ) : (
        <ul className="list-disc pl-3.5 space-y-0.5 text-[11px] text-muted-foreground">
          {items.map((item, i) => (
            <li key={i} className="line-clamp-2">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
