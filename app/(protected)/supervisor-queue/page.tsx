import { requireAuthContext } from "@/lib/auth";
import { SupervisorQueueClient } from "@/components/criminal/supervisor-queue/SupervisorQueueClient";

export default async function SupervisorQueuePage() {
  await requireAuthContext();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <SupervisorQueueClient />
    </div>
  );
}
