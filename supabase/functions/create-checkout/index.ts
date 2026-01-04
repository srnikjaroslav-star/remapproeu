import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const { items, email, successUrl, cancelUrl, metadata } = await req.json();

    console.log('Received request body:', { items, email, metadata });

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one line item is required');
    }

    if (!email || !email.includes('@')) {
      throw new Error('Valid email address is required');
    }

    // Validate items - expect { name, amount } where amount is in EUR
    for (const item of items) {
      if (!item || typeof item.name !== 'string' || item.name.trim().length === 0) {
        throw new Error('Each item must have a valid name');
      }
      if (typeof item.amount !== 'number' || item.amount <= 0) {
        throw new Error('Each item must have a positive amount (in EUR)');
      }
    }

    const origin = req.headers.get('origin') || '';
    const finalSuccessUrl = successUrl || (origin ? `${origin}/success` : '');
    const finalCancelUrl = cancelUrl || (origin ? `${origin}/order` : '');

    if (!finalSuccessUrl || !finalCancelUrl) {
      throw new Error('Missing successUrl/cancelUrl (and Origin header fallback was empty)');
    }

    const totalAmountEur = items.reduce((sum: number, item: any) => sum + item.amount, 0);
    const description = items.map((i: any) => i.name).join(', ');

    console.log('Creating checkout session with promo codes enabled (v4):');
    console.log('Items:', items);
    console.log('Total amount (EUR):', totalAmountEur);
    console.log('Metadata:', metadata);

    const line_items = items.map((item: any) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.amount * 100), // Convert EUR to cents for Stripe
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      client_reference_id: metadata?.orderId || undefined,
      customer_email: email,
      allow_promotion_codes: true,
      metadata: {
        order_id: metadata?.orderId || '',
        services: description,
        total_amount_eur: totalAmountEur.toFixed(2),
        order_type: metadata?.orderType || 'tuning',
        source: metadata?.source || 'web',
        customer_note: metadata?.customerNote || '',
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
