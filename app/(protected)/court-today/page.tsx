import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { CourtTodayClient } from "@/components/criminal/court-today/CourtTodayClient";

export default async function CourtTodayPage() {
  await requireUser();

  return (
    <Suspense fallback={null}>
      <CourtTodayClient />
    </Suspense>
  );
}
