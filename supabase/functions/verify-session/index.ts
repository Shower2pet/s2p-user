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

async function processStripeSession(
  stripe: Stripe,
  supabaseClient: any,
  userId: string,
  stripeSessionId: string,
  txId?: string,
): Promise<{ status: string; credits_added: number }> {
  logStep("Processing session", { stripeSessionId, txId });

  const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
  logStep("Stripe status", { payment_status: session.payment_status });

  if (session.payment_status !== 'paid') {
    return { status: 'not_paid', credits_added: 0 };
  }

  // Update transaction to COMPLETED
  if (txId) {
    await supabaseClient
      .from('transactions')
      .update({ status: 'COMPLETED' })
      .eq('id', txId);
    logStep("Transaction marked COMPLETED", { txId });
  }

  // Handle credit pack
  const productType = session.metadata?.product_type;
  const structureId = session.metadata?.structure_id;
  const creditsFromMeta = parseInt(session.metadata?.credits || '0', 10);

  if (productType === 'credit_pack' && structureId && creditsFromMeta > 0) {
    logStep("Adding credits", { structureId, credits: creditsFromMeta });

    const { data: existing } = await supabaseClient
      .from('structure_wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .eq('structure_id', structureId)
      .maybeSingle();

    if (existing) {
      const newBalance = (existing.balance || 0) + creditsFromMeta;
      await supabaseClient
        .from('structure_wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      logStep("Wallet updated", { newBalance });
    } else {
      await supabaseClient
        .from('structure_wallets')
        .insert({ user_id: userId, structure_id: structureId, balance: creditsFromMeta });
      logStep("Wallet created", { balance: creditsFromMeta });
    }

    // Update transaction with credits info
    if (txId) {
      await supabaseClient
        .from('transactions')
        .update({ credits_purchased: creditsFromMeta, structure_id: structureId })
        .eq('id', txId);
    }

    return { status: 'completed', credits_added: creditsFromMeta };
  }

  // Handle session payment — just mark completed
  return { status: 'completed', credits_added: 0 };
}

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

    const body = await req.json();
    const { session_id, process_all_pending } = body;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Mode 1: Process a specific session
    if (session_id) {
      // Check if already completed
      const { data: existingTx } = await supabaseClient
        .from('transactions')
        .select('id, status')
        .eq('stripe_payment_id', session_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingTx?.status === 'COMPLETED') {
        return new Response(JSON.stringify({ status: 'already_completed' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await processStripeSession(stripe, supabaseClient, user.id, session_id, existingTx?.id);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Process ALL pending credit topup transactions for this user
    if (process_all_pending) {
      logStep("Processing all pending for user", { userId: user.id });

      const { data: pendingTxs, error: txErr } = await supabaseClient
        .from('transactions')
        .select('id, stripe_payment_id, transaction_type')
        .eq('user_id', user.id)
        .eq('status', 'PENDING')
        .not('stripe_payment_id', 'is', null);

      if (txErr) throw new Error("Error fetching pending transactions");

      let totalCreditsAdded = 0;
      let processedCount = 0;

      for (const tx of (pendingTxs || [])) {
        try {
          const result = await processStripeSession(stripe, supabaseClient, user.id, tx.stripe_payment_id, tx.id);
          totalCreditsAdded += result.credits_added;
          if (result.status === 'completed') processedCount++;
        } catch (err) {
          logStep("Error processing tx", { txId: tx.id, error: (err as Error).message });
        }
      }

      logStep("Batch processing complete", { processedCount, totalCreditsAdded });
      return new Response(JSON.stringify({ 
        status: 'batch_completed', 
        processed: processedCount, 
        credits_added: totalCreditsAdded 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Provide session_id or process_all_pending");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
