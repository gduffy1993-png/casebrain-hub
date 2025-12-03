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

2. Copy environment template and configure secrets

   ```bash
   cp .env.example .env.local
   # Then edit .env.local with your actual values
   ```

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

### Deployment to Vercel (Production)

1. **Environment Variables**
   - Set all variables from `.env.example` in Vercel dashboard
   - Required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CLERK_SECRET_KEY`
   - See `.env.example` for complete list

2. **Supabase Setup**
   - Run all migrations from `supabase/migrations/` in order
   - Create storage bucket `casebrain-documents` with private access
   - Enable Row Level Security (RLS) on all tables
   - Ensure `org_id` isolation policies are in place

3. **Clerk Setup**
   - Configure Clerk organization webhooks (optional, for multi-tenant)
   - Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
   - Users will be auto-created in Supabase on first login

4. **Build & Deploy**
   ```bash
   npm run build  # Verify build succeeds locally first
   # Then deploy via Vercel CLI or dashboard
   ```

5. **Post-Deployment**
   - Verify login flow works
   - Test upload → case creation → case view
   - Check that data is isolated per organization

### Multi-Tenant Architecture

- Each organization has isolated data via `org_id` column
- Clerk organizations map to `org_id` in Supabase
- Single-tenant mode: uses `solo-{userId}` as `org_id` if no Clerk org
- All queries must filter by `org_id` for security
