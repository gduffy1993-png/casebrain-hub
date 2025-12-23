"use client";

import { SignIn } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function Page() {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold">Sign-in error</h1>
          <p className="text-sm text-muted-foreground">
            Please refresh the page or contact support if the problem persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          afterSignInUrl="/dashboard"
          appearance={{
            elements: {
              socialButtonsBlockButton: "hidden",
              footerActionLink: "text-blue-600",
              formButtonPrimary: "bg-black text-white",
            },
          }}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold">Sign-in error</h1>
          <p className="text-sm text-muted-foreground">
            Please refresh the page or contact support if the problem persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }
}

