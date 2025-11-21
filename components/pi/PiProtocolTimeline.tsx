import { Card } from "@/components/ui/card";

type Deadline = {
  id: string;
  title: string;
  due_date: string;
};

/**
 * Renders a simple timeline for PI protocol deadlines so fee earners can see upcoming stages.
 */
export function PiProtocolTimeline({ deadlines }: { deadlines: Deadline[] }) {
  if (!deadlines.length) {
    return (
      <Card title="Protocol timeline">
        <p className="text-sm text-accent/60">
          No protocol deadlines recorded yet. Seed deadlines from the PI intake wizard to populate
          this view.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Protocol timeline"
      description="Upcoming PI protocol stages. Dates are sourced from the deadlines table."
    >
      <ol className="relative ml-3 border-l border-primary/20 pl-6">
        {deadlines.map((deadline, index) => {
          const date = deadline.due_date
            ? new Date(deadline.due_date).toLocaleDateString("en-GB")
            : "Date TBC";
          return (
            <li key={deadline.id} className="mb-6 last:mb-0">
              <span className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full border border-primary/30 bg-white text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <p className="text-xs uppercase tracking-wide text-accent/40">{date}</p>
              <p className="text-sm font-semibold text-accent">{deadline.title}</p>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}


