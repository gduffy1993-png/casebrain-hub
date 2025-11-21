export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type Task = {
  id: string;
  org_id: string;
  case_id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  created_by: string;
  status: TaskStatus;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
};

