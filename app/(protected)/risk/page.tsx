import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { RiskList } from "@/components/risk/RiskList";

export default async function RiskPage() {
  await requireRole(["owner", "solicitor", "paralegal"]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-accent">Risk radar</h1>
        <p className="mt-2 max-w-2xl text-sm text-accent/60">
          CaseBrain scans documents, letters, and briefings for urgent risk indicators so your team
          can act fast and stay compliant.
        </p>
      </header>
      <Card title="Open alerts" description="Investigate and resolve risk signals detected by CaseBrain.">
        <RiskList />
      </Card>
    </div>
  );
}

