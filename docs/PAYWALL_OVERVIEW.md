# 🚧 Paywall System Overview

## Architecture

The paywall system enforces usage limits for free tier users and provides unlimited access for pro tier users.

### Limits

**Free Tier:**
- Max **3 PDF uploads** (total lifetime)
- Max **5 AI analysis operations** (total lifetime)
- Max **1 Case Pack export** (total lifetime)

**Pro Tier:**
- Unlimited uploads
- Unlimited analysis
- Unlimited exports

### Single Source of Truth

All limits are defined in `lib/paywall/config.ts`:

```typescript
export const PAYWALL_LIMITS = {
  free: {
    maxUploads: 3,
    maxAnalysis: 5,
    maxExports: 1,
  },
  pro: {
    maxUploads: Infinity,
    maxAnalysis: Infinity,
    maxExports: Infinity,
  },
};
```

**To change free tier limits:** Edit `lib/paywall/config.ts` and update the values.

## How It Works

### 1. Usage Tracking

Usage is tracked at the **organisation level** in the `organisations` table:
- `upload_count` - Total PDF uploads
- `analysis_count` - Total AI analysis operations  
- `export_count` - Total case pack exports

Counters are incremented atomically using the `increment_usage_counter()` SQL function.

### 2. Backend Protection

API routes are protected using the `paywallGuard()` or `withPaywall()` helper:

```typescript
// Option 1: Manual guard
const guard = await paywallGuard("upload");
if (!guard.allowed) {
  return guard.response!;
}
// ... do work ...
await incrementUsage({ orgId: guard.orgId!, feature: "upload" });

// Option 2: Wrapper (recommended)
return await withPaywall("analysis", async (orgId) => {
  // ... do analysis ...
  // Usage automatically incremented on success
  return NextResponse.json({ result: "..." });
});
```

### 3. Frontend Protection

Frontend components use the `usePaywallStatus()` hook:

```typescript
const { canUpload, canAnalyse, canExport, plan } = usePaywallStatus();

if (!canUpload) {
  // Show upgrade prompt or disable button
  return <UpgradePrompt />;
}
```

### 4. Error Handling

When a limit is reached:
- Backend returns `402 Payment Required` with error `UPGRADE_REQUIRED`
- Frontend should redirect to `/upgrade` page
- User sees clear message about limit being reached

## Protected Routes

### Upload Routes
- `POST /api/upload` - PDF uploads

### Analysis Routes
- `GET /api/strategic/[caseId]/overview` - Strategic intelligence
- `GET /api/criminal/[caseId]/aggressive-defense` - Criminal defense
- `GET /api/housing/[caseId]/aggressive-defense` - Housing defense
- `GET /api/family/[caseId]/aggressive-defense` - Family defense
- `GET /api/pi/[caseId]/aggressive-defense` - PI defense
- `POST /api/bundle/scan/[caseId]` - Bundle analysis

### Export Routes
- `GET /api/cases/[caseId]/case-pack` - Case pack PDF export

## Changing Free Plan Limits

1. Edit `lib/paywall/config.ts`
2. Update the `free` tier limits:
   ```typescript
   free: {
     maxUploads: 5,  // Change from 3 to 5
     maxAnalysis: 10, // Change from 5 to 10
     maxExports: 2,   // Change from 1 to 2
   }
   ```
3. Deploy the change
4. **Note:** Existing users keep their current counts, but new limits apply to future usage

## Manually Setting Plan to Pro

To manually upgrade a user/org to pro in Supabase:

```sql
-- Find the organisation
SELECT id, name, plan, upload_count, analysis_count, export_count
FROM organisations
WHERE id = 'your-org-id';

-- Set to pro
UPDATE organisations
SET plan = 'pro'
WHERE id = 'your-org-id';
```

## Testing Limits

### Test Free User Limits

1. Create a test organisation with `plan = 'free'`
2. Upload 3 PDFs → Should succeed
3. Upload 4th PDF → Should fail with `UPGRADE_REQUIRED`
4. Run 5 analyses → Should succeed
5. Run 6th analysis → Should fail
6. Export 1 case pack → Should succeed
7. Export 2nd case pack → Should fail

### Test Pro User Limits

1. Set organisation `plan = 'pro'`
2. Upload unlimited PDFs → Should always succeed
3. Run unlimited analyses → Should always succeed
4. Export unlimited case packs → Should always succeed

## API Endpoints

### `GET /api/paywall/status`

Returns current paywall status for the authenticated user's organisation:

```json
{
  "plan": "free",
  "uploadCount": 2,
  "analysisCount": 3,
  "exportCount": 0,
  "canUpload": true,
  "canAnalyse": true,
  "canExport": true,
  "uploadLimit": 3,
  "analysisLimit": 5,
  "exportLimit": 1
}
```

## Frontend Components

### `UpgradeBanner`

Shows a banner when user is on free plan and quotas are low:

```tsx
import { UpgradeBanner } from "@/components/paywall/UpgradeBanner";

<UpgradeBanner />
```

### `/upgrade` Page

Professional upgrade page showing:
- Free vs Pro comparison
- Feature list
- CTA to request pro access

## Future Enhancements

Potential improvements:
- Per-seat billing
- Additional tiers (Team, Enterprise)
- Usage-based billing
- Trial periods
- Promotional codes
- Billing integration (Stripe, etc.)

