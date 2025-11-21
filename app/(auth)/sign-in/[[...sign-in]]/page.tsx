import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted">
      <div className="glass-card w-full max-w-md">
        <SignIn />
      </div>
    </div>
  );
}

