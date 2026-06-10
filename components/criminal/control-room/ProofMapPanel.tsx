"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Scale, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { confidenceLabel } from "@/lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import type {
  ProductProofMapLink,
  ProductProofMapProofPoint,
  ProductProofMapResult,
} from "@/lib/criminal/proof-map/product-proof-map-types";
import { PROOF_MAP_UNAVAILABLE_MESSAGE } from "@/lib/criminal/proof-map/product-proof-map-types";
import {
  EmptySectionNote,
  REASONING_V2_DEFAULT_LIST_PREVIEW,
  REASONING_V2_SOURCE_BASIS_MAX,
  truncateSourceBasis,
} from "./reasoningV2Ui";

export type ProofMapPanelProps = {
  result: ProductProofMapResult | null;
  loading?: boolean;
  proofMapEnabled?: boolean;
};

function ConfidenceBadge({ confidence }: { confidence: ProductProofMapProofPoint["confidence"] }) {
  const provisional =
    confidence === "provisional" ||
    confidence === "needs_solicitor_review" ||
    confidence === "insufficient";
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <Badge variant="secondary" size="sm" className="text-[10px] bg-slate-100">
        {confidenceLabel(confidence)}
      </Badge>
      {provisional ? (
        <Badge variant="secondary" size="sm" className="text-[10px] bg-amber-50 text-amber-900">
          Provisional
        </Badge>
      ) : null}
    </div>
  );
}

function ProofPointRow({ point }: { point: ProductProofMapProofPoint }) {
  return (
    <li className="text-xs text-slate-800 leading-relaxed min-w-0 border-l-2 border-indigo-100 pl-2.5">
      <p className="font-medium text-slate-900 break-words">{point.label}</p>
      <p className={`${workflowMuted} mt-0.5 break-words`}>{point.crownMustProve}</p>
      {point.sourceBasis ? (
        <p className={`${workflowMuted} mt-0.5 break-words text-[11px]`}>
          {point.sourceSection}
          {point.sourceBasis ? ` · ${truncateSourceBasis(point.sourceBasis, REASONING_V2_SOURCE_BASIS_MAX)}` : ""}
        </p>
      ) : (
        <p className="text-[11px] text-amber-800/90 mt-0.5">Not safely shown on current papers.</p>
      )}
      <ConfidenceBadge confidence={point.confidence} />
      {point.doNotOverstate ? (
        <p className="text-[10px] text-amber-800/90 mt-1 break-words">
          Do not overstate: {truncateSourceBasis(point.doNotOverstate, REASONING_V2_SOURCE_BASIS_MAX)}
        </p>
      ) : null}
    </li>
  );
}

function LinkRow({ link }: { link: ProductProofMapLink }) {
  return (
    <li className="text-xs text-slate-800 leading-relaxed min-w-0">
      <p className="font-medium text-slate-900 break-words">{link.label}</p>
      {link.sourceBasis ? (
        <p className={`${workflowMuted} mt-0.5 break-words`}>
          {link.sourceSection}
          {` · ${truncateSourceBasis(link.sourceBasis, REASONING_V2_SOURCE_BASIS_MAX)}`}
        </p>
      ) : null}
      {link.disclosureChase ? (
        <p className="text-[11px] text-indigo-900/90 mt-1 break-words">
          Disclosure chase: {truncateSourceBasis(link.disclosureChase, REASONING_V2_SOURCE_BASIS_MAX)}
        </p>
      ) : null}
      <Badge variant="secondary" size="sm" className="text-[10px] bg-slate-100 mt-1">
        {link.status}
      </Badge>
    </li>
  );
}

