import type { Metadata } from "next";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { ToastHost } from "@/components/Toast";
import { CommandPalette } from "@/components/command/CommandPalette";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CaseBrain Hub – AI Paralegal for Litigation Teams",
  description:
    "Upload your case files and let CaseBrain generate chronology, key issues, deadlines, risks and missing evidence automatically.",
  openGraph: {
    title: "CaseBrain Hub – AI Paralegal for Litigation Teams",
    description:
      "Upload your case files and let CaseBrain generate chronology, key issues, deadlines, risks and missing evidence automatically.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CaseBrain Hub – AI Paralegal for Litigation Teams",
    description:
      "Upload your case files and let CaseBrain generate chronology, key issues, deadlines, risks and missing evidence automatically.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#06B6D4",
          colorBackground: "#111827",
          colorInputBackground: "#1F2937",
          colorText: "#F8FAFC",
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${inter.variable} font-sans bg-background text-accent min-h-screen`}
        >
          <SignedIn>
            <>
              {children}
              <ToastHost />
              <CommandPalette />
            </>
          </SignedIn>
          <SignedOut>
            {children}
          </SignedOut>
          {process.env.NODE_ENV === "production" && <Analytics />}
        </body>
      </html>
    </ClerkProvider>
  );
}
