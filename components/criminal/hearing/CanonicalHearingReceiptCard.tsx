import { CalendarClock, FileCheck2 } from "lucide-react";
import type { HearingLifecycle } from "@/lib/criminal/hearing-notice-lifecycle";

function displayDate(dateIso: string | null, raw: string | null): string {
  if (dateIso && /^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    const [year, month, day] = dateIso.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }
  return raw?.trim() || "Date not safely established";
}

function sourcePageLabel(sourcePage: string | null, compiledPage: string | null): string {
  if (sourcePage) return sourcePage;
  if (compiledPage) return `compiled ${compiledPage}`;
  return "exact page unavailable";
}

export function CanonicalHearingReceiptCard({
  lifecycle,
  surface,
}: {
  lifecycle: HearingLifecycle;
  surface: "overview" | "war_room" | "acceptance";
}) {
  const hearing = lifecycle.latest;
  if (!hearing) {
    return (
      <section
        className="rounded-xl border border-slate-200 bg-white p-4"
        data-testid={`canonical-hearing-receipt-${surface}`}
        data-hearing-state="absent"
      >
        <div className="flex items-center gap-2 text-slate-700">
          <CalendarClock className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Next hearing</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          No next hearing is safely established from the supplied papers.
        </p>
      </section>
    );
  }

  const date = displayDate(hearing.hearingDateIso, hearing.hearingDateRaw);
  const when = hearing.hearingTimeLiteral
    ? `${date} at ${hearing.hearingTimeLiteral}`
    : date;
  const sourceKind =
    hearing.sourceKind === "learned_pattern"
      ? "Approved learned pattern"
      : "Coded source extractor";
  const sourceKindAttr = hearing.sourceKind ?? "coded_extractor";

  return (
    <section
      className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm"
      data-testid={`canonical-hearing-receipt-${surface}`}
      data-hearing-state="present"
      data-hearing-source-kind={sourceKindAttr}
      data-hearing-pattern-id={hearing.patternId ?? ""}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-blue-900">
            <CalendarClock className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Next hearing</h2>
          </div>
          <p className="mt-1 text-base font-semibold text-slate-950" data-testid="canonical-hearing-value">
            {when}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-800">
          {sourceKind}
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <FileCheck2 className="h-3.5 w-3.5" />
          Source receipt
        </div>
        <p className="mt-1 text-xs text-slate-600" data-testid="canonical-hearing-source">
          {hearing.documentTitle} · {sourcePageLabel(hearing.sourcePage, hearing.compiledPage)}
        </p>
        {hearing.sourceExcerpt ? (
          <blockquote
            className="mt-2 border-l-2 border-blue-300 pl-2 text-xs leading-relaxed text-slate-800"
            data-testid="canonical-hearing-excerpt"
          >
            {hearing.sourceExcerpt}
          </blockquote>
        ) : null}
      </div>

      {lifecycle.conflict ? (
        <p className="mt-2 text-xs font-medium text-amber-800">
          {lifecycle.conflictDescription ?? "Conflicting current hearing notices require review."}
        </p>
      ) : null}
    </section>
  );
}
