import type { GroupedFailure } from "./types";
import { PROTECTED_FILES_NOTE } from "./issue-fingerprints";

export function generateFixPromptsByGroup(groups: GroupedFailure[]): string {
  const lines: string[] = [
    "# CaseBrain Auditor — fix prompts by issue group",
    "",
    "One shared fix per fingerprint. **Do not patch case-by-case.**",
    "",
    PROTECTED_FILES_NOTE,
    "",
  ];

  for (const g of groups.filter((x) => x.releaseBlocking || x.severity !== "LOW")) {
    lines.push(`## ISSUE GROUP: ${g.fingerprint}`);
    lines.push("");
    lines.push(`**Severity:** ${g.severity} | **Demo blocker:** ${g.demoBlocker ? "yes" : "no"}`);
    lines.push("");
    lines.push("### Affected cases");
    for (const c of g.affectedCases.slice(0, 20)) lines.push(`- ${c}`);
    if (g.affectedCount > g.affectedCases.length) {
      lines.push(`- … +${g.affectedCount - g.affectedCases.length} more occurrence(s)`);
    }
    lines.push("");
    lines.push("### Affected screens");
    for (const s of g.affectedScreens.slice(0, 15)) lines.push(`- ${s}`);
    lines.push("");
    lines.push("### Bad examples");
    if (g.examples.length === 0) lines.push("- _(none captured)_");
    else {
      for (const ex of g.examples) lines.push(`- **${ex.caseTitle}** / ${ex.screen}: \`${ex.badText}\``);
      if (g.affectedCount > g.examples.length) {
        lines.push(`- _+${g.affectedCount - g.examples.length} more with same fingerprint_`);
      }
    }
    lines.push("");
    lines.push("### Expected replacement principle");
    lines.push(g.expectedBehaviour);
    lines.push("");
    lines.push("### Fix instruction");
    lines.push(g.suggestedCursorFix);
    lines.push("");
    lines.push("### Acceptance checks");
    lines.push("- [ ] `npx tsx scripts/casebrain-auditor.ts --pack pilot-3 --user-role pilot-non-admin`");
    lines.push(`- [ ] Fingerprint \`${g.fingerprint}\` cleared for affected profiles`);
    lines.push("- [ ] No regression on Marcus / Kian / Leon");
    lines.push("- [ ] Release gate GREEN");
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
