"use client";

import { useEffect, useState } from "react";
import type { UsageStatus } from "@/lib/paywall/usage";

/**
 * Hook to fetch and manage paywall status
 */
export function usePaywallStatus() {
  const [status, setStatus] = useState<UsageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch("/api/paywall/status");
        
        if (!response.ok) {
          throw new Error("Failed to fetch paywall status");
        }
        
        const data = await response.json();
        setStatus(data);
      } catch (err) {
        console.error("Failed to fetch paywall status:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/paywall/status");
      
      if (!response.ok) {
        throw new Error("Failed to fetch paywall status");
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error("Failed to fetch paywall status:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return {
    status,
    loading,
    error,
    refetch,
    // Convenience getters
    plan: status?.plan ?? "free",
    canUpload: status?.canUpload ?? false,
    canAnalyse: status?.canAnalyse ?? false,
    canExport: status?.canExport ?? false,
    uploadCount: status?.uploadCount ?? 0,
    analysisCount: status?.analysisCount ?? 0,
    exportCount: status?.exportCount ?? 0,
    uploadLimit: status?.uploadLimit ?? 3,
    analysisLimit: status?.analysisLimit ?? 5,
    exportLimit: status?.exportLimit ?? 1,
    uploadsRemaining: status ? Math.max(0, status.uploadLimit - status.uploadCount) : 0,
    analysesRemaining: status ? Math.max(0, status.analysisLimit - status.analysisCount) : 0,
    exportsRemaining: status ? Math.max(0, status.exportLimit - status.exportCount) : 0,
  };
}

