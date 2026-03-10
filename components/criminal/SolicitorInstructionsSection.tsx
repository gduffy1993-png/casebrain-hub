"use client";

/**
 * Phase 5: Solicitor correction / instructions
 * Record "I disagree with this assessment" or "Client instructions: …" so strategy can respect them.
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type SolicitorInstructionsSectionProps = {
  caseId: string;
  /** Current value from snapshot (strategy.solicitorInstructions). */
  initialValue: string | null | undefined;
  onSave?: () => void;
};

export function SolicitorInstructionsSection({
  caseId,
  initialValue,
  onSave,
}: SolicitorInstructionsSectionProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(initialValue ?? "");
  }, [initialValue]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/criminal/${caseId}/strategy-notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ strategy_notes: value.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      onSave?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const unchanged = (value ?? "") === (initialValue ?? "");

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">Solicitor instructions / overrides</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Record client instructions or disagreements with the assessment so strategy can respect them (e.g. &quot;I disagree with this assessment&quot;, &quot;Client instructions: …&quot;).
      </p>
      <Textarea
        placeholder="e.g. Client instructions: do not run self-defence. I disagree with the strength of the ID evidence."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-[80px] text-sm resize-y"
        maxLength={10000}
      />
      <div className="mt-2 flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSave}
          disabled={saving || unchanged}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        {saved && <span className="text-xs text-muted-foreground">Saved.</span>}
      </div>
    </Card>
  );
}
