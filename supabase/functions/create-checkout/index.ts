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

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    const { serviceNames, totalAmount, successUrl, cancelUrl, clientReferenceId, customerEmail, customerNote } = await req.json();

    // Validate totalAmount
    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      throw new Error("Invalid totalAmount: must be a positive number");
    }

    // Validate serviceNames
    if (!serviceNames || !Array.isArray(serviceNames) || serviceNames.length === 0) {
      throw new Error("At least one service name is required");
    }

    // Build description from service names
    const description = serviceNames.join(", ");

    console.log("Creating checkout session:");
    console.log("Service names:", description);
    console.log("Total amount (EUR):", totalAmount);
    console.log("Unit amount in cents:", Math.round(totalAmount * 100));
    console.log("Client reference ID:", clientReferenceId);
    console.log("Customer email:", customerEmail);

    // Create checkout session using Stripe SDK with price_data (no Price IDs)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { 
            name: `REMAPPRO Services: ${description}` 
          },
          unit_amount: Math.round(totalAmount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl || `${req.headers.get('origin')}/success`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/order`,
      client_reference_id: clientReferenceId || undefined,
      customer_email: customerEmail || undefined,
      metadata: {
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
