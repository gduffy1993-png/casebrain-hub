# CaseBrain Deployment Checklist - Pilot Ready

## Pre-Deployment Verification

### ✅ Code Quality
- [x] TypeScript errors fixed (`tsc --noEmit` passes)
- [ ] **Run `npm run build` locally and fix any remaining build errors**
- [x] Navigation cleaned (Team/Compliance hidden)
- [x] Core brains hardened (timeline, extraction)
- [x] All case view panels wrapped in ErrorBoundary
- [x] Multi-tenant isolation verified (all queries scoped by org_id)

### 🔄 Environment Variables
- [ ] All variables from `.env.example` set in Vercel
- [ ] Supabase URL and keys configured
- [ ] Clerk keys configured
- [ ] OpenAI API key configured
- [ ] Redaction secret set (32+ chars recommended)

### 🗄️ Database
- [ ] All migrations run in Supabase (check `supabase/migrations/`)
- [ ] Storage bucket `casebrain-documents` created
- [ ] RLS policies enabled on all tables
- [ ] `org_id` isolation verified

### 🔐 Authentication
- [ ] Clerk organization setup (or single-tenant mode)
- [ ] User roles configured (owner, solicitor, paralegal, viewer)
- [ ] Sign-in/Sign-up URLs configured

## Deployment Steps

1. **Vercel Setup**
   ```bash
   vercel --prod
   ```
   Or connect GitHub repo to Vercel dashboard

2. **Environment Variables**
   - Add all from `.env.example` to Vercel dashboard
   - Mark sensitive vars as "Encrypted"

3. **Supabase**
   - Run migrations: `supabase/migrations/*.sql` in order
   - Create storage bucket
   - Test connection from Vercel

4. **Clerk**
   - Configure allowed redirect URLs
   - Set webhook endpoints (if using org sync)

5. **Verify**
   - Login works
   - **Manually test upload → case view for at least one real PDF**
   - Case view loads all panels (even with missing data)
   - Data isolation works (test with 2 orgs - Firm A cannot see Firm B's cases)

## Post-Deployment Monitoring

- Check Vercel logs for errors
- Monitor Supabase usage
- Test upload flow end-to-end
- Verify multi-tenant isolation

## Rollback Plan

If issues occur:
1. Revert Vercel deployment to previous version
2. Check environment variables
3. Verify Supabase connection
4. Check Clerk configuration

