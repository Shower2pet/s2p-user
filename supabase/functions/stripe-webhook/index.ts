import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // Verify webhook signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Signature verification failed", { message: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    logStep("Webhook verified and received", { type: event.type });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { sessionId: session.id });

        // Update transaction status
        const { error } = await supabaseClient
          .from('transactions')
          .update({ 
            status: 'completed',
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq('stripe_session_id', session.id);

        if (error) {
          logStep("Error updating transaction", { error: error.message });
        } else {
          logStep("Transaction updated to completed");
        }

        // Add credits if it's a credit pack purchase
        const userId = session.metadata?.user_id;
        const productType = session.metadata?.product_type;

        if (userId && productType === 'credit_pack') {
          // Get the amount paid and calculate credits
          const amountPaid = session.amount_total || 0;
          let creditsToAdd = 0;

          // Map price amounts to credits (in cents)
          if (amountPaid === 1000) creditsToAdd = 12; // €10 pack
          else if (amountPaid === 2000) creditsToAdd = 25; // €20 pack

          if (creditsToAdd > 0) {
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('credits')
              .eq('user_id', userId)
              .single();

            const currentCredits = profile?.credits || 0;
            
            await supabaseClient
              .from('profiles')
              .update({ credits: currentCredits + creditsToAdd })
              .eq('user_id', userId);

            logStep("Credits added", { userId, creditsToAdd, newTotal: currentCredits + creditsToAdd });
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        await supabaseClient
          .from('transactions')
          .update({ status: 'expired' })
          .eq('stripe_session_id', session.id);

        logStep("Transaction marked as expired", { sessionId: session.id });
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
