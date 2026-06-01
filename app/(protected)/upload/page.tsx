import { requireUser } from "@/lib/auth";
import { UploadForm } from "@/components/upload/upload-form";
import { UploadNextSteps } from "@/components/upload/upload-next-steps";
import { CurrentPersonaBadge } from "@/components/layout/CurrentPersonaBadge";
import { isCriminalPilotMode, shouldShowInternalDevTools } from "@/lib/pilot-mode";

type UploadPageProps = {
  searchParams: Promise<{ caseId?: string }>;
};

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const caseId = params.caseId;
  const showPilotUploadNotice = isCriminalPilotMode() && !shouldShowInternalDevTools(user.userId);

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
      {showPilotUploadNotice && (
        <section
          aria-label="Pilot upload notice"
          className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4"
        >
          <h2 className="text-sm font-semibold text-amber-900">Pilot upload notice</h2>
          <p className="mt-2 text-sm text-amber-900/90">
            Please upload only fictional, redacted, or test case papers for this pilot. Do not
            upload live client-identifiable material unless a pilot/data agreement is in place. All
            outputs are provisional and require solicitor review.
          </p>
        </section>
      )}
      <UploadForm caseId={caseId} />
      <UploadNextSteps />
    </div>
  );
}

