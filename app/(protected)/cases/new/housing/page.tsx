import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { HousingIntakeWizard } from "@/components/housing/HousingIntakeWizard";

export default async function NewHousingCasePage() {
  const { userId, orgId } = await requireAuthContext();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">New Housing Disrepair Case</h1>
        <p className="mt-2 text-sm text-accent/60">
          Create a new housing disrepair / HRA case
        </p>
      </header>

      <HousingIntakeWizard userId={userId} orgId={orgId} />
    </div>
  );
}

