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

    const { serviceNames, totalAmount, clientReferenceId } = await req.json();

    // Validate totalAmount
    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      throw new Error("Invalid totalAmount: must be a positive number");
    }

    // Validate serviceNames
    if (!serviceNames || !Array.isArray(serviceNames) || serviceNames.length === 0) {
      throw new Error("At least one service name is required");
    }

    const origin = req.headers.get('origin');
    if (!origin) {
      throw new Error('Missing Origin header');
    }

    const orderId = clientReferenceId;

    console.log("Creating checkout session:");
    console.log("Total amount (EUR):", totalAmount);
    console.log("Order ID:", orderId);

    // Prevod celkovej ceny na centy (integer)
    const unitAmount = Math.round(totalAmount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Chiptuning Service - Custom Order',
            description: 'Professional software optimization',
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/success`,
      cancel_url: `${origin}/order`,
      metadata: {
        order_id: orderId || '',
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
