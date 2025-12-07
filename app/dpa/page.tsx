import Link from "next/link";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Data Processing Agreement – CaseBrain Hub",
  description: "Data Processing Agreement for CaseBrain Hub AI paralegal platform",
};

export default function DPAPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="mx-auto max-w-4xl">
        <Card className="p-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">Data Processing Agreement</h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm text-muted-foreground/70">
              Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Parties</h2>
              <p>
                This Data Processing Agreement ("DPA") forms part of the Terms of Service between:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li><strong className="text-foreground">Data Controller:</strong> Your law firm (the "Client")</li>
                <li><strong className="text-foreground">Data Processor:</strong> CaseBrain Hub ("we", "us", "our")</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Scope</h2>
              <p>
                This DPA applies to all personal data processed by CaseBrain Hub on behalf of the Client 
                in connection with the Service, including case documents, client information, and extracted data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Processing Activities</h2>
              <p>CaseBrain Hub processes data for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Document storage and retrieval</li>
                <li>Text extraction and analysis</li>
                <li>Case fact extraction and structuring</li>
                <li>Risk flag generation</li>
                <li>Chronology and timeline generation</li>
                <li>User authentication and access control</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Security</h2>
              <p>
                We implement appropriate technical and organisational measures to protect personal data, including:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Encryption in transit (HTTPS/TLS)</li>
                <li>Encryption at rest</li>
                <li>Multi-tenant data isolation</li>
                <li>Access controls via authentication</li>
                <li>Regular security assessments</li>
                <li>Secure data centers (EU/UK)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Sub-processors</h2>
              <p>
                We use the following sub-processors to provide the Service:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li><strong className="text-foreground">Supabase</strong> – Database and file storage (EU/UK data centers)</li>
                <li><strong className="text-foreground">Clerk</strong> – Authentication services</li>
                <li><strong className="text-foreground">Vercel</strong> – Hosting infrastructure</li>
                <li><strong className="text-foreground">OpenAI</strong> – AI processing (data not used for training)</li>
              </ul>
              <p className="mt-3">
                All sub-processors are bound by data processing agreements and comply with UK GDPR.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Subject Rights</h2>
              <p>
                We assist the Client in responding to data subject requests under UK GDPR, including 
                access, rectification, erasure, and portability requests.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Breach Notification</h2>
              <p>
                In the event of a personal data breach, we will notify the Client without undue delay 
                and provide all necessary information to assist with breach notification obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Data Retention and Deletion</h2>
              <p>
                We retain personal data only for as long as necessary to provide the Service. 
                Upon account deletion or termination, all data is permanently deleted within 30 days, 
                unless retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Contact</h2>
              <p>
                For DPA inquiries, contact{" "}
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

