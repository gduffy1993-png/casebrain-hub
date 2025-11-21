import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted">
      <div className="glass-card w-full max-w-md">
        <SignUp />
      </div>
    </div>
  );
}

