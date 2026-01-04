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

      // Generate and send invoice
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
          }),
        });
        
        const invoiceResult = await invoiceRes.json();
        console.log("Invoice generation result:", invoiceResult);
      } catch (invoiceError) {
        console.error("Invoice generation failed:", invoiceError);
        // Continue - don't fail the webhook just because invoice failed
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const invoiceDate = new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });

      // Build line items HTML for invoice
      const servicesHtml = lineItems.map(item => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #333; color: #ffffff; font-size: 14px;">
            ${item.name}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #333; color: #ff6b00; font-size: 14px; text-align: right; font-weight: 600;">
            €${item.price.toFixed(2)}
          </td>
        </tr>
      `).join('');

      // Send invoice + confirmation email to customer via Resend
      if (customerEmail && RESEND_API_KEY) {
        const trackingLink = `${SITE_URL}/track?id=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(customerEmail)}`;
        
        const invoiceEmailHtml = `
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
                  <table width="650" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #111111 0%, #1a1a1a 100%); border-radius: 16px; border: 1px solid #333; overflow: hidden;">
                    
                    <!-- Invoice Header -->
                    <tr>
                      <td style="padding: 30px 40px; background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-bottom: 2px solid #ff6b00;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="vertical-align: top;">
                              <!-- Logo -->
                              <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">
                                <span style="color: #ffffff;">REMAP</span><span style="color: #ff6b00;">PRO</span>
                              </h1>
                              <p style="margin: 5px 0 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
                                Professional ECU Tuning
                              </p>
                            </td>
                            <td style="vertical-align: top; text-align: right;">
                              <p style="margin: 0; color: #ff6b00; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                                INVOICE
                              </p>
                              <p style="margin: 8px 0 0; color: #00d4ff; font-size: 16px; font-weight: 600; font-family: 'Monaco', 'Consolas', monospace;">
                                ${invoiceNumber}
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Order Confirmation Banner -->
                    <tr>
                      <td style="padding: 20px 40px; background: rgba(0, 255, 136, 0.1); border-bottom: 1px solid #333;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="text-align: center;">
                              <p style="margin: 0; color: #00ff88; font-size: 18px; font-weight: 600;">
                                ✅ Payment Successful - Order Confirmed
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Invoice Details Section -->
                    <tr>
                      <td style="padding: 30px 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <!-- Bill To -->
                            <td style="vertical-align: top; width: 50%;">
                              <p style="margin: 0 0 8px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
                                Bill To
                              </p>
                              <p style="margin: 0 0 4px; color: #ffffff; font-size: 16px; font-weight: 600;">
                                ${customerName}
                              </p>
                              <p style="margin: 0; color: #00d4ff; font-size: 14px;">
                                ${customerEmail}
                              </p>
                            </td>
                            <!-- Invoice Info -->
                            <td style="vertical-align: top; width: 50%; text-align: right;">
                              <table cellpadding="0" cellspacing="0" style="margin-left: auto;">
                                <tr>
                                  <td style="padding: 4px 12px 4px 0; color: #888; font-size: 12px;">Date:</td>
                                  <td style="padding: 4px 0; color: #ffffff; font-size: 12px; font-weight: 500;">${invoiceDate}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 4px 12px 4px 0; color: #888; font-size: 12px;">Order ID:</td>
                                  <td style="padding: 4px 0; color: #00d4ff; font-size: 12px; font-weight: 600; font-family: 'Monaco', 'Consolas', monospace;">${orderNumber}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 4px 12px 4px 0; color: #888; font-size: 12px;">Status:</td>
                                  <td style="padding: 4px 0; color: #00ff88; font-size: 12px; font-weight: 600;">PAID</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Vehicle Information -->
                    ${carBrand ? `
                    <tr>
                      <td style="padding: 0 40px 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 107, 0, 0.08); border: 1px solid rgba(255, 107, 0, 0.2); border-radius: 10px;">
                          <tr>
                            <td style="padding: 16px 20px;">
                              <p style="margin: 0 0 10px; color: #ff6b00; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                🚗 Vehicle Details
                              </p>
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="color: #888; font-size: 13px; padding: 2px 0;">Brand:</td>
                                  <td style="color: #ffffff; font-size: 13px; padding: 2px 0; font-weight: 500;">${carBrand}</td>
                                  <td style="color: #888; font-size: 13px; padding: 2px 0; padding-left: 20px;">Model:</td>
                                  <td style="color: #ffffff; font-size: 13px; padding: 2px 0; font-weight: 500;">${carModel}</td>
                                </tr>
                                <tr>
                                  <td style="color: #888; font-size: 13px; padding: 2px 0;">Year:</td>
                                  <td style="color: #ffffff; font-size: 13px; padding: 2px 0; font-weight: 500;">${year}</td>
                                  <td style="color: #888; font-size: 13px; padding: 2px 0; padding-left: 20px;">Fuel:</td>
                                  <td style="color: #ffffff; font-size: 13px; padding: 2px 0; font-weight: 500;">${fuelType}</td>
                                </tr>
                                ${ecuType ? `
                                <tr>
                                  <td style="color: #888; font-size: 13px; padding: 2px 0;">ECU:</td>
                                  <td colspan="3" style="color: #00d4ff; font-size: 13px; padding: 2px 0; font-weight: 500;">${ecuType}</td>
                                </tr>
                                ` : ''}
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    ` : ''}

                    <!-- Line Items Table -->
                    <tr>
                      <td style="padding: 0 40px 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #333; border-radius: 10px; overflow: hidden;">
                          <thead>
                            <tr style="background: rgba(255, 107, 0, 0.15);">
                              <th style="padding: 14px 16px; text-align: left; color: #ff6b00; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                Service Description
                              </th>
                              <th style="padding: 14px 16px; text-align: right; color: #ff6b00; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            ${servicesHtml}
                          </tbody>
                          <tfoot>
                            <tr style="background: rgba(0, 212, 255, 0.1);">
                              <td style="padding: 16px; text-align: right; color: #ffffff; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                Total
                              </td>
                              <td style="padding: 16px; text-align: right; color: #00d4ff; font-size: 22px; font-weight: 700;">
                                €${amountTotal}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                      <td style="padding: 0 40px 30px; text-align: center;">
                        <a href="${trackingLink}" 
                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%); color: #000000; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px;">
                          Track Your Order
                        </a>
                        <p style="margin: 15px 0 0; color: #888; font-size: 13px;">
                          Your tuning file is being processed. You will receive a download link when ready.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Company Footer -->
                    <tr>
                      <td style="padding: 25px 40px; background: #0d0d0d; border-top: 1px solid #333;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="vertical-align: top;">
                              <p style="margin: 0 0 4px; color: #ffffff; font-size: 14px; font-weight: 600;">REMAPPRO</p>
                              <p style="margin: 0; color: #888; font-size: 12px; line-height: 1.6;">
                                Janka Krala 29<br>
                                Velky Krtis 99001<br>
                                Slovakia
                              </p>
                            </td>
                            <td style="vertical-align: top; text-align: right;">
                              <table cellpadding="0" cellspacing="0" style="margin-left: auto;">
                                <tr>
                                  <td style="padding: 2px 0; color: #888; font-size: 12px;">IČO:</td>
                                  <td style="padding: 2px 0 2px 8px; color: #ffffff; font-size: 12px;">41281471</td>
                                </tr>
                                <tr>
                                  <td style="padding: 2px 0; color: #888; font-size: 12px;">DIČ:</td>
                                  <td style="padding: 2px 0 2px 8px; color: #ffffff; font-size: 12px;">1041196607</td>
                                </tr>
                                <tr>
                                  <td style="padding: 2px 0; color: #888; font-size: 12px;">Email:</td>
                                  <td style="padding: 2px 0 2px 8px; color: #00d4ff; font-size: 12px;">info@remappro.eu</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Copyright -->
                    <tr>
                      <td style="padding: 15px 40px; background: #080808; text-align: center;">
                        <p style="margin: 0; color: #555; font-size: 11px;">
                          © ${new Date().getFullYear()} REMAPPRO. Professional ECU Tuning Services. All rights reserved.
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

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: SENDER,
            to: [customerEmail],
            subject: `Invoice ${invoiceNumber} - Order ${orderNumber} Confirmed`,
            html: invoiceEmailHtml,
          }),
        });

        const emailResult = await emailRes.text();
        console.log("Invoice email sent:", emailRes.ok, emailResult);
      }

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
