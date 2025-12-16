import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { paywallGuard } from "@/lib/paywall/guard";
import { incrementUsage } from "@/lib/paywall/usage";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export const dynamic = "force-dynamic";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    // PAYWALL: exports are treated as an export feature (trial allows; expired blocks)
    const guard = await paywallGuard("export");
    if (!guard.allowed) return guard.response!;
    const paywallOrgId = guard.orgId!;

    const { orgId } = await requireAuthContext();
    const { caseId } = await params;

    const supabase = getSupabaseAdminClient();

    const { data: caseRecord } = await supabase
      .from("cases")
      .select("id, title, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const { data: version, error: versionError } = await supabase
      .from("case_analysis_versions")
      .select("version_number, created_at, summary, risk_rating, move_sequence")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) {
      console.error("[partner-brief] versionError:", versionError);
      return NextResponse.json({ error: "Failed to load latest analysis version" }, { status: 500 });
    }

    const ms = (version?.move_sequence ?? null) as any;

    const title = caseRecord.title ?? "Untitled Case";
    const practiceArea = caseRecord.practice_area ?? "criminal";
    const generatedAt = new Date().toISOString();

    const beast = ms?.criminalBeastMode;
    const moves: any[] = ms?.moveSequence ?? [];
    const observations: any[] = ms?.observations ?? [];

    const topMoves = moves.slice(0, 3);
    const topGaps = observations
      .filter((o) => o?.type === "EVIDENCE_GAP" && (o?.leveragePotential === "CRITICAL" || o?.leveragePotential === "HIGH"))
      .slice(0, 5);

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Partner Brief — ${escapeHtml(title)}</title>
    <style>
      :root { --fg:#111827; --muted:#6b7280; --border:#e5e7eb; --bg:#ffffff; }
      html, body { background: var(--bg); color: var(--fg); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
      .page { max-width: 900px; margin: 32px auto; padding: 0 16px; }
      h1 { font-size: 20px; margin: 0 0 6px; }
      h2 { font-size: 14px; margin: 18px 0 8px; }
      p, li { font-size: 12px; line-height: 1.4; }
      .meta { color: var(--muted); font-size: 12px; margin-bottom: 12px; }
      .box { border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin-top: 10px; }
      .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .pill { display: inline-block; padding: 2px 8px; border: 1px solid var(--border); border-radius: 999px; font-size: 11px; color: var(--muted); }
      @media print { .page { margin: 0; } a { color: inherit; text-decoration: none; } }
    </style>
  </head>
  <body>
    <div class="page">
      <h1>Partner Brief — ${escapeHtml(title)}</h1>
      <div class="meta">
        Practice area: <span class="pill">${escapeHtml(String(practiceArea))}</span>
        &nbsp;|&nbsp; Case ID: <span class="pill">${escapeHtml(caseId)}</span>
        &nbsp;|&nbsp; Analysis version: <span class="pill">v${escapeHtml(String(version?.version_number ?? "—"))}</span>
        &nbsp;|&nbsp; Generated: <span class="pill">${escapeHtml(generatedAt)}</span>
      </div>

      <div class="box">
        <h2>Current posture</h2>
        <p><strong>Summary:</strong> ${escapeHtml(String(version?.summary ?? "No analysis summary available."))}</p>
        <p><strong>Risk rating:</strong> ${escapeHtml(String(version?.risk_rating ?? "—"))}</p>
      </div>

      ${beast ? `
      <div class="box">
        <h2>Confidence & completeness</h2>
        <p>${escapeHtml(String(beast.confidenceAndCompletenessLine ?? ""))}</p>
        <p><strong>Completeness:</strong> ${escapeHtml(String(beast.bundleCompleteness?.completenessPercent ?? "—"))}% (${escapeHtml(String(beast.bundleCompleteness?.band ?? "—"))})</p>
        <p><strong>Charge stability:</strong> ${escapeHtml(String(beast.chargeStabilityIndex?.mostLikelyChargeToSurvive ?? "—"))} (${escapeHtml(String(beast.chargeStabilityIndex?.stabilityBand ?? "—"))})</p>
        <p><strong>PACE/CPIA integrity risk:</strong> ${escapeHtml(String(beast.proceduralIntegrity?.complianceRisk ?? "—"))}</p>
        <p><strong>Judge irritation risk:</strong> ${escapeHtml(String(beast.judgeIrritationMeter?.irritationRisk ?? "—"))}</p>
      </div>
      ` : `
      <div class="box">
        <h2>Violent Offences Beast Mode</h2>
        <p>No Beast Mode output found in this analysis version. Run analysis to generate it.</p>
      </div>`}

      <div class="cols">
        <div class="box">
          <h2>Top leverage points (evidence gaps)</h2>
          ${topGaps.length ? `<ul>${topGaps.map((g) => `<li>${escapeHtml(String(g.description ?? ""))}</li>`).join("")}</ul>` : `<p>No high-leverage evidence gaps found in this version.</p>`}
        </div>
        <div class="box">
          <h2>Next 3 procedural moves</h2>
          ${topMoves.length ? `<ol>${topMoves.map((m) => `<li><strong>${escapeHtml(String(m.action ?? ""))}</strong><br/><span style="color:var(--muted)">Evidence:</span> ${escapeHtml(String(m.evidenceRequested ?? ""))}<br/><span style="color:var(--muted)">Cost:</span> £${escapeHtml(String(m.cost ?? ""))}</li>`).join("")}</ol>` : `<p>No move sequence found.</p>`}
        </div>
      </div>

      ${beast?.advanced ? `
      <div class="box">
        <h2>Expert spend gate</h2>
        <p><strong>${beast.advanced.expertPrematurityGate?.allowExpert ? "OK to consider expert spend" : "Hold expert spend"}</strong>: ${escapeHtml(String(beast.advanced.expertPrematurityGate?.reason ?? ""))}</p>
      </div>

      <div class="box">
        <h2>If I were the judge</h2>
        <p>${escapeHtml(String(beast.advanced.ifIWereTheJudgeSummary ?? ""))}</p>
      </div>
      ` : ""}

      <div class="box">
        <p style="color:var(--muted)"><strong>Important:</strong> Decision support only. Not legal advice. Apply professional judgment and counsel’s view. No part of this output is a prediction or instruction to mislead, obstruct, or tamper with evidence.</p>
      </div>
    </div>
  </body>
</html>`;

    // PAYWALL: Increment export usage (best-effort)
    try {
      await incrementUsage({ orgId: paywallOrgId, feature: "export" });
    } catch (usageError) {
      console.error("[partner-brief] Failed to record export usage:", usageError);
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[partner-brief] Error:", error);
    return NextResponse.json({ error: "Failed to generate partner brief" }, { status: 500 });
  }
}


