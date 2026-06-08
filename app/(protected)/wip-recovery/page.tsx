import { requireAuthContext } from "@/lib/auth";
import { WipRecoveryDashboard } from "@/components/wip-recovery/WipRecoveryDashboard";

export default async function WipRecoveryPage() {
  await requireAuthContext();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <WipRecoveryDashboard />
    </div>
  );
}

