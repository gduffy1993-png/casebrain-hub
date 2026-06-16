"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { workflowCard, workflowSectionTitle } from "./workflowUi";
import {
  resolveCaseHeaderMetadata,
  sanitizeHeaderAllegation,
} from "@/lib/criminal/resolve-case-header-metadata";
import { sanitizePilotVisibleLine } from "@/lib/criminal/pilot-workflow";
import { isCriminalPilotMode } from "@/lib/pilot-mode";

type ClientRecord = {
  summary: string;
  keyDecisions: string;
  authorityToAct: string;
};

/** Prosecution papers vs client instructions — defence workflow split. */
export function ClientVsPapersPanel({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(true);
  const [papersLine, setPapersLine] = useState("");
  const [client, setClient] = useState<ClientRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bundleRes, clientRes] = await Promise.all([
          fetch(`/api/criminal/${caseId}/bundle-source`, { credentials: "include" }),
          fetch(`/api/criminal/${caseId}/client-instructions`, { credentials: "include" }),
        ]);
        const bundleJson = await bundleRes.json();
        const clientJson = await clientRes.json();
        if (cancelled) return;
        if (bundleJson.ok && bundleJson.data) {
          const meta = resolveCaseHeaderMetadata({
            bundleHeader: bundleJson.data.header ?? null,
            bundleMetadata: bundleJson.data.caseMetadata ?? null,
            snapshot: null,
          });
          setPapersLine(sanitizeHeaderAllegation(meta.allegation) || "Allegation not safely on papers yet.");
        }
        if (clientJson.ok && clientJson.data) {
          setClient({
            summary: clientJson.data.summary ?? "",
            keyDecisions: clientJson.data.keyDecisions ?? "",
            authorityToAct: clientJson.data.authorityToAct ?? "",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const clientText = [client?.summary, client?.keyDecisions].filter(Boolean).join(" ").trim();
  const conflict =
    clientText.length > 12 &&
    papersLine.length > 12 &&
    !papersLine.toLowerCase().includes(clientText.slice(0, 20).toLowerCase()) &&
    !clientText.toLowerCase().includes(papersLine.slice(0, 20).toLowerCase());

  const pilot = isCriminalPilotMode();

  return (
    <Card className={`${workflowCard} p-4 border-slate-200 bg-white`} data-testid="client-vs-papers">
      <h3 className={workflowSectionTitle}>Client instructions vs papers</h3>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-1">Prosecution papers</p>
            <p className="text-slate-800 leading-relaxed">
              {pilot ? sanitizePilotVisibleLine(papersLine) : papersLine}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-1">Client instructions</p>
            {clientText ? (
              <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                {pilot ? sanitizePilotVisibleLine(clientText) : clientText}
              </p>
            ) : (
              <p className="text-slate-500 text-xs">No client instructions recorded yet.</p>
            )}
          </div>
        </div>
      )}
      {conflict ? (
        <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          Papers and client account may not align — confirm instructions before relying on either alone.
        </p>
      ) : null}
    </Card>
  );
}
