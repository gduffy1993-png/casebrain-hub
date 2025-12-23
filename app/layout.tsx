import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Inter } from "next/font/google";
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
  keywords: ["AI paralegal", "legal tech", "litigation software", "case management", "housing disrepair", "personal injury", "clinical negligence", "UK solicitors"],
  authors: [{ name: "CaseBrain Hub" }],
  openGraph: {
    title: "CaseBrain Hub – AI Paralegal for Litigation Teams",
    description:
      "Upload your case files and let CaseBrain generate chronology, key issues, deadlines, risks and missing evidence automatically.",
    type: "website",
    siteName: "CaseBrain Hub",
    // Add og:image when you create /public/og-image.png
    // images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CaseBrain Hub – AI Paralegal for Litigation Teams",
    description:
      "Upload your case files and let CaseBrain generate chronology, key issues, deadlines, risks and missing evidence automatically.",
    // Add twitter:image when you create /public/twitter-image.png
    // images: ["/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
