import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { BUILTIN_PLAYBOOKS, runPlaybook } from "@/lib/playbooks";
import type { PlaybookDefinition } from "@/lib/playbooks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId, orgId } = await requireRole(["owner", "solicitor", "paralegal"]);
  const payload = (await request.json()) as {
    playbookId: string;
    caseId: string;
  };

  if (!payload.playbookId || !payload.caseId) {
    return NextResponse.json(
      { error: "playbookId and caseId required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const builtin = BUILTIN_PLAYBOOKS.find(
    (playbook) => playbook.key === payload.playbookId,
  );

  let playbook =
    builtin ??
    (await supabase
      .from("playbooks")
      .select("id, name, description, steps")
      .eq("id", payload.playbookId)
      .eq("org_id", orgId)
      .maybeSingle()).data;

  if (!playbook) {
    return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
  }

  const customPlaybook = builtin
    ? null
    : (playbook as {
        id: string;
        name: string;
        description?: string;
        steps: unknown;
      });

  const resolvedPlaybook: PlaybookDefinition =
    builtin ||
    ({
      key: "custom-" + customPlaybook!.id,
      name: customPlaybook!.name,
      description: customPlaybook!.description ?? "",
      steps: customPlaybook!.steps as any,
    } as PlaybookDefinition);

  const logs = await runPlaybook({
    playbook: resolvedPlaybook,
    caseId: payload.caseId,
    orgId,
    userId,
  });

  await supabase.from("playbook_runs").insert({
    playbook_id: builtin ? null : customPlaybook!.id,
    org_id: orgId,
    case_id: payload.caseId,
    status: "completed",
    logs,
    created_by: userId,
  });

  return NextResponse.json({ logs });
}

