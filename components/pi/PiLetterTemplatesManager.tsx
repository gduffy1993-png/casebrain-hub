"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/Toast";
import type { PiLetterTemplate } from "@/types";
import { PI_LETTER_PLACEHOLDERS } from "@/lib/pi/letters";

type TemplateRow = PiLetterTemplate & {
  scope: "org" | "global";
};

type FormState = {
  id: string | null;
  code: string;
  name: string;
  description: string;
  body: string;
  scope: "org" | "global" | "new";
};

const EMPTY_STATE: FormState = {
  id: null,
  code: "",
  name: "",
  description: "",
  body: "",
  scope: "new",
};

export function PiLetterTemplatesManager({
  templates,
  orgId,
}: {
  templates: TemplateRow[];
  orgId: string;
}) {
  const router = useRouter();
  const pushToast = useToast((state) => state.push);
  const [selectedId, setSelectedId] = useState<string | "new">(
    templates[0]?.id ?? "new",
  );
  const [formState, setFormState] = useState<FormState>(() => {
    if (templates[0]) {
      return toFormState(templates[0]);
    }
    return EMPTY_STATE;
  });
  const [isSaving, startTransition] = useTransition();

  const selectedTemplate = useMemo(() => {
    if (selectedId === "new") return null;
    return templates.find((template) => template.id === selectedId) ?? null;
  }, [selectedId, templates]);

  const isEditable =
    formState.scope === "new" || formState.scope === "org";

  useEffect(() => {
    if (selectedId === "new") {
      setFormState(EMPTY_STATE);
      return;
    }
    const template = templates.find((row) => row.id === selectedId);
    if (template) {
      setFormState(toFormState(template));
    }
  }, [selectedId, templates]);

  const handleChange = (key: keyof FormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    if (!formState.code.trim() || !formState.name.trim() || !formState.body.trim()) {
      pushToast("Please complete code, name and body.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          code: formState.code.trim(),
          name: formState.name.trim(),
          description: formState.description.trim() || null,
          body: formState.body,
        };

        const response = await fetch(
          formState.id
            ? `/api/pi/letter-templates/${formState.id}`
            : `/api/pi/letter-templates`,
          {
            method: formState.id ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              formState.id
                ? {
                    name: payload.name,
                    description: payload.description,
                    body: payload.body,
                  }
                : payload,
            ),
          },
        );

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error ?? "Unable to save template.");
        }

        pushToast(formState.id ? "Template updated." : "Template created.");
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save template.";
        pushToast(message);
      }
    });
  };

  const handleDelete = () => {
    if (!formState.id) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/pi/letter-templates/${formState.id}`, {
          method: "DELETE",
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error ?? "Unable to delete template.");
        }

        pushToast("Template deleted.");
        setSelectedId("new");
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to delete template.";
        pushToast(message);
      }
    });
  };

  const handleCreateFromGlobal = () => {
    if (!selectedTemplate) return;
    setSelectedId("new");
    setFormState({
      id: null,
      code: `${selectedTemplate.code}-${orgId.slice(0, 4)}`,
      name: `${selectedTemplate.name} (Local)`,
      description: selectedTemplate.description ?? "",
      body: selectedTemplate.body,
      scope: "new",
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="h-full">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-accent">Templates</h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSelectedId("new")}
            disabled={isSaving}
          >
            New template
          </Button>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-accent/70">
          {templates.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedId === template.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-primary/10 hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{template.name}</span>
                  <span className="text-xs uppercase tracking-wide text-accent/40">
                    {template.scope === "global" ? "Global" : "Org"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-accent/50">{template.code}</p>
              </button>
            </li>
          ))}
          {!templates.length && (
            <li className="rounded-2xl border border-dashed border-primary/20 px-4 py-3 text-xs text-accent/50">
              No templates yet. Create your first PI template to get started.
            </li>
          )}
        </ul>
      </Card>

      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-accent">
                {formState.scope === "new"
                  ? "New PI template"
                  : selectedTemplate?.name ?? "PI template"}
              </h2>
              <p className="text-xs text-accent/50">
                {formState.scope === "new"
                  ? "Define a new personal injury letter template for your organisation."
                  : selectedTemplate?.scope === "global"
                    ? "Global template – duplicate to customise for your organisation."
                    : "Organisation template – update copy and placeholders as needed."}
              </p>
            </div>
            {selectedTemplate?.scope === "global" ? (
              <Button
                size="sm"
                variant="primary"
                onClick={handleCreateFromGlobal}
                disabled={isSaving}
              >
                Create org version
              </Button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4">
            <InputField
              label="Template code"
              value={formState.code}
              onChange={(value) => handleChange("code", value)}
              disabled={formState.scope !== "new"}
              placeholder="pi-initial-letter"
            />
            <InputField
              label="Template name"
              value={formState.name}
              onChange={(value) => handleChange("name", value)}
              disabled={!isEditable}
              placeholder="Initial engagement letter"
            />
            <TextareaField
              label="Description"
              value={formState.description}
              onChange={(value) => handleChange("description", value)}
              disabled={!isEditable}
              rows={2}
            />
            <TextareaField
              label="Body"
              value={formState.body}
              onChange={(value) => handleChange("body", value)}
              disabled={!isEditable}
              rows={16}
              description="Use placeholders with double braces, e.g. {{client_name}}."
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {isEditable ? (
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {formState.id ? "Save changes" : "Create template"}
              </Button>
            ) : null}
            {formState.id && formState.scope === "org" ? (
              <Button
                variant="secondary"
                onClick={handleDelete}
                disabled={isSaving}
              >
                Delete template
              </Button>
            ) : null}
          </div>
        </Card>

        <Card title="Available placeholders" description="Use these tokens inside your template body. They will be replaced automatically.">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {PI_LETTER_PLACEHOLDERS.map((placeholder) => (
              <div
                key={placeholder.token}
                className="rounded-2xl border border-primary/10 bg-surface-muted/60 p-3"
              >
                <p className="text-xs font-semibold text-accent">
                  <code className="rounded bg-primary/10 px-1 py-[2px] text-primary">
                    {`{{${placeholder.token}}}`}
                  </code>
                </p>
                <p className="mt-1 text-xs text-accent/60">{placeholder.description}</p>
                {placeholder.sample ? (
                  <p className="mt-1 text-[11px] text-accent/40">
                    Example: {placeholder.sample}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2 text-sm text-accent">
      <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-surface-muted/60"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  disabled,
  rows = 6,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
  description?: string;
}) {
  return (
    <label className="space-y-2 text-sm text-accent">
      <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={rows}
        className="w-full rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-surface-muted/60"
      />
      {description ? (
        <p className="text-xs text-accent/40">{description}</p>
      ) : null}
    </label>
  );
}

function toFormState(template: TemplateRow): FormState {
  return {
    id: template.id,
    code: template.code,
    name: template.name,
    description: template.description ?? "",
    body: template.body,
    scope: template.scope,
  };
}


