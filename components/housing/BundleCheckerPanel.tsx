"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Download, CheckCircle2, XCircle } from "lucide-react";
import type { BundleScanRecord, BundleScanItemRecord } from "@/types/bundle-scan";

type BundleCheckerPanelProps = {
  caseId: string;
};

export function BundleCheckerPanel({ caseId }: BundleCheckerPanelProps) {
  const [scan, setScan] = useState<BundleScanRecord | null>(null);
  const [items, setItems] = useState<BundleScanItemRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const fetchScan = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bundle/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        setScan(data.scan);
        setItems(data.items ?? []);
      }
    } catch (error) {
      console.error("Failed to fetch bundle scan", error);
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const response = await fetch(`/api/bundle/scan/${caseId}`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setScan(data.scan);
        setItems(data.items ?? []);
      }
    } catch (error) {
      console.error("Failed to run bundle scan", error);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchScan();
  }, [caseId]);

  const severityColors = {
    critical: "border-danger/30 bg-danger/10",
    high: "border-danger/20 bg-danger/5",
    medium: "border-warning/20 bg-warning/5",
    low: "border-primary/10 bg-surface-muted/70",
  };

  const severityBadges = {
    critical: "danger" as const,
    high: "danger" as const,
    medium: "warning" as const,
    low: "secondary" as const,
  };

  const critical = items.filter((i) => i.severity === "critical");
  const high = items.filter((i) => i.severity === "high");
  const medium = items.filter((i) => i.severity === "medium");
  const low = items.filter((i) => i.severity === "low");

  return (
    <Card
      title="Bundle Checker"
      description="Automated risk scan of case bundle. Checks for missing documents, expired deadlines, and compliance issues."
      action={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchScan}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={runScan}
            disabled={scanning}
            className="gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            {scanning ? "Scanning..." : "Run Scan"}
          </Button>
        </div>
      }
    >
      {loading && !scan ? (
        <p className="text-sm text-accent/60">Loading bundle scan...</p>
      ) : scan ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-surface-muted/70 p-4">
            <div>
              <p className="text-sm font-semibold text-accent">Overall Risk</p>
              <p className="text-xs text-accent/60">
                {scan.total_issues} issue(s) detected
              </p>
            </div>
            <Badge variant={severityBadges[scan.overall_risk]} className="text-sm">
              {scan.overall_risk.toUpperCase()}
            </Badge>
          </div>

          {scan.summary && (
            <p className="text-xs text-accent/70 italic">{scan.summary}</p>
          )}

          <div className="space-y-4">
            {critical.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
                  Critical Issues ({critical.length})
                </p>
                <div className="space-y-2">
                  {critical.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-3 ${severityColors[item.severity]}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="h-4 w-4 text-danger" />
                            <p className="font-semibold text-accent text-sm">{item.title}</p>
                            <Badge variant={severityBadges[item.severity]} className="text-xs">
                              {item.severity.toUpperCase()}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-xs text-accent/80 mb-2">{item.description}</p>
                          )}
                          {item.recommendation && (
                            <div className="mt-2 border-t border-accent/10 pt-2">
                              <p className="text-xs font-medium text-accent/70 mb-1">
                                Recommendation:
                              </p>
                              <p className="text-xs text-accent/80">{item.recommendation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {high.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
                  High Priority ({high.length})
                </p>
                <div className="space-y-2">
                  {high.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-3 ${severityColors[item.severity]}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-danger" />
                            <p className="font-semibold text-accent text-sm">{item.title}</p>
                            <Badge variant={severityBadges[item.severity]} className="text-xs">
                              {item.severity.toUpperCase()}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-xs text-accent/80 mb-2">{item.description}</p>
                          )}
                          {item.recommendation && (
                            <p className="text-xs text-accent/70 italic">{item.recommendation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {medium.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-warning">
                  Medium Priority ({medium.length})
                </p>
                <div className="space-y-2">
                  {medium.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-3 ${severityColors[item.severity]}`}
                    >
                      <p className="font-semibold text-accent text-sm mb-1">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-accent/80">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {low.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent/50">
                  Low Priority ({low.length})
                </p>
                <div className="space-y-2">
                  {low.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-3 ${severityColors[item.severity]}`}
                    >
                      <p className="font-semibold text-accent text-sm mb-1">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-accent/80">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {items.length === 0 && (
              <div className="rounded-2xl border border-primary/20 bg-surface-muted/70 p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-semibold text-accent">No Issues Detected</p>
                <p className="text-xs text-accent/60 mt-1">
                  Bundle scan completed with no risks or missing items found.
                </p>
              </div>
            )}
          </div>

          <p className="text-[10px] text-accent/50 italic mt-4">
            Last scanned: {new Date(scan.scanned_at).toLocaleString("en-GB")}
          </p>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-accent/60 mb-4">
            No bundle scan found. Run a scan to check for risks and missing documents.
          </p>
          <Button variant="primary" size="sm" onClick={runScan} disabled={scanning}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            {scanning ? "Scanning..." : "Run First Scan"}
          </Button>
        </div>
      )}

      <p className="text-[10px] text-accent/50 italic mt-4">
        This is procedural guidance only and does not constitute legal advice. All findings should
        be verified by a qualified legal professional.
      </p>
    </Card>
  );
}

