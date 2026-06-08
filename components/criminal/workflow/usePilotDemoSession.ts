"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { isPilotDemoUploadDisabled } from "@/lib/pilot-mode";

export function usePilotDemoSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!cancelled) {
          setUserId(user?.id ?? null);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const demoRestricted = ready && isPilotDemoUploadDisabled(userId);

  return {
    userId,
    ready,
    uploadDisabled: demoRestricted,
    recordPositionDisabled: demoRestricted,
  };
}
