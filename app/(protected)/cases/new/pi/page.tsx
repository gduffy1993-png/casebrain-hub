import { Suspense } from "react";
import { PiIntakeWizard } from "@/components/pi/PiIntakeWizard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAuthContext } from "@/lib/auth";

export default async function PiIntakePage() {
  await requireAuthContext();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-accent">PI / Clinical Neg intake</h1>
        <p className="text-sm text-accent/60">
          Capture incident details, generate a limitation helper, and seed protocol deadlines.
          This tool supports personal injury and clinical negligence matters. All outputs are
          internal helpers and do not replace qualified legal advice.
        </p>
      </header>

      <Card>
        <Suspense fallback={<Skeleton className="h-[480px] w-full" />}>
          <PiIntakeWizard />
        </Suspense>
      </Card>
    </div>
  );
}


