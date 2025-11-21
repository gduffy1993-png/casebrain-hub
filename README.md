## CaseBrain Hub

CaseBrain Hub is a production-ready AI paralegal workspace for law firms. Upload disclosure packs, extract entities and timelines, generate letters from approved templates, and export an audit-ready case bundle in minutes.

### Tech stack

- Next.js 14 (App Router, TypeScript, Tailwind)
- Supabase (Postgres + Storage)
- Clerk multi-tenant auth (org roles: owner, solicitor, paralegal, viewer)
- OpenAI (gpt-4o-mini, gpt-4-turbo)
- pdf-parse, mammoth, pdfkit, docx
- Playwright smoke tests

### Getting started

1. Install dependencies

   ```bash
   npm install
   ```

2. Copy environment template and configure secrets (see `config/env.example`)

3. Start Supabase locally

   ```bash
   npx supabase start
   ```

4. Run the development server

   ```bash
   npm run dev
   ```

5. Optionally seed demo data (requires service role key)

   ```bash
   npm run seed
   ```

### Available scripts

- `npm run dev` – start Next.js in development mode
- `npm run build` – production build (type checks enforced)
- `npm run start` – start the production server
- `npm run lint` – lint with ESLint
- `npm run seed` – insert demo cases, deadlines, and letters
- `npm run test:e2e` – Playwright smoke flow (requires running dev server)

### Workflows implemented

- Secure uploads to Supabase Storage with automatic redaction and AI extraction
- Timeline and deadline automation with CPR-style business day calculator
- Letter drafting using firm templates, notes, and extracted facts
- Multi-version letters with diff viewer
- Case bundle PDF export (summary, timeline, letters, attachments)
- Global search across cases, documents, letters
- Audit log + Supabase row-level isolation per organisation

### Deployment notes

- Deploy Next.js on Vercel and Supabase on managed Postgres
- Set runtime env vars (`OPENAI_*`, `CLERK_*`, `SUPABASE_*`, `REDACTION_SECRET`)
- Ensure Supabase bucket `casebrain-documents` exists with private access
- Configure Clerk webhooks to sync user roles into Supabase `users` table
- Supabase policies must enforce `org_id` isolation on `cases`, `documents`, `letters`, `deadlines`, `audit_log`
