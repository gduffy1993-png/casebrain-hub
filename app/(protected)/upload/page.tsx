import { requireUser } from "@/lib/auth";
import { UploadForm } from "@/components/upload/upload-form";
import { UploadNextSteps } from "@/components/upload/upload-next-steps";
import { CurrentPersonaBadge } from "@/components/layout/CurrentPersonaBadge";

type UploadPageProps = {
  searchParams: Promise<{ caseId?: string }>;
};

export default async function UploadPage({ searchParams }: UploadPageProps) {
  await requireUser();
  const params = await searchParams;
  const caseId = params.caseId;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-accent">New upload</h1>
          <p className="mt-2 max-w-2xl text-sm text-accent/60">
            Add documents to a case or send to Intake.
          </p>
        </div>
        <CurrentPersonaBadge />
      </header>
      <UploadForm caseId={caseId} />
      <UploadNextSteps />
    </div>
  );
}

