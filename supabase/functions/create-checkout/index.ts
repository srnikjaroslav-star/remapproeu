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

    const { serviceNames, totalAmount, successUrl, cancelUrl, clientReferenceId, customerEmail, customerNote } = await req.json();

    // Validate totalAmount
    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      throw new Error("Invalid totalAmount: must be a positive number");
    }

    // Validate serviceNames
    if (!serviceNames || !Array.isArray(serviceNames) || serviceNames.length === 0) {
      throw new Error("At least one service name is required");
    }

    // Convert to cents (integer)
    const unitAmountCents = Math.round(totalAmount * 100);
    
    // Build description from service names
    const description = serviceNames.join(", ");

    console.log("Creating checkout session:");
    console.log("Service names:", description);
    console.log("Total amount (EUR):", totalAmount);
    console.log("Final amount being sent to Stripe (cents):", unitAmountCents);
    console.log("Client reference ID:", clientReferenceId);
    console.log("Customer email:", customerEmail);

    // Build form data for Stripe API with single line item using price_data
    const formData = new URLSearchParams({
      "mode": "payment",
      "success_url": successUrl || `${req.headers.get("origin")}/success`,
      "cancel_url": cancelUrl || `${req.headers.get("origin")}/order`,
      // Single line item with dynamic price_data
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][product_data][name]": `REMAPPRO Services: ${description}`,
      "line_items[0][price_data][unit_amount]": unitAmountCents.toString(),
      "line_items[0][quantity]": "1",
    });

    // Add client_reference_id if provided (for order tracking)
    if (clientReferenceId) {
      formData.append("client_reference_id", clientReferenceId);
    }

    // Add customer email if provided
    if (customerEmail) {
      formData.append("customer_email", customerEmail);
    }

    // Add metadata
    formData.append("metadata[services]", description);
    formData.append("metadata[total_amount]", totalAmount.toFixed(2));
    
    if (customerNote) {
      formData.append("metadata[customer_note]", customerNote);
    }

    // Create checkout session using Stripe REST API
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
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
