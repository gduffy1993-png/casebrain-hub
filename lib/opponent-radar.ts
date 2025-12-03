/**
 * Opponent Activity Radar (V1)
 * 
 * Tracks opponent response patterns based on available data:
 * - Letters sent to opponent
 * - Documents received (inferred as opponent replies)
 * - Correspondence tracking
 * 
 * V1 is simple and derived - no complex logging systems.
 * TODO: Hook into proper correspondence table when available
 * TODO: Add explicit "opponent replied" event tracking
 * TODO: Build global opponent intelligence view
 */

import { getSupabaseAdminClient } from "./supabase";
import type { OpponentActivitySnapshot, OpponentActivityStatus } from "./types/casebrain";

/**
 * Build opponent activity snapshot for a case
 */
export async function buildOpponentActivitySnapshot(
  caseId: string,
  orgId: string,
): Promise<OpponentActivitySnapshot> {
  const supabase = getSupabaseAdminClient();
  const now = new Date();

  // Verify case access
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, title, opponent_last_contact_at, opponent_avg_response_days")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .single();

  if (!caseData) {
    throw new Error("Case not found");
  }

  // Get letters sent (proxy for outgoing to opponent)
  const { data: letters } = await supabase
    .from("letters")
    .select("id, created_at, template_id")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  // Get documents that might be opponent replies
  // (e.g., documents with certain keywords in name)
  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  // Infer opponent replies from document names
  const replyKeywords = [
    "response", "reply", "defence", "acknowledgment", "acknowledgement",
    "defendant", "opponent", "insurer", "landlord response", "from defendant",
    "their letter", "received from"
  ];

  const opponentDocs = (documents ?? []).filter(doc => {
    const nameLower = doc.name.toLowerCase();
    return replyKeywords.some(keyword => nameLower.includes(keyword));
  });

  // Find last letter sent
  const lastLetterSent = letters?.[0];
  const lastLetterSentAt = lastLetterSent?.created_at;

  // Find last chaser (letters with "chase" or "follow" in template)
  const chasers = (letters ?? []).filter(l => {
    const template = (l.template_id ?? "").toLowerCase();
    return template.includes("chase") || template.includes("follow") || template.includes("reminder");
  });
  const lastChaseSentAt = chasers[0]?.created_at;

  // Find last opponent reply
  const lastOpponentReply = opponentDocs[0];
  const lastOpponentReplyAt = lastOpponentReply?.created_at;

  // Calculate days since last contact
  let daysSinceLastContact = 0;
  let currentSilenceDays = 0;

  if (lastLetterSentAt) {
    daysSinceLastContact = Math.floor(
      (now.getTime() - new Date(lastLetterSentAt).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  if (lastLetterSentAt && !lastOpponentReplyAt) {
    // We sent something, no reply detected
    currentSilenceDays = daysSinceLastContact;
  } else if (lastLetterSentAt && lastOpponentReplyAt) {
    // Check if reply came after our letter
    const letterDate = new Date(lastLetterSentAt);
    const replyDate = new Date(lastOpponentReplyAt);
    if (replyDate < letterDate) {
      // Reply was before our last letter - they haven't responded to latest
      currentSilenceDays = daysSinceLastContact;
    } else {
      currentSilenceDays = 0;
    }
  }

  // Calculate approximate average response time
  // (Very rough - based on gaps between our letters and their replies)
  let averageResponseDays: number | undefined;
  
  if (opponentDocs.length > 0 && letters && letters.length > 0) {
    // Simple heuristic: average days between letter and next opponent doc
    const responseTimes: number[] = [];
    
    for (const letter of letters.slice(0, 5)) {
      const letterDate = new Date(letter.created_at);
      // Find first opponent doc after this letter
      const nextReply = opponentDocs.find(doc => 
        new Date(doc.created_at) > letterDate
      );
      if (nextReply) {
        const days = Math.floor(
          (new Date(nextReply.created_at).getTime() - letterDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (days > 0 && days < 180) { // Ignore outliers
          responseTimes.push(days);
        }
      }
    }

    if (responseTimes.length > 0) {
      averageResponseDays = Math.round(
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      );
    }
  }

  // Use cached average if available and we couldn't calculate
  if (averageResponseDays === undefined && caseData.opponent_avg_response_days) {
    averageResponseDays = caseData.opponent_avg_response_days;
  }

  // Determine status
  let status: OpponentActivityStatus;
  let statusMessage: string;

  if (!lastLetterSentAt) {
    status = "NO_DATA";
    statusMessage = "No outgoing correspondence recorded";
  } else if (currentSilenceDays === 0) {
    status = "NORMAL";
    statusMessage = "Opponent has responded to latest correspondence";
  } else if (averageResponseDays && currentSilenceDays > averageResponseDays * 1.5) {
    status = "CONCERNING_SILENCE";
    statusMessage = `No response for ${currentSilenceDays} days (usually responds in ~${averageResponseDays} days)`;
  } else if (currentSilenceDays > 28) {
    status = "SLOWER_THAN_USUAL";
    statusMessage = `Awaiting response for ${currentSilenceDays} days`;
  } else if (currentSilenceDays > 14) {
    status = "SLOWER_THAN_USUAL";
    statusMessage = `Response pending (${currentSilenceDays} days since last letter)`;
  } else {
    status = "NORMAL";
    statusMessage = `Response expected within standard timeframe`;
  }

  return {
    caseId,
    lastLetterSentAt,
    lastChaseSentAt,
    lastOpponentReplyAt,
    daysSinceLastContact,
    averageResponseDays,
    currentSilenceDays,
    status,
    statusMessage,
    generatedAt: now.toISOString(),
  };
}

