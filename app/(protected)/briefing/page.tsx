import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { DailyBriefingPanel } from "@/components/briefing/DailyBriefingPanel";

export default async function BriefingPage() {
  await requireUser();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-accent">
          Daily AI Briefing
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-accent/60">
          CaseBrain reviews today&apos;s activity—new documents, letters, and
          approaching deadlines—and recommends the next best actions.
        </p>
      </header>
      <Card>
        <DailyBriefingPanel />
      </Card>
    </div>
  );
}

