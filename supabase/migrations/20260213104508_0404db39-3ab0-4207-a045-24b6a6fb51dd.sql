
-- 1. Add severity and status columns to maintenance_logs for user-reported tickets
ALTER TABLE public.maintenance_logs
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';

-- Allow authenticated users to INSERT into maintenance_logs (for ticket reporting)
CREATE POLICY "Authenticated users can report issues"
  ON public.maintenance_logs FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- 2. Create subscription_plans table (created by structure owners)
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  structure_id UUID REFERENCES public.structures(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_eur NUMERIC NOT NULL,
  interval TEXT NOT NULL DEFAULT 'month', -- month, year
  max_washes_per_month INTEGER, -- null = unlimited
  is_active BOOLEAN DEFAULT true,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read active plans
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

-- Owner manages own plans
CREATE POLICY "Owner manages own subscription plans"
  ON public.subscription_plans FOR ALL
  USING (owner_id = auth.uid() OR public.is_admin());

-- 3. Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id TEXT,
  washes_used_this_period INTEGER DEFAULT 0,
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- Users can insert own subscriptions (via checkout flow)
CREATE POLICY "Users can create own subscriptions"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update own subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON public.user_subscriptions FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- Partners can view subscriptions to their plans
CREATE POLICY "Partners view subscriptions to their plans"
  ON public.user_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subscription_plans sp
      WHERE sp.id = user_subscriptions.plan_id
      AND sp.owner_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_plan ON public.user_subscriptions(plan_id);
CREATE INDEX idx_subscription_plans_owner ON public.subscription_plans(owner_id);
CREATE INDEX idx_subscription_plans_structure ON public.subscription_plans(structure_id);
