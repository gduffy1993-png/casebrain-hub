"use client";

import { PILOT_DEMO_UPLOAD_NOTICE } from "@/lib/pilot-mode";

export function PilotDemoUploadNotice({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-[11px] text-amber-900 bg-amber-50 border border-amber-200/80 rounded-md px-3 py-2 ${className}`}
      data-testid="pilot-demo-upload-notice"
    >
      {PILOT_DEMO_UPLOAD_NOTICE}
    </p>
  );
}
