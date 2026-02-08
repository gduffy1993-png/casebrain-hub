"use client";

import Link from "next/link";
import { Link2, FilePlus, Inbox } from "lucide-react";

export function UploadNextSteps() {
  return (
    <section
      className="rounded-2xl border border-primary/20 bg-surface-muted/50 p-6"
      aria-label="What next?"
    >
      <h2 className="text-sm font-semibold text-accent mb-3">What next?</h2>
      <ul className="flex flex-wrap gap-4">
        <li>
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-surface px-4 py-2.5 text-sm font-medium text-accent transition hover:border-primary/40 hover:bg-surface-muted"
          >
            <Link2 className="h-4 w-4 text-primary" />
            Attach to existing case
          </Link>
        </li>
        <li>
          <span className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-surface px-4 py-2.5 text-sm font-medium text-accent/80">
            <FilePlus className="h-4 w-4 text-primary" />
            Create new case
          </span>
          <span className="ml-2 text-xs text-accent/60">Use the form above with a case title</span>
        </li>
        <li>
          <Link
            href="/intake"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-surface px-4 py-2.5 text-sm font-medium text-accent transition hover:border-primary/40 hover:bg-surface-muted"
          >
            <Inbox className="h-4 w-4 text-primary" />
            Send to Intake
          </Link>
        </li>
      </ul>
    </section>
  );
}
