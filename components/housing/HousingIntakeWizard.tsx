"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { IntakeConflictCheck } from "@/components/intake/IntakeConflictCheck";

type HousingIntakeWizardProps = {
  userId: string;
  orgId: string;
};

type FormData = {
  caseTitle: string;
  tenantName: string;
  tenantDob: string;
  tenantVulnerability: string[];
  propertyAddress: string;
  landlordName: string;
  landlordType: "private" | "social" | "council" | "";
  firstReportDate: string;
  defects: Array<{
    type: string;
    location: string;
    severity: string;
    firstReported: string;
  }>;
};

export function HousingIntakeWizard({ userId, orgId }: HousingIntakeWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasConflictBlock, setHasConflictBlock] = useState(false);
  const router = useRouter();
  const pushToast = useToast((state) => state.push);

  const [formData, setFormData] = useState<FormData>({
    caseTitle: "",
    tenantName: "",
    tenantDob: "",
    tenantVulnerability: [],
    propertyAddress: "",
    landlordName: "",
    landlordType: "",
    firstReportDate: "",
    defects: [],
  });

  const handleSubmit = useCallback(async () => {
    if (!formData.caseTitle || !formData.tenantName || !formData.propertyAddress) {
      pushToast("Please complete all required fields.", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/housing/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to create case");
      }

      const data = await response.json();
      pushToast("Housing disrepair case created successfully.", "success");
      router.push(`/cases/${data.caseId}`);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Failed to create housing case.",
      );
    } finally {
      setLoading(false);
    }
  }, [formData, router, pushToast]);

  return (
    <Card>
      <div className="space-y-6 p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-accent">Basic Information</h2>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
                Case Title *
              </label>
              <input
                type="text"
                value={formData.caseTitle}
                onChange={(e) => setFormData({ ...formData, caseTitle: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Smith v ABC Housing"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
                Tenant Name *
              </label>
              <input
                type="text"
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
                Property Address *
              </label>
              <textarea
                value={formData.propertyAddress}
                onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
                Landlord Name *
              </label>
              <input
                type="text"
                value={formData.landlordName}
                onChange={(e) => setFormData({ ...formData, landlordName: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
                Landlord Type *
              </label>
              <select
                value={formData.landlordType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    landlordType: e.target.value as FormData["landlordType"],
                  })
                }
                className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select...</option>
                <option value="private">Private</option>
                <option value="social">Social Housing</option>
                <option value="council">Council</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setStep(2)} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-accent">Tenant & Timeline</h2>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.tenantDob}
                onChange={(e) => setFormData({ ...formData, tenantDob: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
                Tenant Vulnerabilities
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {["elderly", "asthma", "mobility", "child", "pregnancy", "disability"].map(
                  (vuln) => (
                    <button
                      key={vuln}
                      type="button"
                      onClick={() => {
                        const current = formData.tenantVulnerability;
                        setFormData({
                          ...formData,
                          tenantVulnerability: current.includes(vuln)
                            ? current.filter((v) => v !== vuln)
                            : [...current, vuln],
                        });
                      }}
                      className={`rounded-full px-3 py-1 text-xs ${
                        formData.tenantVulnerability.includes(vuln)
                          ? "bg-primary text-white"
                          : "bg-surface-muted text-accent/70"
                      }`}
                    >
                      {vuln}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
                First Report Date *
              </label>
              <input
                type="date"
                value={formData.firstReportDate}
                onChange={(e) => setFormData({ ...formData, firstReportDate: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {/* Conflict Check */}
            {(formData.tenantName || formData.landlordName) && (
              <div className="mb-6">
                <IntakeConflictCheck
                  orgId={orgId}
                  clientName={formData.tenantName}
                  opponentName={formData.landlordName}
                  onConflictCheckComplete={(hasConflicts) => {
                    setHasConflictBlock(hasConflicts);
                  }}
                />
              </div>
            )}
            
            <h2 className="text-lg font-semibold text-accent">Property Defects</h2>
            <p className="text-sm text-accent/60">
              Add the main defects reported. You can add more after case creation.
            </p>
            <div className="space-y-3">
              {formData.defects.map((defect, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 rounded-2xl border border-primary/10 bg-surface-muted/70 p-4 sm:grid-cols-4"
                >
                  <select
                    value={defect.type}
                    onChange={(e) => {
                      const newDefects = [...formData.defects];
                      newDefects[idx].type = e.target.value;
                      setFormData({ ...formData, defects: newDefects });
                    }}
                    className="rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Type...</option>
                    <option value="damp">Damp</option>
                    <option value="mould">Mould</option>
                    <option value="leak">Leak</option>
                    <option value="structural">Structural</option>
                    <option value="heating">Heating</option>
                    <option value="electrical">Electrical</option>
                    <option value="infestation">Infestation</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Location"
                    value={defect.location}
                    onChange={(e) => {
                      const newDefects = [...formData.defects];
                      newDefects[idx].location = e.target.value;
                      setFormData({ ...formData, defects: newDefects });
                    }}
                    className="rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm"
                  />
                  <select
                    value={defect.severity}
                    onChange={(e) => {
                      const newDefects = [...formData.defects];
                      newDefects[idx].severity = e.target.value;
                      setFormData({ ...formData, defects: newDefects });
                    }}
                    className="rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Severity...</option>
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="critical">Critical</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={defect.firstReported}
                      onChange={(e) => {
                        const newDefects = [...formData.defects];
                        newDefects[idx].firstReported = e.target.value;
                        setFormData({ ...formData, defects: newDefects });
                      }}
                      className="flex-1 rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          defects: formData.defects.filter((_, i) => i !== idx),
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() => {
                  setFormData({
                    ...formData,
                    defects: [
                      ...formData.defects,
                      { type: "", location: "", severity: "", firstReported: "" },
                    ],
                  });
                }}
              >
                Add Defect
              </Button>
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={loading}
                className="gap-2"
              >
                {loading ? "Creating..." : "Create Case"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

