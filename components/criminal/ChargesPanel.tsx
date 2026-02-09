"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** In normal mode: show "Source: X" from [AUTO_EXTRACTED] details; hide confidence. With ?debug=1 show raw. */
function formatChargeDetails(details: string | null, debug: boolean): string | null {
  if (!details) return null;
  if (debug) return details;
  const autoMatch = details.match(/\[AUTO_EXTRACTED\]\s*source=([^;]+)/i);
  if (autoMatch) return `Source: ${autoMatch[1].trim()}`;
  return null; // hide other raw technical lines in normal mode
}

type Charge = {
  id: string;
  offence: string;
  section: string | null;
  chargeDate: string | null;
  location: string | null;
  value: number | null;
  details: string | null;
  status: string;
  extracted?: boolean;
  confidence?: number | null;
  aliases?: string[]; // Alternative offence names for same charge
};

type ChargesPanelProps = {
  caseId: string;
};

export function ChargesPanel({ caseId }: ChargesPanelProps) {
  const searchParams = useSearchParams();
  const debug = searchParams.get("debug") === "1";
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [detectedCharges, setDetectedCharges] = useState<string[]>([]);
  const [hasChargeSheet, setHasChargeSheet] = useState<boolean>(false);

  useEffect(() => {
    async function fetchCharges() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/charges`);
        if (res.ok) {
          const result = await res.json();
          // Handle ApiResponse format: { ok: true, data: { charges: [...] } }
          // or legacy format: { charges: [...] }
          const chargesData: Charge[] = result.data?.charges || result.charges || [];

          // Dedupe by offence + section, prefer first (assume highest confidence order)
          // Also build aliases map for alternative offence names (e.g., s18 vs s20)
          const dedupedMap = new Map<string, Charge>();
          const aliasesMap = new Map<string, string[]>();
          
          chargesData.forEach((c) => {
            // Normalize section to a single s+number for dedupe (s18, s.18, section 18, s.18 OAPA 1861 -> s18)
            const normalizeSection = (s: string | null): string => {
              if (!s) return "";
              const t = s.replace(/^section\s+/i, "").replace(/^s\.?\s*/i, "s").toLowerCase().trim();
              const numMatch = t.match(/s(\d+)/);
              return numMatch ? `s${numMatch[1]}` : t;
            };
            
            // Normalize offence name - strip "Alt:" variants and clean up
            const normalizeOffence = (off: string | null): string => {
              if (!off) return "";
              // Remove "Alt:" prefix and clean
              return off.replace(/^alt:\s*/i, "").replace(/\(alt:.*?\)/gi, "").trim();
            };
            
            // Extract alternate section from offence if present (e.g., "s18 (Alt: s.20)")
            const extractAltSection = (off: string | null): string | null => {
              if (!off) return null;
              const altMatch = off.match(/\(alt:\s*(s\.?\d+|section\s+\d+)\)/i);
              if (altMatch) {
                return normalizeSection(altMatch[1]);
              }
              return null;
            };
            
            const normalizedOffence = normalizeOffence(c.offence);
            const normalizedSection = normalizeSection(c.section);
            const altSection = extractAltSection(c.offence);
            
            // Use normalized offence + section as key (e.g., "OAPA1861:s18")
            // Normalize statute so s18/s20 from different docs merge into one row per section
            const offenceLower = (c.offence || "").toLowerCase();
            let statute = offenceLower.includes("offences against the person") || offenceLower.includes("oapa")
              ? "OAPA1861"
              : offenceLower.includes("theft")
                ? "TheftAct1968"
                : "";
            if (!statute && /^s(18|20)$/.test(normalizedSection) && (offenceLower.includes("gbh") || offenceLower.includes("wounding"))) {
              statute = "OAPA1861";
            }
            const key = `${statute || normalizedOffence}:${normalizedSection}`.toLowerCase().trim();
            
            if (!dedupedMap.has(key)) {
              // First occurrence - store it
              dedupedMap.set(key, c);
              // If there's an alt section in the offence name, add it as an alias
              if (altSection && altSection !== normalizedSection) {
                aliasesMap.set(key, [`Alt: s${altSection.replace(/^s/, "")}`]);
              }
            } else {
              // This is a duplicate - add to aliases
              const existing = dedupedMap.get(key)!;
              const existingAliases = aliasesMap.get(key) || [];
              
              // Add alternate section as alias if different
              if (altSection && altSection !== normalizedSection) {
                const altAlias = `Alt: s${altSection.replace(/^s/, "")}`;
                if (!existingAliases.includes(altAlias)) {
                  aliasesMap.set(key, [...existingAliases, altAlias]);
                }
              }
              
              // Add current offence as alias if different (after normalization)
              if (normalizedOffence && normalizedOffence !== normalizeOffence(existing.offence)) {
                if (!existingAliases.includes(normalizedOffence)) {
                  aliasesMap.set(key, [...existingAliases, normalizedOffence]);
                }
              }
            }
          });

          // Clean location junk text and add aliases
          const cleaned = Array.from(dedupedMap.entries()).map(([key, c]) => {
            const loc = c.location || "";
            const cleanedLocation = loc.includes("precision") && loc.toLowerCase().includes("not disclosed")
              ? "Not disclosed"
              : loc.replace(/precision\)\.?\s*Not disclosed/i, "Not disclosed");
            const aliases = aliasesMap.get(key) || [];
            return { 
              ...c, 
              location: cleanedLocation,
              aliases: aliases.filter(a => a !== c.offence), // Exclude primary offence from aliases
            };
          });

          setCharges(cleaned);
        }
      } catch (error) {
        console.error("Failed to fetch charges:", error);
      } finally {
        setLoading(false);
      }
    }
    
    async function checkDetectedCharges() {
      // Check key facts for detected charges in primaryIssues or causeOfAction
      // Also check if charge sheet/indictment exists in documents
      try {
        const [keyFactsRes, documentsRes] = await Promise.all([
          fetch(`/api/cases/${caseId}/key-facts`),
          fetch(`/api/cases/${caseId}/documents`).catch(() => null),
        ]);
        
        if (keyFactsRes.ok) {
          const result = await keyFactsRes.json();
          const keyFacts = result.data?.keyFacts || result.keyFacts;
          if (keyFacts) {
            const detected: string[] = [];
            // Check primaryIssues for charge mentions
            if (keyFacts.primaryIssues) {
              keyFacts.primaryIssues.forEach((issue: string) => {
                if (issue.includes("Charge:") || issue.includes("Offence:")) {
                  detected.push(issue);
                }
              });
            }
            // Check causeOfAction
            if (keyFacts.causeOfAction) {
              detected.push(keyFacts.causeOfAction);
            }
            setDetectedCharges(detected);
          }
        }
        
        // Check for charge sheet/indictment in documents
        if (documentsRes?.ok) {
          const docsData = await documentsRes.json();
          const documents = docsData.data?.documents || docsData.documents || [];
          const hasChargeSheetDoc = documents.some((doc: any) => {
            const name = (doc.name || "").toLowerCase();
            return name.includes("charge sheet") || 
                   name.includes("indictment") ||
                   name.includes("charges") && (name.includes("sheet") || name.includes("list"));
          });
          setHasChargeSheet(hasChargeSheetDoc);
        }
      } catch {
        // Silently fail - detection check is optional
      }
    }
    
    fetchCharges();
    checkDetectedCharges();
  }, [caseId]);

  if (loading) {
    return (
      <Card title="Charges" description="Loading charges..." className="animate-pulse">
        <div className="h-32 bg-muted/30 rounded-lg" />
      </Card>
    );
  }

  // Separate confirmed vs unconfirmed charges
  const confirmedCharges = charges.filter(c => {
    // A charge is confirmed if:
    // 1. It has confidence >= 0.75 AND hasChargeSheet is true
    // 2. OR it's not extracted (from DB, assumed confirmed)
    const isConfirmed = !c.extracted || (c.confidence != null && c.confidence >= 0.75 && hasChargeSheet);
    return isConfirmed;
  });
  
  const unconfirmedCharges = charges.filter(c => {
    const isUnconfirmed = c.extracted && (c.confidence == null || c.confidence < 0.75 || !hasChargeSheet);
    return isUnconfirmed;
  });

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span>Charges & Offences</span>
          {confirmedCharges.length > 0 && (
            <Badge variant="secondary">{confirmedCharges.length} confirmed</Badge>
          )}
          {unconfirmedCharges.length > 0 && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-400">
              {unconfirmedCharges.length} unconfirmed
            </Badge>
          )}
        </div>
      }
      description="Criminal charges and offences"
      action={
        <Button variant="outline" size="sm">
          <Plus className="h-3 w-3 mr-1" />
          Add Charge
        </Button>
      }
    >
      {charges.length === 0 ? (
        detectedCharges.length > 0 ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-semibold text-amber-400 mb-2">Detected charges (unconfirmed)</p>
              <div className="space-y-2">
                {detectedCharges.map((charge, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground">
                    {charge}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Charges detected in case documents but not yet confirmed in structured data.
              </p>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => {
                  // This would open the Add Charge UI - for now just a placeholder
                  // The actual implementation would depend on your Add Charge modal/dialog
                  console.log("Add charge clicked");
                }}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Charge
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No charges recorded</p>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {/* Confirmed Charges */}
          {confirmedCharges.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-accent/50 mb-2">Confirmed Charges</p>
              <div className="space-y-3">
                {confirmedCharges.map((charge) => (
                  <div key={charge.id} className="p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{charge.offence}</h4>
                          {charge.aliases && charge.aliases.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Also: {charge.aliases.join(", ")}
                            </Badge>
                          )}
                        </div>
                        {charge.section && (
                          <p className="text-xs text-muted-foreground mt-1">{charge.section}</p>
                        )}
                        {(() => {
                          const detailLine = formatChargeDetails(charge.details, debug);
                          return detailLine ? <p className="text-xs text-muted-foreground mt-1">{detailLine}</p> : null;
                        })()}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {charge.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {charge.chargeDate && (
                        <span>Date: {new Date(charge.chargeDate).toLocaleDateString()}</span>
                      )}
                      {charge.location && <span>Location: {charge.location}</span>}
                      {charge.value && <span>Value: £{charge.value.toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Unconfirmed (Extracted) Charges */}
          {unconfirmedCharges.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-400/70 mb-2">Unconfirmed (Extracted) Charges</p>
              <div className="space-y-3">
                {unconfirmedCharges.map((charge) => (
                  <div key={charge.id} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{charge.offence}</h4>
                          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                            UNCONFIRMED
                          </Badge>
                        </div>
                        {charge.section && (
                          <p className="text-xs text-muted-foreground mt-1">{charge.section}</p>
                        )}
                        {(() => {
                          const detailLine = formatChargeDetails(charge.details, debug);
                          return detailLine ? <p className="text-xs text-muted-foreground mt-1">{detailLine}</p> : null;
                        })()}
                        <p className="text-xs text-amber-400/80 mt-2">
                          Needs charge sheet/indictment
                          {debug && charge.confidence != null && charge.confidence < 0.75 && (
                            <span className="ml-1">
                              (Extraction confidence: {(charge.confidence * 100).toFixed(0)}%)
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {charge.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {charge.chargeDate && (
                        <span>Date: {new Date(charge.chargeDate).toLocaleDateString()}</span>
                      )}
                      {charge.location && <span>Location: {charge.location}</span>}
                      {charge.value && <span>Value: £{charge.value.toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

