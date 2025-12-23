import { SignIn } from "@clerk/nextjs";

export default function Page() {
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
}

