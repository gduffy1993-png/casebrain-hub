import Link from "next/link";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Privacy Policy – CaseBrain Hub",
  description: "Privacy Policy for CaseBrain Hub AI paralegal platform",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="mx-auto max-w-4xl">
        <Card className="p-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm text-muted-foreground/70">
              Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Data Controller</h2>
              <p>
                Your law firm is the data controller for all case data uploaded to CaseBrain Hub. 
                CaseBrain acts as a data processor under UK GDPR and the Data Protection Act 2018.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Data We Process</h2>
              <p>We process the following data on your behalf:</p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Case documents (PDFs, emails, letters) uploaded by your team</li>
                <li>Extracted case facts, chronologies, and risk flags</li>
                <li>User account information (via Clerk authentication)</li>
                <li>Usage analytics (PDF upload counts, feature usage)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Data</h2>
              <p>
                We use your data solely to provide the Service: processing documents, generating analysis, 
                and storing case information. We do not use your data for training AI models or sharing 
                with third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Storage and Security</h2>
              <p>
                Data is stored in Supabase (EU/UK data centers) and encrypted in transit (HTTPS) and at rest. 
                Access is controlled via Clerk authentication with multi-tenant isolation. Each organisation's 
                data is completely separate.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Your Rights</h2>
              <p>Under UK GDPR, you have the right to:</p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Access your data</li>
                <li>Rectify inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data</li>
                <li>Object to processing</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, contact{" "}
                <a href="mailto:privacy@casebrainhub.com" className="text-primary hover:underline">
                  privacy@casebrainhub.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Retention</h2>
              <p>
                We retain your data for as long as your account is active. You may delete your account 
                and all associated data at any time. Deleted data is permanently removed within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Contact</h2>
              <p>
                For privacy inquiries, contact{" "}
                <a href="mailto:privacy@casebrainhub.com" className="text-primary hover:underline">
                  privacy@casebrainhub.com
                </a>
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <Link href="/" className="text-sm text-primary hover:underline">
              ← Back to home
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

