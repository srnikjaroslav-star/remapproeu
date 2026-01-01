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

    const { priceId, successUrl, cancelUrl } = await req.json();

    if (!priceId) {
      throw new Error("priceId is required");
    }

    console.log("Creating checkout session for priceId:", priceId);

    // Create checkout session using Stripe REST API
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        "mode": "payment",
        "success_url": successUrl || `${req.headers.get("origin")}/success`,
        "cancel_url": cancelUrl || `${req.headers.get("origin")}/pricing`,
      }),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error("Stripe error:", session);
      throw new Error(session.error?.message || "Failed to create checkout session");
    }

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
