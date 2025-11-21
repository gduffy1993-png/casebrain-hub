"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import type { PiCaseRecord } from "@/types";

type OicMedcoPanelProps = {
  caseId: string;
  piCase: PiCaseRecord | null;
  onUpdate?: () => void;
};

export function OicMedcoPanel({
  caseId,
  piCase: initialPiCase,
  onUpdate,
}: OicMedcoPanelProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [piCase, setPiCase] = useState<PiCaseRecord | null>(initialPiCase);
  const router = useRouter();
  const pushToast = useToast((state) => state.push);

  useEffect(() => {
    setPiCase(initialPiCase);
  }, [initialPiCase]);

  const [formData, setFormData] = useState({
    oicTrack: piCase?.oic_track ?? "",
    injurySummary: piCase?.injury_summary ?? "",
    whiplashTariffBand: piCase?.whiplash_tariff_band ?? "",
    prognosisMonthsMin: piCase?.prognosis_months_min ?? "",
    prognosisMonthsMax: piCase?.prognosis_months_max ?? "",
    psychInjury: piCase?.psych_injury ?? false,
    treatmentRecommended: piCase?.treatment_recommended ?? "",
    medcoReference: piCase?.medco_reference ?? "",
    liabilityStance: piCase?.liability_stance ?? "",
  });

  const hasData =
    formData.oicTrack ||
    formData.injurySummary ||
    formData.whiplashTariffBand ||
    formData.prognosisMonthsMin ||
    formData.prognosisMonthsMax ||
    formData.treatmentRecommended ||
    formData.medcoReference ||
    formData.liabilityStance;

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/pi/cases/${caseId}/oic-medco`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oicTrack: formData.oicTrack || null,
          injurySummary: formData.injurySummary || null,
          whiplashTariffBand: formData.whiplashTariffBand || null,
          prognosisMonthsMin: formData.prognosisMonthsMin
            ? parseInt(formData.prognosisMonthsMin as string, 10)
            : null,
          prognosisMonthsMax: formData.prognosisMonthsMax
            ? parseInt(formData.prognosisMonthsMax as string, 10)
            : null,
          psychInjury: formData.psychInjury,
          treatmentRecommended: formData.treatmentRecommended || null,
          medcoReference: formData.medcoReference || null,
          liabilityStance: formData.liabilityStance || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to save");
      }

      pushToast("OIC/MedCo data saved.");
      setEditing(false);
      router.refresh();
      onUpdate?.();
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Failed to save OIC/MedCo data.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!hasData && !editing) {
    return (
      <Card title="OIC / MedCo Summary">
        <p className="text-sm text-accent/60">
          We couldn't confidently extract OIC/MedCo data from the last document –
          you can enter it manually.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => setEditing(true)}
        >
          Add OIC/MedCo data
        </Button>
      </Card>
    );
  }

  return (
    <Card
      title="OIC / MedCo Summary"
      action={
        editing ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditing(false);
                setFormData({
                  oicTrack: piCase?.oic_track ?? "",
                  injurySummary: piCase?.injury_summary ?? "",
                  whiplashTariffBand: piCase?.whiplash_tariff_band ?? "",
                  prognosisMonthsMin: piCase?.prognosis_months_min ?? "",
                  prognosisMonthsMax: piCase?.prognosis_months_max ?? "",
                  psychInjury: piCase?.psych_injury ?? false,
                  treatmentRecommended: piCase?.treatment_recommended ?? "",
                  medcoReference: piCase?.medco_reference ?? "",
                  liabilityStance: piCase?.liability_stance ?? "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )
      }
    >
      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
              Track
            </label>
            <select
              value={formData.oicTrack}
              onChange={(e) =>
                setFormData({ ...formData, oicTrack: e.target.value })
              }
              className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Not specified</option>
              <option value="OIC">OIC</option>
              <option value="MOJ">MOJ</option>
              <option value="Litigated">Litigated</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
              Injury summary
            </label>
            <textarea
              value={formData.injurySummary}
              onChange={(e) =>
                setFormData({ ...formData, injurySummary: e.target.value })
              }
              rows={3}
              className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
              Whiplash tariff band
            </label>
            <input
              type="text"
              value={formData.whiplashTariffBand}
              onChange={(e) =>
                setFormData({ ...formData, whiplashTariffBand: e.target.value })
              }
              placeholder="e.g. 0-3 months"
              className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
                Prognosis min (months)
              </label>
              <input
                type="number"
                value={formData.prognosisMonthsMin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    prognosisMonthsMin: e.target.value,
                  })
                }
                className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
                Prognosis max (months)
              </label>
              <input
                type="number"
                value={formData.prognosisMonthsMax}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    prognosisMonthsMax: e.target.value,
                  })
                }
                className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent/50">
              <input
                type="checkbox"
                checked={formData.psychInjury}
                onChange={(e) =>
                  setFormData({ ...formData, psychInjury: e.target.checked })
                }
                className="rounded border-primary/20"
              />
              Psychological injury
            </label>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
              Treatment recommended
            </label>
            <input
              type="text"
              value={formData.treatmentRecommended}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  treatmentRecommended: e.target.value,
                })
              }
              placeholder="e.g. Physio 6 sessions"
              className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
              MedCo reference
            </label>
            <input
              type="text"
              value={formData.medcoReference}
              onChange={(e) =>
                setFormData({ ...formData, medcoReference: e.target.value })
              }
              className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
              Liability stance
            </label>
            <select
              value={formData.liabilityStance}
              onChange={(e) =>
                setFormData({ ...formData, liabilityStance: e.target.value })
              }
              className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Not specified</option>
              <option value="admitted">Admitted</option>
              <option value="denied">Denied</option>
              <option value="partial">Partial</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.injurySummary && (
            <div>
              <p className="text-xs uppercase tracking-wide text-accent/50">
                Injury summary
              </p>
              <p className="mt-2 text-sm text-accent/70">{formData.injurySummary}</p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {formData.oicTrack && (
              <div>
                <p className="text-xs uppercase tracking-wide text-accent/50">Track</p>
                <p className="mt-2 text-sm font-semibold text-accent">
                  {formData.oicTrack}
                </p>
              </div>
            )}
            {formData.whiplashTariffBand && (
              <div>
                <p className="text-xs uppercase tracking-wide text-accent/50">
                  Whiplash tariff band
                </p>
                <p className="mt-2 text-sm font-semibold text-accent">
                  {formData.whiplashTariffBand}
                </p>
              </div>
            )}
            {(formData.prognosisMonthsMin || formData.prognosisMonthsMax) && (
              <div>
                <p className="text-xs uppercase tracking-wide text-accent/50">
                  Prognosis range
                </p>
                <p className="mt-2 text-sm font-semibold text-accent">
                  {formData.prognosisMonthsMin || "?"}–
                  {formData.prognosisMonthsMax || "?"} months
                </p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-accent/50">
                Psychological injury
              </p>
              <p className="mt-2 text-sm font-semibold text-accent">
                {formData.psychInjury ? "Yes" : "No"}
              </p>
            </div>
            {formData.treatmentRecommended && (
              <div>
                <p className="text-xs uppercase tracking-wide text-accent/50">
                  Treatment recommended
                </p>
                <p className="mt-2 text-sm font-semibold text-accent">
                  {formData.treatmentRecommended}
                </p>
              </div>
            )}
            {formData.medcoReference && (
              <div>
                <p className="text-xs uppercase tracking-wide text-accent/50">
                  MedCo reference
                </p>
                <p className="mt-2 text-sm font-semibold text-accent">
                  {formData.medcoReference}
                </p>
              </div>
            )}
            {formData.liabilityStance && (
              <div>
                <p className="text-xs uppercase tracking-wide text-accent/50">
                  Liability stance
                </p>
                <p className="mt-2 text-sm font-semibold text-accent">
                  {formData.liabilityStance.charAt(0).toUpperCase() +
                    formData.liabilityStance.slice(1)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

