import { requireAuthContext } from "@/lib/auth";
import { AuditLogClient } from "@/components/criminal/audit-log/AuditLogClient";

export default async function AuditLogPage() {
  await requireAuthContext();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <AuditLogClient />
    </div>
  );
}
