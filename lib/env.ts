const required = <T extends string>(key: T, value?: string) => {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing env: ${key}`);
  }

  return value;
};

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  SUPABASE_SERVICE_ROLE_KEY: required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ),
  SUPABASE_STORAGE_BUCKET:
    process.env.SUPABASE_STORAGE_BUCKET ?? "casebrain-documents",
  OPENAI_API_KEY: required("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
  OPENAI_EXTRACTION_MODEL:
    process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-4o-mini",
  OPENAI_LETTER_MODEL: process.env.OPENAI_LETTER_MODEL ?? "gpt-4-turbo",
  OPENAI_SUMMARY_MODEL: process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4o-mini",
  REDACTION_SECRET:
    process.env.REDACTION_SECRET ?? "casebrain-redaction-secret",
  FILE_UPLOAD_MAX_MB: Number(process.env.FILE_UPLOAD_MAX_MB ?? 25),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: required(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  ),
  CLERK_SECRET_KEY: required("CLERK_SECRET_KEY", process.env.CLERK_SECRET_KEY),
  CLERK_SIGN_IN_URL: process.env.CLERK_SIGN_IN_URL ?? "/sign-in",
  CLERK_SIGN_UP_URL: process.env.CLERK_SIGN_UP_URL ?? "/sign-up",
  QA_EMAIL: process.env.QA_EMAIL ?? "",
  QA_PASSWORD: process.env.QA_PASSWORD ?? "",
};

if (Number.isNaN(env.FILE_UPLOAD_MAX_MB)) {
  throw new Error("Invalid env: FILE_UPLOAD_MAX_MB must be a number");
}

const optionalKeys = new Set<keyof typeof env>(["QA_EMAIL", "QA_PASSWORD"]);

Object.entries(env).forEach(([key, value]) => {
  if (
    optionalKeys.has(key as keyof typeof env) ||
    value === undefined ||
    value === null
  ) {
    return;
  }

  if (value === "") {
    throw new Error(`Missing env: ${key}`);
  }
});

