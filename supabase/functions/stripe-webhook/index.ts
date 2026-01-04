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

    let event;
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
      console.log("Checkout session completed:", session.id);
      console.log("Session metadata:", JSON.stringify(session.metadata));
      
      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName = session.customer_details?.name || session.metadata?.customer_name || "Customer";
      const customerNote = session.metadata?.customer_note || "";
      const amountTotal = session.amount_total ? (session.amount_total / 100).toFixed(2) : "0";
      
      // Extract car details from metadata
      const carBrand = session.metadata?.car_brand || "";
      const carModel = session.metadata?.car_model || "";
      const fuelType = session.metadata?.fuel_type || "";
      const year = parseInt(session.metadata?.year || "0") || new Date().getFullYear();
      const ecuType = session.metadata?.ecu_type || "";
      const fileUrl = session.metadata?.file_url || null;
      const legalConsent = session.metadata?.legal_consent === "true";
      
      // Parse services from metadata
      let serviceTypes: string[] = [];
      try {
        serviceTypes = session.metadata?.services ? JSON.parse(session.metadata.services) : [];
      } catch {
        serviceTypes = session.metadata?.services ? [session.metadata.services] : [];
      }
      
      console.log("Customer email:", customerEmail);
      console.log("Customer name:", customerName);
      console.log("Car:", carBrand, carModel, fuelType, year);
      console.log("Services:", serviceTypes);

      // Create Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Generate unique order number
      const orderNumber = `RP-${Date.now().toString(36).toUpperCase()}`;
      
      // Create order in database
      let order = null;
      const orderData = {
        order_number: orderNumber,
        customer_name: customerName,
        customer_email: customerEmail?.toLowerCase() || "",
        car_brand: carBrand,
        car_model: carModel,
        fuel_type: fuelType,
        year: year,
        ecu_type: ecuType,
        service_type: serviceTypes,
        total_price: parseFloat(amountTotal),
        status: "paid",
        file_url: fileUrl,
        legal_consent: legalConsent,
        customer_note: customerNote || null,
      };
      
      console.log("Creating order with data:", JSON.stringify(orderData));
      
      const { data: newOrder, error: insertError } = await supabase
        .from("orders")
        .insert([orderData])
        .select()
        .single();
      
      if (insertError) {
        console.error("Failed to create order:", insertError);
      } else {
        order = newOrder;
        console.log("Order created successfully:", order.id, order.order_number);
      }

      // Get line items from session for invoice
      const lineItems: { name: string; price: number }[] = [];
      if (session.line_items?.data) {
        for (const item of session.line_items.data) {
          lineItems.push({
            name: item.description || item.price?.product?.name || "Service",
            price: (item.amount_total || 0) / 100,
          });
        }
      } else if (session.amount_total) {
        // Fallback if no line items
        lineItems.push({
          name: "ECU Tuning Service",
          price: session.amount_total / 100,
        });
      }

      // Generate and send invoice via the generate-invoice function
      // This will create PDF, upload to storage, and send customer email with BCC
      try {
        const invoiceRes = await fetch(`${supabaseUrl}/functions/v1/generate-invoice`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            orderId: order?.id || session.id,
            orderNumber: order?.order_number || orderNumber,
            customerName,
            customerEmail,
            items: lineItems,
            totalAmount: session.amount_total ? session.amount_total / 100 : 0,
            carBrand: order?.car_brand || carBrand,
            carModel: order?.car_model || carModel,
            fuelType: order?.fuel_type || fuelType,
            year: order?.year || year,
            ecuType: order?.ecu_type || ecuType,
          }),
        });
        
        const invoiceResult = await invoiceRes.json();
        console.log("Invoice generation result:", invoiceResult);
      } catch (invoiceError) {
        console.error("Invoice generation failed:", invoiceError);
        // Continue - don't fail the webhook just because invoice failed
      }

      // Note: Customer email with PDF invoice is sent by generate-invoice function
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
                                ${orderNumber}
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
            subject: `🔔 New Order: ${orderNumber} - €${amountTotal}`,
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
    console.error("Webhook error:", error);
    // Always return 200 to prevent Stripe from retrying
    return new Response(
      JSON.stringify({ received: true, error: error.message }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
