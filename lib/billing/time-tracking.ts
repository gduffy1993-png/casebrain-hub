/**
 * Time Tracking System
 * 
 * Comprehensive time tracking with:
 * - Start/stop timer
 * - Manual time entry
 * - AI-suggested time
 * - Billing integration
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";

export type TimeEntry = {
  id: string;
  orgId: string;
  caseId: string | null;
  taskId: string | null;
  userId: string;
  description: string;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number | null;
  isBillable: boolean;
  isBilled: boolean;
  invoiceId: string | null;
  billingRateId: string | null;
  hourlyRate: number | null;
  totalAmount: number | null;
  activityType: 
    | "drafting"
    | "research"
    | "meeting"
    | "call"
    | "review"
    | "court"
    | "travel"
    | "general";
  practiceArea: string | null;
  status: "draft" | "submitted" | "approved" | "billed" | "written_off";
  approvedBy: string | null;
  approvedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTimeEntryInput = {
  caseId?: string;
  taskId?: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  isBillable?: boolean;
  activityType?: TimeEntry["activityType"];
  hourlyRate?: number;
  notes?: string;
};

export type UpdateTimeEntryInput = {
  description?: string;
  endTime?: Date;
  durationMinutes?: number;
  isBillable?: boolean;
  activityType?: TimeEntry["activityType"];
  hourlyRate?: number;
  notes?: string;
  status?: TimeEntry["status"];
};

/**
 * Get active timer for user (if any)
 */
export async function getActiveTimer(
  userId: string,
  orgId: string,
): Promise<TimeEntry | null> {
  const supabase = getSupabaseAdminClient();

  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .is("end_time", null)
    .eq("status", "draft")
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return mapTimeEntry(data);
}

/**
 * Start a timer
 */
export async function startTimer(
  userId: string,
  orgId: string,
  input: {
    caseId?: string;
    taskId?: string;
    description: string;
    activityType?: TimeEntry["activityType"];
  },
): Promise<TimeEntry> {
  const supabase = getSupabaseAdminClient();

  // Check if there's an active timer
  const activeTimer = await getActiveTimer(userId, orgId);
  if (activeTimer) {
    throw new Error("You already have an active timer. Stop it first.");
  }

  // Get user's billing rate
  const hourlyRate = await getUserBillingRate(userId, orgId, input.caseId);

  // Get case practice area if caseId provided
  let practiceArea: string | null = null;
  if (input.caseId) {
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("practice_area")
      .eq("id", input.caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    practiceArea = caseRecord?.practice_area ?? null;
  }

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      org_id: orgId,
      case_id: input.caseId ?? null,
      task_id: input.taskId ?? null,
      user_id: userId,
      description: input.description,
      start_time: new Date().toISOString(),
      end_time: null,
      is_billable: true,
      activity_type: input.activityType ?? "general",
      hourly_rate: hourlyRate,
      practice_area: practiceArea,
      status: "draft",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to start timer");
  }

  return mapTimeEntry(data);
}

/**
 * Stop active timer
 */
export async function stopTimer(
  userId: string,
  orgId: string,
  description?: string,
): Promise<TimeEntry> {
  const supabase = getSupabaseAdminClient();

  const activeTimer = await getActiveTimer(userId, orgId);
  if (!activeTimer) {
    throw new Error("No active timer found");
  }

  const endTime = new Date();
  const durationMinutes = Math.floor(
    (endTime.getTime() - activeTimer.startTime.getTime()) / (1000 * 60)
  );

  const updateData: any = {
    end_time: endTime.toISOString(),
    duration_minutes: durationMinutes,
    status: "submitted",
  };

  if (description) {
    updateData.description = description;
  }

  // Calculate total amount if hourly rate is set
  if (activeTimer.hourlyRate && durationMinutes > 0) {
    updateData.total_amount = (durationMinutes / 60) * activeTimer.hourlyRate;
  }

  const { data, error } = await supabase
    .from("time_entries")
    .update(updateData)
    .eq("id", activeTimer.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to stop timer");
  }

  return mapTimeEntry(data);
}

/**
 * Create manual time entry
 */