function ExpandableLinks({
  title,
  links,
  empty,
}: {
  title: string;
  links: ProductProofMapLink[];
  empty?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = links.filter((l) => l.label);
  if (!visible.length) {
    return (
      <div className="border-t border-slate-100 pt-3 min-w-0">
        <h3 className={workflowSectionTitle}>{title}</h3>
        <div className="mt-1.5">
          <EmptySectionNote>{empty ?? "None flagged on current papers."}</EmptySectionNote>
        </div>
      </div>
    );
  }
  const shown = expanded ? visible : visible.slice(0, REASONING_V2_DEFAULT_LIST_PREVIEW);
  const hidden = visible.length - REASONING_V2_DEFAULT_LIST_PREVIEW;

  return (
    <div className="border-t border-slate-100 pt-3 min-w-0">
      <h3 className={workflowSectionTitle}>{title}</h3>
      <ul className="mt-1.5 space-y-2">
        {shown.map((link, i) => (
          <LinkRow key={`${link.proofPointId}-${i}`} link={link} />
        ))}
      </ul>
      {visible.length > REASONING_V2_DEFAULT_LIST_PREVIEW ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1 mt-1 text-[11px] text-indigo-800"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show fewer" : `Show ${hidden} more`}
          {expanded ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronRight className="h-3 w-3 ml-1" />}
        </Button>
      ) : null}
    </div>
  );
}

export function ProofMapPanel({ result, loading, proofMapEnabled = true }: ProofMapPanelProps) {
  const [proofExpanded, setProofExpanded] = useState(true);

  if (!proofMapEnabled) return null;

  if (loading) {
    return (
      <div className={workflowCard} data-testid="proof-map-panel-loading">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-700" />
          Loading proof map…
        </div>
      </div>
    );
  }

  if (!result || !result.available) {
    return (
      <div className={workflowCard} data-testid="proof-map-panel-unavailable">
        <div className="flex items-start gap-2">
          <Scale className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Proof map</h2>
            <p className={`${workflowMuted} mt-1 text-xs`}>
              {result?.available === false ? result.message : PROOF_MAP_UNAVAILABLE_MESSAGE}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const proofPreview = proofExpanded
    ? result.proofPoints
    : result.proofPoints.slice(0, REASONING_V2_DEFAULT_LIST_PREVIEW);

  return (
    <div className={workflowCard} data-testid="proof-map-panel">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Scale className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Proof map</h2>
            <p className={`${workflowMuted} text-xs mt-0.5 break-words`}>
              {result.charge}
              {result.stage ? ` · ${result.stage}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 shrink-0">
          <Badge variant="secondary" size="sm" className="text-[10px] bg-indigo-50 text-indigo-900">
            {result.offenceLensLabel}
          </Badge>
          <Badge variant="secondary" size="sm" className="text-[10px] bg-slate-100">
            {result.tierLabel}
          </Badge>
        </div>
      </div>

      {result.humanReviewRequired ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2">
          <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="min-w-0 text-xs text-amber-950">
            <p className="font-medium">{result.solicitorReviewNote}</p>
            {result.humanReviewReasons.length ? (
              <ul className="mt-1 list-disc pl-4 space-y-0.5 text-amber-900/90">
                {result.humanReviewReasons.slice(0, 4).map((r, i) => (
                  <li key={i} className="break-words">
                    {r}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-3 min-w-0">
        <h3 className={workflowSectionTitle}>What the Crown must prove</h3>
        <ul className="mt-1.5 space-y-2">
          {proofPreview.map((p) => (
            <ProofPointRow key={p.id} point={p} />
          ))}
        </ul>
        {result.proofPoints.length > REASONING_V2_DEFAULT_LIST_PREVIEW ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-1 mt-1 text-[11px] text-indigo-800"
            onClick={() => setProofExpanded((v) => !v)}
          >
            {proofExpanded ? "Show fewer proof points" : `Show all ${result.proofPoints.length} proof points`}
          </Button>
        ) : null}
      </div>

      <ExpandableLinks
        title="What the bundle appears to support"
        links={result.supportsLinks}
        empty="No served material safely linked to proof points on current papers."
      />
      <ExpandableLinks
        title="Missing or unclear"
        links={result.missingLinks}
        empty="No missing material flagged on current papers."
      />
      <ExpandableLinks
        title="Disclosure chase linked to proof issues"
        links={result.disclosureChaseLinks}
        empty="No disclosure chase lines linked to proof points on current papers."
      />

      <div className="mt-3 flex items-start gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
        <p className="break-words">{result.doNotRelyWarning}</p>
      </div>
    </div>
  );
}
