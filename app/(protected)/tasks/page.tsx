import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { TaskList } from "@/components/tasks/TaskList";

export default async function TasksPage() {
  await requireUser();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-accent">Automation tasks</h1>
        <p className="mt-2 max-w-2xl text-sm text-accent/60">
          CaseBrain monitors deadlines, briefings, and inbox events, creating tasks when follow-up
          is required. Review and complete them here.
        </p>
      </header>
      <Card title="Queued tasks">
        <TaskList />
      </Card>
    </div>
  );
}

