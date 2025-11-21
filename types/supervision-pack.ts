import type { SupervisionPack } from "@/lib/housing/supervision-pack";

export type SupervisorPackRecord = {
  id: string;
  case_id: string;
  org_id: string;
  generated_at: string;
  generated_by: string;
  pack_json: SupervisionPack;
  pack_markdown: string | null;
  created_at: string;
  updated_at: string;
};

