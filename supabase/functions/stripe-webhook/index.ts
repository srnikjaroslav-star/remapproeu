import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDER = "REMAPPRO <info@remappro.eu>";
const SITE_URL = "https://remappro.eu";
const ADMIN_EMAIL = "srnik.jaroslav@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  console.log("Stripe webhook received:", req.method);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    const body = await req.text();
    console.log("Received body length:", body.length);

    // Verify webhook signature if secret is configured
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const signature = req.headers.get("stripe-signature");
    
    let event;
    
    if (STRIPE_WEBHOOK_SECRET && signature) {
      // Use Stripe signature verification
      const crypto = await import("https://deno.land/std@0.190.0/crypto/mod.ts");
      const encoder = new TextEncoder();
      
      // Parse signature header
      const sigParts = signature.split(",").reduce((acc, part) => {
        const [key, value] = part.split("=");
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      const timestamp = sigParts["t"];
      const expectedSig = sigParts["v1"];
      
      if (!timestamp || !expectedSig) {
        console.error("Invalid signature format");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Check timestamp tolerance (5 minutes)
      const tolerance = 300;
      const timestampNum = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestampNum) > tolerance) {
        console.error("Webhook timestamp too old");
        return new Response(JSON.stringify({ error: "Timestamp too old" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Compute expected signature
      const signedPayload = `${timestamp}.${body}`;
      const key = await crypto.crypto.subtle.importKey(
        "raw",
        encoder.encode(STRIPE_WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBytes = await crypto.crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(signedPayload)
      );
      const computedSig = Array.from(new Uint8Array(signatureBytes))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      
      if (computedSig !== expectedSig) {
        console.error("Signature mismatch");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      console.log("Webhook signature verified successfully");
    }
    
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      console.error("Failed to parse webhook body:", parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Webhook event type:", event.type);

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const sessionId = session.id; // cs_live_... or cs_test_...
      console.log("Checkout session completed:", sessionId);
      console.log("Session metadata:", JSON.stringify(session.metadata));
      
      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName = session.customer_details?.name || session.metadata?.customer_name || "Customer";
      // Extract customer_note from session.metadata (Additional info from form)
      const customerNote = session.metadata?.customer_note || "";
      const amountTotal = session.amount_total ? (session.amount_total / 100).toFixed(2) : "0";
      
      console.log("Customer note from metadata:", customerNote);
      
      // CRITICAL: Extract ALL 5 fields from session.metadata
      // These must match the keys sent from stripe.ts: brand, model, fuel_type, year, file_url
      // And map to DB columns: car_brand, car_model, fuel_type, year, file_url
      
      // 1. Brand - maps to car_brand in DB
      const carBrand = session.metadata?.brand || session.metadata?.car_brand || "";
      
      // 2. Model - maps to car_model in DB
      const carModel = session.metadata?.model || session.metadata?.car_model || "";
      
      // 3. Fuel type - maps to fuel_type in DB
      const fuelTypeRaw = session.metadata?.fuel_type || "";
      const fuelType = (fuelTypeRaw === "Diesel" || fuelTypeRaw === "Petrol") ? fuelTypeRaw : "";
      
      // 4. Year - maps to year in DB (TEXT column)
      // CRITICAL: Extract from session.metadata.year and ensure it's a valid year
      const yearRaw = session.metadata?.year;
      let year: string | null = null;
      if (yearRaw && yearRaw.toString().trim()) {
        const yearStr = yearRaw.toString().trim();
        const parsedYear = parseInt(yearStr);
        if (!isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= 2100) {
          year = parsedYear.toString(); // Store as string for TEXT column
        } else {
          console.warn("Invalid year value:", yearRaw, "-> parsed:", parsedYear);
        }
      } else {
        console.warn("Year is missing or empty in metadata:", yearRaw);
      }
      
      // 5. File URL - maps to file_url in DB
      const fileUrlRaw = session.metadata?.file_url || null;
      let fileUrl: string | null = null;
      if (fileUrlRaw && fileUrlRaw.trim()) {
        // If it's a full URL, extract just the file name
        // Otherwise, assume it's already just the file name
        if (fileUrlRaw.includes('/')) {
          // Extract file name from URL (last part after last slash)
          const urlParts = fileUrlRaw.split('/');
          fileUrl = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params if any
        } else {
          // Already just the file name
          fileUrl = fileUrlRaw.trim();
        }
      }
      
      const ecuType = session.metadata?.ecu_type || "";
      const legalConsent = session.metadata?.legal_consent === "true";
      
      // VIN: Use null if empty or not provided (matches DB column type)
      const vinRaw = session.metadata?.vin || "";
      const vin = vinRaw.trim() ? vinRaw.trim().toUpperCase() : null;
      
      // Parse services from metadata
      let serviceTypes: string[] = [];
      try {
        serviceTypes = session.metadata?.services ? JSON.parse(session.metadata.services) : [];
      } catch {
        serviceTypes = session.metadata?.services ? [session.metadata.services] : [];
      }
      
      console.log("=== STRIPE WEBHOOK DEBUG ===");
      console.log("Session metadata:", JSON.stringify(session.metadata, null, 2));
      console.log("Customer email:", customerEmail);
      console.log("Customer name:", customerName);
      console.log("=== EXTRACTED FROM METADATA ===");
      console.log("1. brand (-> car_brand):", session.metadata?.brand, "->", carBrand);
      console.log("2. model (-> car_model):", session.metadata?.model, "->", carModel);
      console.log("3. fuel_type (-> fuel_type):", session.metadata?.fuel_type, "->", fuelType);
      console.log("4. year (-> year):", {
        'session.metadata.year (raw)': session.metadata?.year,
        'session.metadata.year (type)': typeof session.metadata?.year,
        'extracted year': year,
        'year is null': year === null,
      });
      console.log("5. file_url (-> file_url):", session.metadata?.file_url, "->", fileUrl);
      console.log("Car:", carBrand, carModel, "Fuel:", fuelType, "Year:", year, "VIN:", vin);
      console.log("Services:", serviceTypes);

      // Create Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Generate unique order number with random suffix for uniqueness
      const timestamp = Date.now().toString(36).toUpperCase();
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const orderNumber = `RP-${timestamp}${randomSuffix}`;
      
      // ATOMIC: Create order in database FIRST - this is the source of truth
      // Extract ALL 5 fields from session.metadata and map to DB columns
      const orderData: any = {
        order_number: orderNumber,
        customer_name: customerName,
        customer_email: customerEmail?.toLowerCase() || "",
        // CRITICAL: Map all 5 fields from metadata to DB columns
        car_brand: carBrand || null,  // From session.metadata.brand
        car_model: carModel || null,  // From session.metadata.model
        fuel_type: fuelType || null,  // From session.metadata.fuel_type
        year: year,  // From session.metadata.year (as string for TEXT column)
        file_url: fileUrl,  // From session.metadata.file_url
        ecu_type: ecuType || null,
        vin: vin,  // VIN column - null if not provided
        service_type: serviceTypes.length > 0 ? serviceTypes : null,
        total_price: parseFloat(amountTotal),
        status: "paid",
        legal_consent: legalConsent,
        customer_note: customerNote || null,
        stripe_session_id: sessionId,
      };
      
      // Log the data being inserted for debugging
      console.log("=== INSERTING INTO DB ===");
      console.log("Inserting into DB:", JSON.stringify(orderData, null, 2));
      console.log("=== MAPPING VERIFICATION ===");
      console.log("1. session.metadata.brand -> car_brand:", session.metadata?.brand, "->", orderData.car_brand);
      console.log("2. session.metadata.model -> car_model:", session.metadata?.model, "->", orderData.car_model);
      console.log("3. session.metadata.fuel_type -> fuel_type:", session.metadata?.fuel_type, "->", orderData.fuel_type);
      console.log("4. session.metadata.year -> year:", {
        'metadata.year (raw)': session.metadata?.year,
        'metadata.year (type)': typeof session.metadata?.year,
        'extracted year': year,
        'orderData.year': orderData.year,
        'year is null': orderData.year === null,
      });
      console.log("5. session.metadata.file_url -> file_url:", session.metadata?.file_url, "->", orderData.file_url);
      console.log("6. session.metadata.customer_note -> customer_note:", session.metadata?.customer_note, "->", orderData.customer_note);
      
      console.log("ATOMIC: Creating order with data:", JSON.stringify(orderData));
      
      // Use RETURNING to get the actual order_number from DB
      const { data: newOrder, error: insertError } = await supabase
        .from("orders")
        .insert([orderData])
        .select("id, order_number, customer_email, created_at")
        .single();
      
      if (insertError || !newOrder) {
        console.error("=== CRITICAL DB ERROR - Failed to create order ===");
        console.error("Insert error:", JSON.stringify({
          error: insertError?.message,
          code: insertError?.code,
          details: insertError?.details,
          hint: insertError?.hint,
          status: insertError?.status,
        }, null, 2));
        console.error("Order data that failed:", JSON.stringify({
          ...orderData,
          file_url: orderData.file_url ? `[FILE: ${orderData.file_url}]` : "[NULL]",
        }, null, 2));
        console.error("Possible causes:");
        console.error("- RLS (Row Level Security) policy blocking insert");
        console.error("- Type mismatch (e.g., year should be TEXT, not INTEGER)");
        console.error("- Missing required fields");
        console.error("- Invalid data format");
        
        // Return 500 to tell Stripe to retry
        return new Response(JSON.stringify({ 
          error: "Failed to create order", 
          details: insertError?.message,
          code: insertError?.code,
          hint: insertError?.hint,
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // CRITICAL: Use the order_number returned from DB, not the generated one
      const confirmedOrderNumber = newOrder.order_number;
      const confirmedOrderId = newOrder.id;
      
      if (!confirmedOrderNumber) {
        console.error("CRITICAL: DB returned order but order_number is null/empty:", newOrder);
        return new Response(JSON.stringify({ 
          error: "Order created but order_number is missing",
          orderId: confirmedOrderId
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      console.log("ATOMIC: Order created successfully - ID:", confirmedOrderId, "Order#:", confirmedOrderNumber);

      // Send order confirmation email to customer IMMEDIATELY after order creation
      try {
        console.log("Sending order confirmation email to customer");
        const confirmationRes = await fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            orderId: confirmedOrderId,
            orderNumber: confirmedOrderNumber,
            customerEmail,
            customerName,
            totalAmount: session.amount_total ? parseFloat((session.amount_total / 100).toFixed(2)) : 0,
            brand: carBrand,
            model: carModel,
            fuelType,
            year,
            vin,
            createdAt: newOrder.created_at || new Date().toISOString(),
          }),
        });
        
        const confirmationResult = await confirmationRes.json();
        console.log("Order confirmation email result:", confirmationResult);
      } catch (confirmationError) {
        console.error("Order confirmation email failed (non-fatal):", confirmationError);
        // Continue - don't fail the webhook, order is already saved
      }

      // Build line items for invoice from session
      const lineItems: { name: string; price: number }[] = [];
      if (session.line_items?.data) {
        for (const item of session.line_items.data) {
          lineItems.push({
            name: item.description || item.price?.product?.name || "Service",
            price: (item.amount_total || 0) / 100,
          });
        }
      } else if (session.amount_total) {
        // Fallback: use services from metadata if available
        if (serviceTypes.length > 0) {
          const pricePerService = (session.amount_total / 100) / serviceTypes.length;
          for (const service of serviceTypes) {
            lineItems.push({
              name: service,
              price: pricePerService,
            });
          }
        } else {
          lineItems.push({
            name: "ECU Tuning Service",
            price: session.amount_total / 100,
          });
        }
      }

      // ATOMIC: Only generate invoice AFTER we have confirmed order from DB
      console.log("ATOMIC: Generating invoice for confirmed order:", confirmedOrderNumber, "ID:", confirmedOrderId);
      try {
        const invoiceRes = await fetch(`${supabaseUrl}/functions/v1/generate-invoice`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            orderId: confirmedOrderId,
            orderNumber: confirmedOrderNumber,
            customerName,
            customerEmail,
            items: lineItems,
            totalAmount: session.amount_total ? parseFloat((session.amount_total / 100).toFixed(2)) : 0,
            brand: carBrand,
            model: carModel,
            fuelType,
            year,
            ecuType,
            vin,
          }),
        });
        
        const invoiceResult = await invoiceRes.json();
        console.log("ATOMIC: Invoice generation result:", invoiceResult);
      } catch (invoiceError) {
        console.error("Invoice generation failed (non-fatal):", invoiceError);
        // Continue - don't fail the webhook, order is already saved
      }

      // Note: Customer email with PDF invoice is sent by generate-invoice function
      // Order confirmation email was already sent immediately after order creation
      // Only send admin notification from here

      // Send admin notification email
      if (RESEND_API_KEY) {
        const adminEmailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #111111 0%, #1a1a1a 100%); border-radius: 16px; border: 1px solid #333;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #333;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ff6b00;">
                          🔔 NEW ORDER RECEIVED
                        </h1>
                      </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <!-- Order Info -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 107, 0, 0.1); border: 1px solid rgba(255, 107, 0, 0.3); border-radius: 12px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 8px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                                Order ID
                              </p>
                              <p style="margin: 0 0 15px; color: #ff6b00; font-size: 24px; font-weight: bold; font-family: 'Monaco', 'Consolas', monospace;">
                                ${confirmedOrderNumber}
                              </p>
                              <p style="margin: 0 0 8px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                                Amount
                              </p>
                              <p style="margin: 0; color: #00ff88; font-size: 20px; font-weight: bold;">
                                €${amountTotal}
                              </p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Customer Info -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 12px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 8px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                                Customer
                              </p>
                              <p style="margin: 0 0 5px; color: #ffffff; font-size: 16px;">
                                ${customerName}
                              </p>
                              <p style="margin: 0; color: #00d4ff; font-size: 14px;">
                                ${customerEmail}
                              </p>
                            </td>
                          </tr>
                        </table>
                        
                        ${customerNote ? `
                        <!-- Customer Note -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 0, 0.1); border: 1px solid rgba(255, 255, 0, 0.3); border-radius: 12px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 8px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                                ⚠️ Customer Note
                              </p>
                              <p style="margin: 0; color: #ffff88; font-size: 14px; line-height: 1.6;">
                                ${customerNote}
                              </p>
                            </td>
                          </tr>
                        </table>
                        ` : ''}
                        
                        <!-- CTA Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="${SITE_URL}/manage" 
                                 style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%); color: #000000; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px;">
                                Open Admin Portal
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 40px; border-top: 1px solid #333; text-align: center;">
                        <p style="margin: 0; color: #666; font-size: 12px;">
                          REMAPPRO Admin Notification
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        const adminEmailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: SENDER,
            to: [ADMIN_EMAIL],
            subject: `🔔 New Order: ${confirmedOrderNumber} - €${amountTotal}`,
            html: adminEmailHtml,
          }),
        });

        const adminEmailResult = await adminEmailRes.text();
        console.log("Admin notification email sent:", adminEmailRes.ok, adminEmailResult);
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Return success for other event types
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("=== WEBHOOK CATCH BLOCK ERROR ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Log if it's a Supabase error
    if (error?.code || error?.details || error?.hint) {
      console.error("Supabase error detected:", {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      });
    }
    
    // Always return 200 to prevent Stripe from retrying
    return new Response(
      JSON.stringify({ received: true, error: error?.message || "Unknown error" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
