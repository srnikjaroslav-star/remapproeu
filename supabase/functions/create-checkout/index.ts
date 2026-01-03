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

    const { items, successUrl, cancelUrl, clientReferenceId, customerEmail, customerNote } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one line item is required');
    }

    // Validate items
    for (const item of items) {
      if (!item || typeof item.name !== 'string' || item.name.trim().length === 0) {
        throw new Error('Each item must have a valid name');
      }
      if (typeof item.price !== 'number' || item.price <= 0) {
        throw new Error('Each item must have a positive price');
      }
    }

    const origin = req.headers.get('origin') || '';
    const finalSuccessUrl = successUrl || (origin ? `${origin}/success` : '');
    const finalCancelUrl = cancelUrl || (origin ? `${origin}/order` : '');

    if (!finalSuccessUrl || !finalCancelUrl) {
      throw new Error('Missing successUrl/cancelUrl (and Origin header fallback was empty)');
    }

    const totalAmount = items.reduce((sum: number, item: any) => sum + item.price, 0);
    const description = items.map((i: any) => i.name).join(', ');

    console.log('Creating checkout session:');
    console.log('Items:', items);
    console.log('Total amount (EUR):', totalAmount);
    console.log('Client reference ID:', clientReferenceId);

    const line_items = items.map((item: any) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      client_reference_id: clientReferenceId || undefined,
      customer_email: customerEmail || undefined,
      allow_promotion_codes: true, // Enable promo/coupon codes for testing
      metadata: {
        order_id: clientReferenceId || '',
        services: description,
        total_amount: totalAmount.toFixed(2),
        ...(customerNote && { customer_note: customerNote }),
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
