const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServiceItem {
  priceId: string;
  name: string;
  price: number;
}

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

    const { services, successUrl, cancelUrl, clientReferenceId, customerEmail, customerNote } = await req.json();

    // Validate services array
    if (!services || !Array.isArray(services) || services.length === 0) {
      throw new Error("At least one service is required");
    }

    console.log("Creating checkout session for services:", JSON.stringify(services));
    console.log("Client reference ID:", clientReferenceId);
    console.log("Customer email:", customerEmail);
    console.log("Customer note:", customerNote);

    // Validate and calculate total price in cents
    let totalAmountCents = 0;
    for (const service of services) {
      const priceValue = typeof service.price === 'string' ? parseFloat(service.price) : service.price;
      if (isNaN(priceValue) || priceValue <= 0) {
        console.error("Invalid price for service:", service.name, "price:", service.price);
        throw new Error(`Invalid price for service: ${service.name}`);
      }
      const priceInCents = Math.round(priceValue * 100);
      console.log(`Service: ${service.name}, Price: €${priceValue}, Cents: ${priceInCents}`);
      totalAmountCents += priceInCents;
    }

    // Build service names for description
    const serviceNames = services.map((s: ServiceItem) => s.name).join(", ");

    console.log("Total amount (cents):", totalAmountCents);
    console.log("Services:", serviceNames);

    // Build form data for Stripe API with dynamic pricing
    const formData = new URLSearchParams({
      "mode": "payment",
      "success_url": successUrl || `${req.headers.get("origin")}/success`,
      "cancel_url": cancelUrl || `${req.headers.get("origin")}/order`,
    });

    // Add each service as a line item with price_data (dynamic pricing)
    services.forEach((service: ServiceItem, index: number) => {
      const priceValue = typeof service.price === 'string' ? parseFloat(service.price) : service.price;
      const priceInCents = Math.round(priceValue * 100);
      
      console.log(`Final amount being sent to Stripe for ${service.name}:`, priceInCents);
      
      formData.append(`line_items[${index}][price_data][currency]`, "eur");
      formData.append(`line_items[${index}][price_data][product_data][name]`, service.name);
      formData.append(`line_items[${index}][price_data][unit_amount]`, priceInCents.toString());
      formData.append(`line_items[${index}][quantity]`, "1");
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
    formData.append("metadata[services]", serviceNames);
    formData.append("metadata[total_amount]", (totalAmountCents / 100).toFixed(2));
    
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
