import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold">
              CB
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold text-slate-900">CaseBrain Hub</h1>
              <p className="text-xs text-slate-500">AI paralegal for modern litigation teams</p>
            </div>
          </div>
        </div>

        {/* Sign In Form */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-8">
          <SignIn 
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              baseTheme: undefined, // Use light theme
              variables: {
                colorPrimary: "#06B6D4",
                colorBackground: "#FFFFFF",
                colorInputBackground: "#F8FAFC",
                colorText: "#1E293B",
                colorInputText: "#1E293B",
              },
              elements: {
                rootBox: "mx-auto w-full",
                card: "shadow-none bg-transparent w-full",
                formButtonPrimary: "bg-cyan-500 hover:bg-cyan-600 text-white",
                formFieldInput: "border-slate-300 focus:border-cyan-500",
                footerActionLink: "text-cyan-600 hover:text-cyan-700",
              },
            }}
          />
        </div>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-sm text-slate-600">
            Don't have an account?{" "}
            <a 
              href="/sign-up" 
              className="font-semibold text-cyan-600 hover:text-cyan-700 underline"
            >
              Create account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

