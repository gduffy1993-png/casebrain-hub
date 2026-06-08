-- Optional: store Stripe customer id on organisations for webhook subscription cancel
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_organisations_stripe_customer_id
  ON public.organisations (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
