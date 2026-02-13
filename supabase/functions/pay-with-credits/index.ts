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

    const { station_id, option_id } = await req.json();
    if (!station_id || option_id === undefined) {
      throw new Error("station_id and option_id are required");
    }

    logStep("Request", { userId: user.id, station_id, option_id });

    // Get station and resolve option price
    const { data: station, error: stationErr } = await supabaseClient
      .from('stations')
      .select('structure_id, washing_options, type')
      .eq('id', station_id)
      .maybeSingle();

    if (stationErr || !station) throw new Error("Station not found");
    if (!station.structure_id) throw new Error("Station has no structure");

    const options = (station.washing_options as any[]) || [];
    const option = options.find((o: any) => o.id === option_id);
    if (!option) throw new Error("Washing option not found");

    const price = option.price;
    const optionName = option.name || 'Wash session';
    const optionDuration = option.duration || 300;

    logStep("Option resolved", { price, optionName, optionDuration });

    // Check wallet balance
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

    // Deduct from wallet
    const newBalance = balance - price;
    const { error: updateErr } = await supabaseClient
      .from('structure_wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet!.id);

    if (updateErr) throw new Error("Error deducting credits");
    logStep("Wallet deducted", { oldBalance: balance, newBalance });

    // Create transaction
    const { error: txErr } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        total_value: price,
        amount_paid_wallet: price,
        amount_paid_stripe: 0,
        transaction_type: 'WASH_SERVICE',
        station_id,
        structure_id: station.structure_id,
        status: 'COMPLETED',
        payment_method: 'CREDITS',
      });

    if (txErr) logStep("Error creating transaction", { error: txErr.message });

    // Create wash session
    const now = new Date();
    const endsAt = new Date(now.getTime() + optionDuration * 1000);

    const { error: wsErr } = await supabaseClient
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
      });

    if (wsErr) logStep("Error creating wash session", { error: wsErr.message });
    else logStep("Wash session created");

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