export async function createManualTimeEntry(
  userId: string,
  orgId: string,
  input: CreateTimeEntryInput,
): Promise<TimeEntry> {
  const supabase = getSupabaseAdminClient();

  // Get user's billing rate
  const hourlyRate = input.hourlyRate ?? (await getUserBillingRate(userId, orgId, input.caseId));

  // Get case practice area if caseId provided
  let practiceArea: string | null = null;
  if (input.caseId) {
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("practice_area")
      .eq("id", input.caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    practiceArea = caseRecord?.practice_area ?? null;
  }

  // Calculate duration if endTime provided
  let durationMinutes: number | null = null;
  if (input.endTime && input.startTime) {
    durationMinutes = Math.floor(
      (input.endTime.getTime() - input.startTime.getTime()) / (1000 * 60)
    );
  } else if (input.durationMinutes) {
    durationMinutes = input.durationMinutes;
  }

  // Calculate total amount
  let totalAmount: number | null = null;
  if (hourlyRate && durationMinutes && durationMinutes > 0) {
    totalAmount = (durationMinutes / 60) * hourlyRate;
  }

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      org_id: orgId,
      case_id: input.caseId ?? null,
      task_id: input.taskId ?? null,
      user_id: userId,
      description: input.description,
      start_time: input.startTime.toISOString(),
      end_time: input.endTime?.toISOString() ?? null,
      duration_minutes: durationMinutes,
      is_billable: input.isBillable ?? true,
      activity_type: input.activityType ?? "general",
      hourly_rate: hourlyRate,
      total_amount: totalAmount,
      practice_area: practiceArea,
      status: "submitted",
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to create time entry");
  }

  return mapTimeEntry(data);
}

/**
 * Get user's billing rate
 */
async function getUserBillingRate(
  userId: string,
  orgId: string,
  caseId?: string,
): Promise<number | null> {
  const supabase = getSupabaseAdminClient();

  // Get user's role
  const { data: user } = await supabase.auth.admin.getUserById(userId);
  const userRole = user?.user?.user_metadata?.role ?? "solicitor";

  // Get case practice area if caseId provided
  let practiceArea: string | null = null;
  if (caseId) {
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    practiceArea = caseRecord?.practice_area ?? null;
  }

  // Try to get user-specific rate first
  const { data: userRate } = await supabase
    .from("billing_rates")
    .select("hourly_rate")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (userRate) {
    return Number(userRate.hourly_rate);
  }

  // Try to get role-based rate
  const { data: roleRate } = await supabase
    .from("billing_rates")
    .select("hourly_rate")
    .eq("org_id", orgId)
    .eq("role", userRole)
    .is("user_id", null)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (roleRate) {
    return Number(roleRate.hourly_rate);
  }

  // Try to get practice area rate
  if (practiceArea) {
    const { data: practiceRate } = await supabase
      .from("billing_rates")
      .select("hourly_rate")
      .eq("org_id", orgId)
      .eq("practice_area", practiceArea)
      .is("user_id", null)
      .is("role", null)
      .is("effective_to", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (practiceRate) {
      return Number(practiceRate.hourly_rate);
    }
  }

  return null;
}

/**
 * Get time entries for case/user/date range
 */
export async function getTimeEntries(
  orgId: string,
  filters: {
    caseId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: TimeEntry["status"];
    isBillable?: boolean;
    isBilled?: boolean;
  },
): Promise<TimeEntry[]> {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("time_entries")
    .select("*")
    .eq("org_id", orgId);

  if (filters.caseId) {
    query = query.eq("case_id", filters.caseId);
  }

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters.startDate) {
    query = query.gte("start_time", filters.startDate.toISOString());
  }

  if (filters.endDate) {
    query = query.lte("start_time", filters.endDate.toISOString());
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.isBillable !== undefined) {
    query = query.eq("is_billable", filters.isBillable);
  }

  if (filters.isBilled !== undefined) {
    query = query.eq("is_billed", filters.isBilled);
  }

  query = query.order("start_time", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error("Failed to fetch time entries");
  }

  return (data ?? []).map(mapTimeEntry);
}

/**
 * Map database row to TimeEntry
 */
function mapTimeEntry(row: any): TimeEntry {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    taskId: row.task_id,
    userId: row.user_id,
    description: row.description,
    startTime: new Date(row.start_time),
    endTime: row.end_time ? new Date(row.end_time) : null,
    durationMinutes: row.duration_minutes,
    isBillable: row.is_billable,
    isBilled: row.is_billed,
    invoiceId: row.invoice_id,
    billingRateId: row.billing_rate_id,
    hourlyRate: row.hourly_rate ? Number(row.hourly_rate) : null,
    totalAmount: row.total_amount ? Number(row.total_amount) : null,
    activityType: row.activity_type,
    practiceArea: row.practice_area,
    status: row.status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at ? new Date(row.approved_at) : null,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

