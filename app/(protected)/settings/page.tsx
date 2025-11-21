import { requireRole, getOrgMembers } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { NotificationSettingsForm } from "@/components/settings/NotificationSettingsForm";
import { FirmSettingsForm } from "@/components/settings/FirmSettingsForm";

const labsEnabled = process.env.NEXT_PUBLIC_ENABLE_LABS === "true";

export default async function SettingsPage() {
  const { orgId } = await requireRole(["owner"]);
  const members = await getOrgMembers(orgId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">
          Organisation settings
        </h1>
        <p className="text-sm text-accent/60">
          Manage access, notifications, and firm details for your organisation.
        </p>
      </header>
      <Card
        title="Firm settings"
        description="Configure your firm name, address, and default sign-off for letters and bundles."
      >
        <FirmSettingsForm />
      </Card>
      {labsEnabled && (
        <>
          <Card title="Team members">
            <table className="min-w-full table-fixed text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-accent/50">
                  <th className="pb-2">User</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="py-3 text-accent">
                      {member.id ?? "Unknown user"}
                    </td>
                    <td className="py-3 text-accent/70">{member.email}</td>
                    <td className="py-3 text-accent/70">{member.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card
            title="Automation notifications"
            description="Set Slack/Teams webhooks and calendar email for deadline reminders."
          >
            <NotificationSettingsForm />
          </Card>
        </>
      )}
    </div>
  );
}
