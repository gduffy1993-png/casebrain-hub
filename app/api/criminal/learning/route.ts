import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { loadApprovedRules } from "@/lib/criminal/controlled-learning/store";
import { createLearningHandlers } from "@/lib/criminal/controlled-learning/handlers";
const handlers = createLearningHandlers({ authenticate: requireAuthContextApi,
  database: getSupabaseAdminClient, approvedRules: loadApprovedRules });
export const GET = handlers.GET;
export const POST = handlers.POST;
export const maxDuration = 60;
