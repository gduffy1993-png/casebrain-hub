import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        afterSignUpUrl="/dashboard"
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

