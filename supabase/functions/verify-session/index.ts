import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-SESSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const user = authData.user;
    if (!user) throw new Error("User not authenticated");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");

    logStep("Verifying session", { userId: user.id, session_id });

    // Check if transaction already completed
    const { data: existingTx } = await supabaseClient
      .from('transactions')
      .select('id, status, transaction_type, credits_purchased, structure_id')
      .eq('stripe_payment_id', session_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingTx?.status === 'COMPLETED') {
      logStep("Already completed", { txId: existingTx.id });
      return new Response(JSON.stringify({ status: 'already_completed' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Stripe session status
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Stripe session", { status: session.payment_status, mode: session.mode });

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ status: 'not_paid', payment_status: session.payment_status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment is confirmed — process it
    // Update transaction to COMPLETED
    if (existingTx) {
      await supabaseClient
        .from('transactions')
        .update({ status: 'COMPLETED' })
        .eq('id', existingTx.id);
      logStep("Transaction updated to COMPLETED");
    }

    // Handle credit pack
    const productType = session.metadata?.product_type;
    const structureId = session.metadata?.structure_id;
    const creditsFromMeta = parseInt(session.metadata?.credits || '0', 10);

    if (productType === 'credit_pack' && structureId && creditsFromMeta > 0) {
      logStep("Processing credit pack", { structureId, credits: creditsFromMeta });

      const { data: existing } = await supabaseClient
        .from('structure_wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .eq('structure_id', structureId)
        .maybeSingle();

      if (existing) {
        await supabaseClient
          .from('structure_wallets')
          .update({ balance: (existing.balance || 0) + creditsFromMeta, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        logStep("Wallet updated", { newBalance: (existing.balance || 0) + creditsFromMeta });
      } else {
        await supabaseClient
          .from('structure_wallets')
          .insert({ user_id: user.id, structure_id: structureId, balance: creditsFromMeta });
        logStep("Wallet created", { balance: creditsFromMeta });
      }

      // Update transaction with credits info
      if (existingTx) {
        await supabaseClient
          .from('transactions')
          .update({ credits_purchased: creditsFromMeta, structure_id: structureId })
          .eq('id', existingTx.id);
      }
    }

    return new Response(JSON.stringify({ status: 'completed', credits_added: creditsFromMeta || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
