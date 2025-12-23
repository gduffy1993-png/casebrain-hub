"use client";

import { SignIn } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <p style={{ padding: 40 }}>Loading sign-in…</p>;
  }

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
      <SignIn />
      <p style={{ marginTop: 16, opacity: 0.6 }}>
        If this stays blank, your network or browser is blocking Clerk.
      </p>
    </div>
  );
}

