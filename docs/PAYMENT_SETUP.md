# How to add payments (Stripe)

You already have trial limits and an Upgrade page. To **actually charge** users you need a payment provider. **Stripe** is the usual choice (subscriptions, cards, no merchant account needed).

---

## 1. Stripe account and product

1. Sign up at [stripe.com](https://stripe.com) and get your **Secret key** and **Publishable key** (Dashboard → Developers → API keys).
2. Create a **Product** (e.g. "CaseBrain Pro") and a **Price** (e.g. £99/month recurring). Note the **Price ID** (e.g. `price_xxx`).
3. (Optional) Create a second price for annual billing.

---

## 2. Env vars

Add to `.env.local` (and your host’s env, e.g. Vercel):

```bash
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_PRICE_ID_PRO=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx   # after step 4
```

Use `sk_test_` / `pk_test_` for testing.

---

## 3. Install Stripe

```bash
npm install stripe @stripe/stripe-js
```

---

## 4. Create Checkout (or Customer Portal)

**Option A – Checkout (one “Subscribe” button, Stripe hosts the page)**  
- API route: `POST /api/stripe/create-checkout-session`  
  - Get `orgId` / `userId` from auth.  
  - Create a [Checkout Session](https://stripe.com/docs/api/checkout/sessions/create) with `mode: 'subscription'`, `line_items: [{ price: process.env.STRIPE_PRICE_ID_PRO }]`, `success_url`, `cancel_url`, and `client_reference_id: orgId` (so you know which org paid).  
  - Return `{ url: session.url }`.  
- Frontend: on Upgrade page, “Subscribe to Pro” button calls that API and redirects to `url`.

**Option B – Customer Portal (manage subscription, invoices, card)**  
- Same as above but create a [Customer Portal session](https://stripe.com/docs/customer-management/embedded-customer-portal) (user can upgrade, cancel, update card). Good once you have Stripe Customer IDs stored per org.

---

## 5. Webhook: update plan when they pay

When a user completes payment, Stripe sends a webhook. You update your DB so the app treats them as Pro.

1. In Stripe Dashboard → Developers → Webhooks, add endpoint: `https://your-domain.com/api/stripe/webhook`, events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
2. Copy the **Signing secret** (`whsec_xxx`) into `STRIPE_WEBHOOK_SECRET`.
3. API route: `POST /api/stripe/webhook`  
   - Verify signature with `stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET)`.  
   - On `checkout.session.completed`: read `client_reference_id` (orgId), set `organisations.plan = 'pro'` for that org (and optionally store `stripe_customer_id`, `stripe_subscription_id` if you have columns).  
   - On `customer.subscription.deleted` (or `updated` with status cancelled): set `organisations.plan = 'free'` for that org.

Then your existing paywall (which reads `organisations.plan` and trial status) will automatically treat them as Pro.

---

## 6. Link Upgrade page to Stripe

On `/upgrade`, change the Pro “Subscribe” button from a link to:

1. Call `POST /api/stripe/create-checkout-session` (with auth).
2. Redirect the user to the returned `url` (Stripe Checkout).
3. After payment, Stripe redirects to your `success_url` (e.g. `/settings?upgraded=1`). Webhook has already set `plan = 'pro'`.

---

## Summary

| Step | What |
|------|------|
| 1 | Stripe account + Product + Price, get keys and Price ID |
| 2 | Add env vars (secret key, publishable key, price ID, webhook secret) |
| 3 | `npm install stripe @stripe/stripe-js` |
| 4 | API: create Checkout Session (or Portal), return URL |
| 5 | API: webhook handler → update `organisations.plan` on payment / cancel |
| 6 | Upgrade page button → call API, redirect to Stripe |

Your trial and limits stay as they are; once `plan` is `pro`, your existing paywall logic gives them unlimited (or higher) limits. No need to change trial logic when adding Stripe.

If you want, the next step is to add the two API routes (`create-checkout-session` and `webhook`) and the Upgrade button wiring in your repo.
