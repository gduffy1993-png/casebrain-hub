import { requireUser } from "@/lib/auth";
import { UploadForm } from "@/components/upload/upload-form";
import { CurrentPersonaBadge } from "@/components/layout/CurrentPersonaBadge";

export default async function UploadPage() {
  await requireUser();

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-accent">Upload files</h1>
          <p className="mt-2 max-w-2xl text-sm text-accent/60">
            Drop disclosure packs, expert reports, or email trails. We will ingest
            them securely, redact sensitive data, and extract key facts to
            populate the case summary and timeline automatically.
          </p>
        </div>
        <CurrentPersonaBadge />
      </header>
      <UploadForm />
    </div>
  );
}

