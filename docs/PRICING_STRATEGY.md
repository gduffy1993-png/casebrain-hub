# CaseBrain Pricing Strategy

## Recommended Pricing Tiers

### Free Tier (Trial)
**Purpose:** Let users experience core features, build trust, then convert

**Limits:**
- 3 case uploads (total lifetime) - enough to test 1-2 real cases
- 5 AI analysis operations (total lifetime) - enough to see Strategic Intelligence in action
- 1 Case Pack export (total lifetime) - enough to see the export feature

**Rationale:** 
- Low enough to encourage upgrade after real usage
- High enough to demonstrate value
- Lifetime limits prevent abuse (not monthly reset)

### Pro Tier
**Recommended Pricing:**
- **£99/month per user** (or £990/year - 2 months free)
- **£199/month per firm** (up to 5 users, then £39/user additional)
- **Enterprise:** Custom pricing for 10+ users

**Why this pricing:**
- Competitive with Clio (£99-149/user/month)
- Reflects value: AI paralegal saves 10-20 hours/week
- ROI: One case win pays for months of subscription
- UK market: Solicitors expect £50-200/month for practice management

## Professional Upgrade Experience

### 1. Subtle Prompts (ChatGPT-style)
- **Don't block** until limit actually reached
- Show **subtle indicator** when 80%+ quota used
- **Non-intrusive banner** at top of page (not blocking workflow)
- **No popups** or modal interruptions

### 2. Clear Value Proposition
- Focus on **time saved** (10-20 hours/week)
- Show **ROI calculator** (one case win = X months subscription)
- **Feature comparison** table (Free vs Pro)
- **Testimonials** from existing users

### 3. Easy Upgrade Path
- **Upgrade button** in user menu (top right)
- **Dedicated /upgrade page** with clear pricing
- **Contact sales** CTA for enterprise
- **No credit card required** for trial extension requests

## Per-User vs Per-Org Limits

### Current: Per-Org Limits
**Problem:** One org with 50 users = 50x the value for same price

### Recommended: Hybrid Approach
- **Base plan:** Per-org pricing with user limits
- **Free tier:** 1 user, 3 uploads, 5 analyses
- **Pro tier:** £99/user/month, unlimited per user
- **Enterprise:** Custom pricing, volume discounts

### Implementation
Track usage per user, but bill per org:
```sql
-- Add user_id to usage tracking
ALTER TABLE usage_logs ADD COLUMN user_id TEXT;
-- Bill org, but enforce per-user limits
```

## Upgrade Flow Best Practices

1. **Never block mid-action** - Let them finish what they started
2. **Show quota in sidebar** - "3/3 uploads used" (subtle, always visible)
3. **Soft limit warnings** - "You've used 80% of your quota" (informational)
4. **Hard limit handling** - "Upgrade to continue" (only when actually blocked)
5. **Grace period** - Allow 1-2 actions over limit with warning

## Messaging Examples

### Good (Subtle):
"3 uploads remaining this month. [Upgrade]"

### Bad (Aggressive):
"⚠️ UPGRADE REQUIRED! You've reached your limit!"

### Good (Value-focused):
"Unlock unlimited cases and save 15+ hours/week. [Upgrade to Pro]"

### Bad (Fear-based):
"You can't upload more files! Upgrade now!"

## A/B Testing Recommendations

Test:
- Free tier limits (3 vs 5 uploads)
- Pricing (£99 vs £149/user)
- Upgrade prompts (subtle vs prominent)
- Trial length (lifetime vs 30-day reset)

