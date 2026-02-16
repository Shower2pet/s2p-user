/**
 * Payment service — Stripe checkout, credits, receipts.
 */
import { supabase } from '@/integrations/supabase/client';

/* ── Create Stripe Checkout session ──────────────────────── */
export interface CheckoutParams {
  amount?: number;
  currency?: string;
  productName: string;
  productType: string;
  mode: 'payment' | 'subscription';
  description?: string;
  credits?: number;
  price_id?: string;
  plan_id?: string;
  station_id?: string;
  option_id?: number;
  user_id?: string | null;
  guest_email?: string | null;
  structure_id?: string | null;
  success_url?: string;
}

export const createCheckout = async (params: CheckoutParams): Promise<{ url: string }> => {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: params,
  });
  if (error) throw error;
  return data as { url: string };
};

/* ── Pay with credits / subscription ─────────────────────── */
export interface PayWithCreditsParams {
  station_id: string;
  option_id: number;
  use_subscription?: boolean;
  subscription_id?: string;
}

export const payWithCredits = async (params: PayWithCreditsParams) => {
  const { data, error } = await supabase.functions.invoke('pay-with-credits', {
    body: params,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

/* ── Verify Stripe session (credit topup) ────────────────── */
export const verifySession = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('verify-session', { body });
  if (error) throw error;
  return data;
};

/* ── Generate receipt (fire-and-forget) ──────────────────── */
export const generateReceipt = async (sessionId: string, partnerId: string, amount: number) => {
  const { data, error } = await supabase.functions.invoke('generate-receipt', {
    body: { session_id: sessionId, partner_id: partnerId, amount },
  });
  if (error) throw error;
  return data;
};
