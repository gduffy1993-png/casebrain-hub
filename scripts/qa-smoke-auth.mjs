/**
 * Shared Supabase auth helpers for local QA smoke runners (artifacts/).
 * Never reset the main owner account unless SMOKE_RESET_PASSWORD=1.
 */
import { createClient } from "@supabase/supabase-js";

export const PROTECTED_OWNER_EMAILS = ["gduffy1993@gmail.com"];

export function smokePassword() {
  return process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
}

export function smokeResetAllowed(email) {
  if (process.env.SMOKE_RESET_PASSWORD !== "1") return false;
  const lower = email.toLowerCase();
  if (PROTECTED_OWNER_EMAILS.some((e) => e.toLowerCase() === lower)) return false;
  return true;
}

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function findUserByEmail(admin, email) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
    if (hit) return hit;
    if (data.users.length < 200) break;
    page++;
  }
  return null;
}

/** Set password only for dedicated smoke aliases when explicitly allowed. */
export async function ensureSmokeUserPassword(email) {
  if (!smokeResetAllowed(email)) return { skipped: true, reason: "protected_or_disabled" };
  const admin = createSupabaseAdmin();
  if (!admin) return { skipped: true, reason: "no_admin_client" };
  const existing = await findUserByEmail(admin, email);
  if (!existing) return { skipped: true, reason: "user_not_found" };
  await admin.auth.admin.updateUserById(existing.id, {
    password: smokePassword(),
    email_confirm: true,
  });
  return { skipped: false, userId: existing.id };
}
