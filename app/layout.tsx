import type { Metadata } from "next";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ToastHost } from "@/components/Toast";
import { CommandPalette } from "@/components/command/CommandPalette";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CaseBrain Hub",
  description:
    "AI paralegal platform that helps firms automate case document workflows safely.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${inter.variable} ${jetbrainsMono.variable} bg-background text-accent-soft min-h-screen`}
        >
          <SignedIn>
            <>
              {children}
              <ToastHost />
              <CommandPalette />
            </>
          </SignedIn>
          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
