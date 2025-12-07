import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Shield, Lock, Users, FileCheck, Server, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Security – CaseBrain Hub",
  description: "Security and compliance information for CaseBrain Hub AI paralegal platform",
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Security & Compliance</h1>
          <p className="text-lg text-muted-foreground">
            Built for regulated work with enterprise-grade security
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Infrastructure Security</h3>
            <p className="text-sm text-muted-foreground">
              Hosted on Vercel and Supabase with EU/UK data centers. All infrastructure is SOC 2 compliant 
              and regularly audited.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Encryption</h3>
            <p className="text-sm text-muted-foreground">
              All data is encrypted in transit (HTTPS/TLS 1.3) and at rest using industry-standard AES-256 encryption.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Access Control</h3>
            <p className="text-sm text-muted-foreground">
              Multi-tenant isolation ensures your firm's data is completely separate. Authentication via Clerk 
              with MFA support and role-based access.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
              <FileCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Compliance</h3>
            <p className="text-sm text-muted-foreground">
              UK GDPR and Data Protection Act 2018 compliant. Your firm remains the data controller; 
              CaseBrain acts as a data processor.
            </p>
          </Card>
        </div>

        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Security Features</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Multi-tenant data isolation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Each organisation's data is completely isolated at the database level. Firm A cannot access Firm B's data.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Audit logging</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All actions are logged with user IDs, timestamps, and event types for compliance and security monitoring.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Regular security assessments</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Infrastructure and application security are regularly assessed and updated.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Data backup and recovery</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Automated daily backups with point-in-time recovery capabilities.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">No AI training on your data</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your case documents and extracted data are never used to train AI models. Data is processed 
                  for your case only and not shared with third parties.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Certifications & Compliance</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>• UK GDPR and Data Protection Act 2018 compliant</p>
            <p>• Infrastructure providers (Vercel, Supabase) are SOC 2 Type II certified</p>
            <p>• Regular penetration testing and security audits</p>
            <p>• Data Processing Agreement available for enterprise clients</p>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-primary hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

