import Link from "next/link";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Terms of Service – CaseBrain Hub",
  description: "Terms of Service for CaseBrain Hub AI paralegal platform",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="mx-auto max-w-4xl">
        <Card className="p-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">Terms of Service</h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm text-muted-foreground/70">
              Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Agreement to Terms</h2>
              <p>
                By accessing or using CaseBrain Hub ("the Service"), you agree to be bound by these Terms of Service. 
                If you disagree with any part of these terms, you may not access the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Use of Service</h2>
              <p>
                CaseBrain Hub is an AI-powered paralegal platform designed to assist UK litigation teams. 
                The Service processes case documents and provides structured outputs including chronologies, 
                risk flags, and evidence analysis.
              </p>
              <p className="mt-3">
                <strong className="text-foreground">Important:</strong> CaseBrain Hub does not provide legal advice. 
                All outputs must be reviewed by a qualified solicitor. The Service structures case files for 
                professional review and does not replace qualified legal judgment.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Data and Confidentiality</h2>
              <p>
                You retain ownership of all data uploaded to the Service. CaseBrain acts as a data processor 
                under UK GDPR. Your firm remains the data controller. See our{" "}
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{" "}
                <Link href="/dpa" className="text-primary hover:underline">Data Processing Agreement</Link> for details.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Subscription and Billing</h2>
              <p>
                Free tier includes 30 PDF uploads per month and 10 active cases. Paid plans provide unlimited usage. 
                Subscriptions are billed monthly or annually. You may cancel at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Limitation of Liability</h2>
              <p>
                CaseBrain Hub is provided "as is" without warranties. We are not liable for any decisions made 
                based on Service outputs. All case analysis must be reviewed by qualified professionals.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Contact</h2>
              <p>
                For questions about these Terms, contact{" "}
                <a href="mailto:legal@casebrainhub.com" className="text-primary hover:underline">
                  legal@casebrainhub.com
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

