"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/Toast";

const TEMPLATE_OPTIONS = [
  { value: "cnf", label: "Claim notification (CNF)" },
  { value: "insurer_chaser", label: "Insurer chaser" },
  { value: "records_request", label: "GP / records request" },
  { value: "client_update", label: "Client update" },
] as const;

type TemplateValue = (typeof TEMPLATE_OPTIONS)[number]["value"];

type PreviewResponse = {
  ok?: boolean;
  template?: {
    id: string | null;
    code: string;
    name: string;
    description: string | null;
  };
  body?: string;
  dev?: boolean;
  message?: string;
};

export function PiLetterPreview({
  caseId,
  caseTitle,
  practiceArea,
}: {
  caseId: string;
  caseTitle: string;
  practiceArea: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pushToast = useToast((state) => state.push);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateValue>("cnf");
  const [previewBody, setPreviewBody] = useState<string | null>(null);
  const [templateMeta, setTemplateMeta] = useState<PreviewResponse["template"] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, startTransition] = useTransition();

  const templateValues = useMemo(() => TEMPLATE_OPTIONS.map((t) => t.value), []);

  useEffect(() => {
    const templateFromQuery = searchParams.get("piLetterPreview");
    if (!templateFromQuery) return;
    if (!templateValues.includes(templateFromQuery as TemplateValue)) return;
    setSelectedTemplate(templateFromQuery as TemplateValue);
    startPreview(templateFromQuery as TemplateValue, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, templateValues.join("|")]);

  const startPreview = (template: TemplateValue, fromQuery = false) => {
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/pi/cases/${caseId}/preview-letter?template=${template}`,
        );
        const payload = (await response.json()) as PreviewResponse;
        if (!response.ok || !payload.ok) {
          throw new Error(payload?.message ?? "Unable to generate letter preview.");
        }

        setPreviewBody(payload.body ?? null);
        setTemplateMeta(payload.template ?? null);
        setIsOpen(true);
        if (payload.dev && payload.message) {
          pushToast(payload.message);
        }

        if (fromQuery) {
          const url = new URL(window.location.href);
          url.searchParams.delete("piLetterPreview");
          const nextPath = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""}`;
          router.replace(nextPath, { scroll: false });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to generate letter preview.";
        pushToast(message);
      }
    });
  };

  const closePreview = () => {
    setIsOpen(false);
    setPreviewBody(null);
    setTemplateMeta(null);
  };

  if (practiceArea !== "pi" && practiceArea !== "clinical_negligence") {
    return null;
  }

  return (
    <>
      <Card
        title="Preview PI letters"
        description="Review standard PI automation letters before drafting. Templates use the latest case data."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-col text-sm text-accent/70">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
              Template
            </span>
            <select
              value={selectedTemplate}
              onChange={(event) => setSelectedTemplate(event.target.value as TemplateValue)}
              className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {TEMPLATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="primary"
            onClick={() => startPreview(selectedTemplate)}
            disabled={isLoading}
          >
            {isLoading ? "Generating…" : "Preview letter"}
          </Button>
        </div>
      </Card>

      {isOpen ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-primary/20 bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-primary/10 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-accent">
                  {templateMeta?.name ?? "Letter preview"}
                </p>
                <p className="text-xs text-accent/50">
                  {caseTitle} · {new Date().toLocaleDateString("en-GB")}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={closePreview}>
                Close
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              {previewBody ? (
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-accent/80">
                  {previewBody}
                </pre>
              ) : (
                <p className="text-sm text-accent/60">
                  Select a template to generate a preview.
                </p>
              )}
            </div>
            {templateMeta?.description ? (
              <div className="border-t border-primary/10 px-6 py-3 text-xs text-accent/50">
                {templateMeta.description}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}


