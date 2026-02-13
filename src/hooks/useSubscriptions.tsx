import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SubscriptionPlan {
  id: string;
  owner_id: string;
  structure_id: string | null;
  name: string;
  description: string | null;
  price_eur: number;
  interval: string;
  max_washes_per_month: number | null;
  is_active: boolean;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  washes_used_this_period: number;
  current_period_start: string;
  created_at: string;
  plan?: SubscriptionPlan;
}

/** Fetch subscription plans for a given structure owner */
export const useSubscriptionPlans = (structureOwnerId: string | null | undefined) => {
  return useQuery({
    queryKey: ['subscription-plans', structureOwnerId],
    queryFn: async () => {
      if (!structureOwnerId) return [];
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('owner_id', structureOwnerId)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as SubscriptionPlan[];
    },
    enabled: !!structureOwnerId,
  });
};

/** Fetch all subscriptions for the current user */
export const useMySubscriptions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-subscriptions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch plan details
      const planIds = [...new Set((data || []).map((s: any) => s.plan_id))];
      const plansMap = new Map<string, SubscriptionPlan>();
      if (planIds.length > 0) {
        const { data: plans } = await supabase
          .from('subscription_plans')
          .select('*')
          .in('id', planIds);
        (plans || []).forEach((p: any) => plansMap.set(p.id, p as SubscriptionPlan));
      }

      return (data || []).map((s: any) => ({
        ...s,
        plan: plansMap.get(s.plan_id) || null,
      })) as UserSubscription[];
    },
    enabled: !!user,
  });
};

/** Check if user has active subscription for a given owner */
export const useActiveSubscriptionForOwner = (ownerId: string | null | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['active-sub-for-owner', user?.id, ownerId],
    queryFn: async () => {
      if (!user || !ownerId) return null;

      // Get plans for this owner
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('owner_id', ownerId);

      if (!plans || plans.length === 0) return null;

      const planIds = plans.map(p => p.id);

      // Check if user has active subscription to any of these plans
      const { data: subs } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .in('plan_id', planIds)
        .limit(1);

      if (!subs || subs.length === 0) return null;
      return subs[0] as any;
    },
    enabled: !!user && !!ownerId,
  });
};
