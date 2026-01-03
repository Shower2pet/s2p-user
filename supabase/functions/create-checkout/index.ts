import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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
    logStep("Function started");

    const { 
      amount, // Amount in cents (e.g., 1000 = €10.00)
      currency = 'eur',
      productName,
      description = '',
      mode = 'payment', // 'payment' or 'subscription'
      productType = 'session', // 'session', 'credit_pack', 'subscription'
      interval, // For subscriptions: 'day', 'week', 'month', 'year'
      intervalCount = 1, // How many intervals between billings
      quantity = 1,
      credits = 0, // Credits to add on success
    } = await req.json();
    
    logStep("Request params", { amount, currency, productName, mode, productType, interval });

    if (!amount || amount <= 0) {
      throw new Error("Valid amount is required");
    }

    if (!productName) {
      throw new Error("Product name is required");
    }

    if (mode === 'subscription' && !interval) {
      throw new Error("Interval is required for subscriptions");
    }

    const authHeader = req.headers.get("Authorization");
    let userEmail: string | undefined;
    let userId: string | undefined;
    let customerId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      const user = data.user;
      
      if (user?.email) {
        userEmail = user.email;
        userId = user.id;
        logStep("User authenticated", { email: userEmail, userId });

        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });

        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          logStep("Found existing Stripe customer", { customerId });
        }
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://hvltamnpmwstdtkftplz.lovable.app";

    // Build price_data based on mode
    let priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData;
    
    if (mode === 'subscription') {
      priceData = {
        currency: currency,
        product_data: {
          name: productName,
          description: description || undefined,
        },
        unit_amount: amount,
        recurring: {
          interval: interval as 'day' | 'week' | 'month' | 'year',
          interval_count: intervalCount,
        },
      };
    } else {
      priceData = {
        currency: currency,
        product_data: {
          name: productName,
          description: description || undefined,
        },
        unit_amount: amount,
      };
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price_data: priceData,
          quantity: quantity,
        },
      ],
      mode: mode as 'payment' | 'subscription',
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: {
        user_id: userId || '',
        product_type: productType,
        description: description,
        credits: credits.toString(),
      },
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (userEmail) {
      sessionParams.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, amount, productName });

    // Create transaction record if user is authenticated
    if (userId) {
      const { error: txError } = await supabaseClient
        .from('transactions')
        .insert({
          user_id: userId,
          stripe_session_id: session.id,
          amount: amount,
          currency: currency,
          description: description || productName,
          product_type: productType,
          status: 'pending',
        });

      if (txError) {
        logStep("Error creating transaction record", { error: txError.message });
      } else {
        logStep("Transaction record created", { sessionId: session.id });
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
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
