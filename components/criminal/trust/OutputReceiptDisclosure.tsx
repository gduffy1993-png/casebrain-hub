"use client";

import type { VisibleOutputReceipt } from "@/lib/criminal/visible-output-receipt";

function Row({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-2 gap-y-0.5">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`text-xs leading-snug ${warn ? "text-amber-700 font-medium" : "text-slate-700"}`}>
        {value}
      </dd>
    </div>
  );
}

export function OutputReceiptDisclosure({
  receipt,
  compact = false,
  testId = "output-receipt",
}: {
  receipt: VisibleOutputReceipt;
  compact?: boolean;
  testId?: string;
}) {
  return (
    <details
      className={compact ? "mt-1" : "mt-2"}
      data-testid={testId}
      data-source-class={receipt.sourceClass}
      data-family={receipt.family}
    >
      <summary className="cursor-pointer select-none text-[11px] font-medium text-blue-700 hover:underline">
        Why / source receipt
      </summary>
      <dl className="mt-2 space-y-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
        <Row label="Output" value={receipt.output} />
        <Row label="Type / surface" value={`${receipt.outputType} · ${receipt.surface}`} />
        <Row label="Truth state" value={receipt.truthState} />
        <Row
          label="Source class"
          value={receipt.sourceClass}
          warn={receipt.sourceClass === "unsupported"}
        />
        <Row label="Document" value={receipt.sourceDocument} />
        <Row label="Ref" value={receipt.sourceRef} />
        <Row label="Page" value={receipt.sourcePage} />
        <Row
          label="File quote"
          value={receipt.supportingText ?? "No supporting File/PDF quote available."}
        />
        <Row label="Transformation" value={receipt.transformation} />
        <Row label="Confidence" value={String(receipt.confidence)} />
        <Row label="Guard" value={receipt.guard} warn={Boolean(receipt.unsupportedWarning)} />
        {receipt.unsupportedWarning ? (
          <p className="text-xs text-amber-800 border-t border-amber-200 pt-1.5" data-testid="output-receipt-unsupported">
            {receipt.unsupportedWarning}
          </p>
        ) : null}
      </dl>
    </details>
  );
}
