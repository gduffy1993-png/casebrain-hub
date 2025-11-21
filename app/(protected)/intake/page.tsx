"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { Search, Plus, Link as LinkIcon } from "lucide-react";

type UnprocessedDocument = {
  id: string;
  name: string;
  type: string | null;
  created_at: string;
  extracted_json: unknown;
};

type CaseOption = {
  id: string;
  title: string;
};

export default function IntakePage() {
  const [documents, setDocuments] = useState<UnprocessedDocument[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const pushToast = useToast((state) => state.push);

  useEffect(() => {
    fetchDocuments();
    fetchCases();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/intake/documents");
      if (!response.ok) throw new Error("Failed to load documents");
      const data = await response.json();
      setDocuments(data.documents ?? []);
    } catch (error) {
      pushToast("Failed to load unprocessed documents.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const response = await fetch("/api/cases");
      if (!response.ok) return;
      const data = await response.json();
      setCases(data.cases ?? []);
    } catch {
      // Ignore errors
    }
  };

  const handleCreateCase = async (documentId: string) => {
    setProcessing(documentId);
    try {
      const response = await fetch("/api/intake/create-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to create case");
      }

      const data = await response.json();
      pushToast("Case created successfully.");
      router.push(`/cases/${data.caseId}`);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Failed to create case.",
      );
    } finally {
      setProcessing(null);
      fetchDocuments();
    }
  };

  const handleAttachToCase = async (documentId: string, caseId: string) => {
    setProcessing(documentId);
    try {
      const response = await fetch("/api/intake/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, caseId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to attach document");
      }

      pushToast("Document attached to case.");
      fetchDocuments();
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Failed to attach document.",
      );
    } finally {
      setProcessing(null);
    }
  };

  const getDocumentLabel = (doc: UnprocessedDocument): string => {
    const extracted = doc.extracted_json as
      | { claimType?: string; summary?: string }
      | null
      | undefined;
    if (extracted?.claimType) {
      return extracted.claimType;
    }
    if (doc.name.toLowerCase().includes("med")) {
      return "Med report";
    }
    if (doc.name.toLowerCase().includes("letter")) {
      return "Letter before action";
    }
    return "Document";
  };

  const filteredDocuments = documents.filter((doc) =>
    searchTerm
      ? doc.name.toLowerCase().includes(searchTerm.toLowerCase())
      : true,
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-accent">Intake Inbox</h1>
        <p className="text-sm text-accent/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">Intake Inbox</h1>
        <p className="text-sm text-accent/60">
          Process new documents into cases or attach them to existing cases.
        </p>
      </header>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent/40" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-primary/20 bg-white px-10 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <Card>
        {filteredDocuments.length > 0 ? (
          <div className="divide-y divide-primary/10">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="grid gap-4 p-5 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-accent">
                      {doc.name}
                    </h3>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                      {getDocumentLabel(doc)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-accent/50">
                    Uploaded: {new Date(doc.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCreateCase(doc.id)}
                    disabled={processing === doc.id}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {processing === doc.id ? "Creating..." : "Create case"}
                  </Button>
                  {cases.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAttachToCase(doc.id, e.target.value);
                        }
                      }}
                      disabled={processing === doc.id}
                      className="rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Attach to case...</option>
                      {cases.map((caseOption) => (
                        <option key={caseOption.id} value={caseOption.id}>
                          {caseOption.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-accent/60">
              {searchTerm
                ? "No documents match your search."
                : "No unprocessed documents found. All documents are attached to cases."}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

