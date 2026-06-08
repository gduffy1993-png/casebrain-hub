/**
 * Custom Reports Builder
 * 
 * Build custom reports with drag-and-drop interface
 * Supports: cases, time, billing, communication, etc.
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";

export type ReportField = {
  id: string;
  name: string;
  type: "string" | "number" | "date" | "boolean" | "currency";
  source: "cases" | "time_entries" | "invoices" | "communication_events" | "documents";
  path: string; // JSON path to field
};

export type ReportFilter = {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in";
  value: any;
};

export type ReportGroupBy = {
  field: string;
  order: "asc" | "desc";
};

export type CustomReport = {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  dataSource: "cases" | "time_entries" | "invoices" | "communication_events" | "documents" | "custom";
  fields: ReportField[];
  filters: ReportFilter[];
  groupBy: ReportGroupBy[];
  chartType: "table" | "bar" | "line" | "pie" | "donut" | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ReportResult = {
  columns: Array<{ name: string; type: string }>;
  rows: Array<Record<string, any>>;
  summary: {
    totalRows: number;
    aggregations?: Record<string, number>;
  };
};

/**
 * Create custom report
 */
export async function createCustomReport(
  orgId: string,
  userId: string,
  input: {
    name: string;
    description?: string;
    dataSource: CustomReport["dataSource"];
    fields: ReportField[];
    filters?: ReportFilter[];
    groupBy?: ReportGroupBy[];
    chartType?: CustomReport["chartType"];
  },
): Promise<CustomReport> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("custom_reports")
    .insert({
      org_id: orgId,
      name: input.name,
      description: input.description ?? null,
      data_source: input.dataSource,
      fields: input.fields,
      filters: input.filters ?? [],
      group_by: input.groupBy ?? [],
      chart_type: input.chartType ?? null,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to create custom report");
  }

  return mapCustomReport(data);
}

/**
 * Execute custom report
 */
export async function executeCustomReport(
  reportId: string,
  orgId: string,
): Promise<ReportResult> {
  const supabase = getSupabaseAdminClient();

  // Get report definition
  const { data: report } = await supabase
    .from("custom_reports")
    .select("*")
    .eq("id", reportId)
    .eq("org_id", orgId)
    .single();

  if (!report) {
    throw new Error("Report not found");
  }

  // Build query based on data source
  let query: any;
  let columns: Array<{ name: string; type: string }> = [];

  switch (report.data_source) {
    case "cases":
      query = supabase.from("cases").select("*").eq("org_id", orgId);
      columns = [
        { name: "Title", type: "string" },
        { name: "Practice Area", type: "string" },
        { name: "Stage", type: "string" },
        { name: "Created At", type: "date" },
      ];
      break;

    case "time_entries":
      query = supabase.from("time_entries").select("*").eq("org_id", orgId);
      columns = [
        { name: "Description", type: "string" },
        { name: "Duration (minutes)", type: "number" },
        { name: "Total Amount", type: "currency" },
        { name: "Start Time", type: "date" },
      ];
      break;

    case "invoices":
      query = supabase.from("invoices").select("*").eq("org_id", orgId);
      columns = [
        { name: "Invoice Number", type: "string" },
        { name: "Total Amount", type: "currency" },
        { name: "Status", type: "string" },
        { name: "Invoice Date", type: "date" },
      ];
      break;

    case "communication_events":
      query = supabase
        .from("communication_events")
        .select("*")
        .eq("org_id", orgId);
      columns = [
        { name: "Type", type: "string" },
        { name: "Direction", type: "string" },
        { name: "Sent At", type: "date" },
      ];
      break;

    default:
      throw new Error("Unsupported data source");
  }

  // Apply filters
  if (report.filters && report.filters.length > 0) {
    for (const filter of report.filters) {
      // Apply filter logic (simplified)
      // In production, this would be more sophisticated
    }
  }

  // Execute query
  const { data, error } = await query;

  if (error) {
    throw new Error("Failed to execute report");
  }

  // Transform data based on selected fields
  const rows = (data ?? []).map((row: any) => {
    const transformed: Record<string, any> = {};
    for (const field of report.fields) {
      // Extract value from row based on field path
      transformed[field.name] = getNestedValue(row, field.path);
    }
    return transformed;
  });

  // Calculate aggregations
  const aggregations: Record<string, number> = {};
  for (const field of report.fields) {
    if (field.type === "number" || field.type === "currency") {
      const values = rows.map((r: Record<string, any>) => Number(r[field.name]) || 0);
      aggregations[`${field.name}_sum`] = values.reduce(
        (a: number, b: number) => a + b,
        0
      );
      aggregations[`${field.name}_avg`] =
        values.length > 0 ? aggregations[`${field.name}_sum`] / values.length : 0;
    }
  }

  return {
    columns: report.fields.map((f: ReportField) => ({ name: f.name, type: f.type })),
    rows,
    summary: {
      totalRows: rows.length,
      aggregations,
    },
  };
}

/**
 * Get nested value from object by path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Map database row to CustomReport
 */
function mapCustomReport(row: any): CustomReport {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    description: row.description,
    dataSource: row.data_source,
    fields: row.fields ?? [],
    filters: row.filters ?? [],
    groupBy: row.group_by ?? [],
    chartType: row.chart_type,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

