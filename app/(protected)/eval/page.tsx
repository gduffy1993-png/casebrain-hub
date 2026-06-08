import { GoldenEvalRunner } from "@/components/eval/GoldenEvalRunner";
import { EvalPackRunner } from "@/components/eval/EvalPackRunner";

export default function EvalPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-6 space-y-6">
      <GoldenEvalRunner />
      <EvalPackRunner />
    </main>
  );
}

