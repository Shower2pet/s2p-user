import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAY-WITH-CREDITS] ${step}${detailsStr}`);
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
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const user = authData.user;
    if (!user) throw new Error("User not authenticated");

    const { station_id, option_id, use_subscription, subscription_id } = await req.json();
    if (!station_id || option_id === undefined) {
      throw new Error("station_id and option_id are required");
    }

    logStep("Request", { userId: user.id, station_id, option_id, use_subscription });

    // Get station and resolve option
    const { data: station, error: stationErr } = await supabaseClient
      .from('stations')
      .select('structure_id, washing_options, type, status, last_heartbeat_at')
      .eq('id', station_id)
      .maybeSingle();

    if (stationErr || !station) throw new Error("Station not found");
    if (!station.structure_id) throw new Error("Station has no structure");

    // ─── PRE-PAYMENT FRESHNESS CHECK ────────────────────────
    if (station.status !== 'AVAILABLE') {
      return new Response(JSON.stringify({ error: "Stazione non disponibile" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const heartbeatAge = station.last_heartbeat_at
      ? Date.now() - new Date(station.last_heartbeat_at).getTime()
      : Infinity;
    const FRESHNESS_THRESHOLD_MS = 90 * 1000; // 90 seconds

    if (heartbeatAge > FRESHNESS_THRESHOLD_MS) {
      logStep("Station heartbeat stale", { heartbeatAge, threshold: FRESHNESS_THRESHOLD_MS });
      return new Response(JSON.stringify({ error: "Stazione non raggiungibile. Riprova tra qualche minuto." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    logStep("Station freshness OK", { heartbeatAgeMs: heartbeatAge });

    const options = (station.washing_options as any[]) || [];
    const option = options.find((o: any) => o.id === option_id);
    if (!option) throw new Error("Washing option not found");

    const price = option.price;
    const optionName = option.name || 'Wash session';
    const optionDuration = option.duration || 300;
    const durationMinutes = Math.ceil(optionDuration / 60);

    logStep("Option resolved", { price, optionName, optionDuration });

    // ─── PAYMENT PHASE ─────────────────────────────────────
    let walletId: string | null = null;
    let oldBalance = 0;

    if (use_subscription && subscription_id) {
      // Subscription payment: increment washes_used_this_period
      const { data: sub, error: subErr } = await supabaseClient
        .from('user_subscriptions')
        .select('id, washes_used_this_period, plan_id')
        .eq('id', subscription_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subErr || !sub) throw new Error("Active subscription not found");

      // Check wash limit
      const { data: plan } = await supabaseClient
        .from('subscription_plans')
        .select('max_washes_per_month')
        .eq('id', sub.plan_id)
        .maybeSingle();

      const usedWashes = sub.washes_used_this_period || 0;
      if (plan?.max_washes_per_month && usedWashes >= plan.max_washes_per_month) {
        return new Response(JSON.stringify({ error: "Monthly wash limit reached" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      await supabaseClient
        .from('user_subscriptions')
        .update({ washes_used_this_period: usedWashes + 1 })
        .eq('id', sub.id);

      logStep("Subscription wash counted", { usedWashes: usedWashes + 1 });
    } else {
      // Credit payment
      const { data: wallet, error: walletErr } = await supabaseClient
        .from('structure_wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .eq('structure_id', station.structure_id)
        .maybeSingle();

      if (walletErr) throw new Error("Error checking wallet");

      const balance = wallet?.balance || 0;
      if (balance < price) {
        return new Response(JSON.stringify({ error: "Insufficient credits", balance, required: price }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      walletId = wallet!.id;
      oldBalance = balance;
      const newBalance = balance - price;

      const { error: updateErr } = await supabaseClient
        .from('structure_wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', walletId);

      if (updateErr) throw new Error("Error deducting credits");
      logStep("Wallet deducted", { oldBalance, newBalance });
    }

    // Hardware activation is now handled by the frontend (StationTimer "Avvia Servizio")
    // This function only handles payment/deduction

    // ─── SUCCESS: CREATE RECORDS ────────────────────────────
    // Create transaction
    const { error: txErr } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        total_value: use_subscription ? 0 : price,
        amount_paid_wallet: use_subscription ? 0 : price,
        amount_paid_stripe: 0,
        transaction_type: 'WASH_SERVICE',
        station_id,
        structure_id: station.structure_id,
        status: 'COMPLETED',
        payment_method: use_subscription ? 'CREDITS' : 'CREDITS',
      });

    if (txErr) logStep("Error creating transaction", { error: txErr.message });

    // Create wash session
    const now = new Date();
    const endsAt = new Date(now.getTime() + optionDuration * 1000);

    const { data: wsData, error: wsErr } = await supabaseClient
      .from('wash_sessions')
      .insert({
        station_id,
        user_id: user.id,
        option_id,
        option_name: optionName,
        total_seconds: optionDuration,
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        step: 'ready',
        status: 'ACTIVE',
      })
      .select('id')
      .single();

    if (wsErr) logStep("Error creating wash session", { error: wsErr.message });
    else logStep("Wash session created", { sessionId: wsData?.id });
    // Nota: i pagamenti con crediti NON generano scontrino fiscale.
    // Lo scontrino viene emesso solo per pagamenti Stripe (gestito dal stripe-webhook).

    const newBalance = walletId ? oldBalance - price : undefined;

    return new Response(JSON.stringify({ success: true, newBalance }), {
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
