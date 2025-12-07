import Link from "next/link";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Cookie Policy – CaseBrain Hub",
  description: "Cookie Policy for CaseBrain Hub AI paralegal platform",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="mx-auto max-w-4xl">
        <Card className="p-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">Cookie Policy</h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm text-muted-foreground/70">
              Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. What Are Cookies</h2>
              <p>
                Cookies are small text files stored on your device when you visit a website. 
                CaseBrain Hub uses cookies to provide essential functionality and improve your experience.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Cookies We Use</h2>
              
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Essential Cookies</h3>
              <p>
                These cookies are required for the Service to function:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li><strong className="text-foreground">Authentication cookies</strong> – Managed by Clerk for user sessions</li>
                <li><strong className="text-foreground">Security cookies</strong> – CSRF protection and session security</li>
              </ul>

              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">Analytics Cookies</h3>
              <p>
                We use Vercel Analytics (in production only) to understand how the Service is used. 
                This helps us improve performance and fix issues. Analytics are anonymized and do not 
                track personal information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Third-Party Cookies</h2>
              <p>
                We use the following third-party services that may set cookies:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li><strong className="text-foreground">Clerk</strong> – Authentication and user management</li>
                <li><strong className="text-foreground">Vercel</strong> – Analytics (production only)</li>
                <li><strong className="text-foreground">Supabase</strong> – Database and storage (no client-side cookies)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Managing Cookies</h2>
              <p>
                Most browsers allow you to control cookies through settings. You can block or delete cookies, 
                but this may affect Service functionality. Essential cookies cannot be disabled as they are 
                required for the Service to work.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Contact</h2>
              <p>
                For questions about cookies, contact{" "}
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

