import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const body = await req.json();
    let { 
      amount, // Amount in cents (e.g., 1000 = €10.00)
      currency = 'eur',
      productName,
      description = '',
      mode = 'payment', // 'payment' or 'subscription'
      productType = 'session', // 'session', 'credit_pack', 'subscription'
      interval, // For subscriptions: 'day', 'week', 'month', 'year'
      intervalCount = 1,
      quantity = 1,
      credits = 0,
      station_id, // Optional: resolve price from washing_options
      option_id, // Optional: which washing option was selected
      success_url: customSuccessUrl,
      cancel_url: customCancelUrl,
    } = body;

    // Look up station metadata and resolve price from washing_options
    let station_type: string | undefined;
    let station_category: string | undefined;
    if (station_id) {
      const { data: stationData, error: stationError } = await supabaseClient
        .from('stations')
        .select('type, category, washing_options')
        .eq('id', station_id)
        .maybeSingle();
      
      if (stationError) {
        logStep("Error looking up station", { error: stationError.message });
      }
      if (stationData) {
        station_type = stationData.type;
        station_category = stationData.category || (stationData.type === 'BRACCO' ? 'SHOWER' : 'TUB');
        logStep("Station metadata", { station_type, station_category });

        // Resolve price from washing_options if option_id provided
        if (stationData.washing_options && option_id) {
          const options = stationData.washing_options as any[];
          const option = options.find((o: any) => o.id === option_id);
          if (option) {
            // Server-side values take priority over client-sent values
            amount = Math.round(option.price * 100); // convert to cents
            productName = option.name;
            logStep("Resolved price from washing_options", { option_id, amount, productName });
          }
        }
      }
    }
    
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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      const user = data.user;
      
      if (user?.email) {
        userEmail = user.email;
        userId = user.id;
        logStep("User authenticated", { email: userEmail, userId });

        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          logStep("Found existing Stripe customer", { customerId });
        }
      }
    }

    const requestOrigin = req.headers.get("origin") || "https://s2p-user.lovable.app";
    const successUrl = customSuccessUrl || `${requestOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = customCancelUrl || `${requestOrigin}/`;

    // Build dynamic price_data
    let priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData;
    
    if (mode === 'subscription') {
      priceData = {
        currency,
        product_data: { name: productName, description: description || undefined },
        unit_amount: amount,
        recurring: {
          interval: interval as 'day' | 'week' | 'month' | 'year',
          interval_count: intervalCount,
        },
      };
    } else {
      priceData = {
        currency,
        product_data: { name: productName, description: description || undefined },
        unit_amount: amount,
      };
    }
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price_data: priceData, quantity }];

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: mode as 'payment' | 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId || '',
        product_type: productType,
        description: description,
        credits: credits.toString(),
        station_type: station_type || '',
        station_category: station_category || '',
      },
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (userEmail) {
      sessionParams.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Create transaction record if user is authenticated
    if (userId) {
      const { error: txError } = await supabaseClient
        .from('transactions')
        .insert({
          user_id: userId,
          stripe_payment_id: session.id,
          total_value: amount / 100, // convert cents to euros
          amount_paid_stripe: amount / 100,
          transaction_type: productType === 'credit_pack' ? 'CREDIT_TOPUP' : 'WASH_SERVICE',
          station_id: station_id || null,
          status: 'PENDING',
          payment_method: 'STRIPE',
        });

      if (txError) {
        logStep("Error creating transaction record", { error: txError.message });
      } else {
        logStep("Transaction record created");
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
