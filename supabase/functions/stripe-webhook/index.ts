import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDER = "REMAPPRO <info@remappro.eu>";
const SITE_URL = "https://remappro.eu";

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
      
      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName = session.customer_details?.name || "Customer";
      const orderId = session.client_reference_id || session.metadata?.order_id;
      
      console.log("Customer email:", customerEmail);
      console.log("Order ID from session:", orderId);

      // Create Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Try to find or create order
      let order = null;
      let orderNumber = null;

      if (orderId) {
        // Fetch order by ID
        const { data: existingOrder } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();
        
        order = existingOrder;
        orderNumber = order?.order_number || `RP-${orderId.slice(0, 6).toUpperCase()}`;
      }

      // Send confirmation email via Resend
      if (customerEmail && RESEND_API_KEY) {
        const trackingLink = `${SITE_URL}/check-order`;
        
        const emailHtml = `
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
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #00d4ff;">
                          REMAPPRO
                        </h1>
                        <p style="margin: 10px 0 0; color: #888; font-size: 14px;">
                          Professional ECU Tuning
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; color: #00ffcc; font-size: 24px; text-align: center;">
                          ✅ Order Confirmed!
                        </h2>
                        
                        <p style="margin: 0 0 20px; color: #ffffff; font-size: 16px; line-height: 1.6;">
                          Hi${customerName ? ` ${customerName}` : ''},
                        </p>
                        
                        <p style="margin: 0 0 30px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                          Thank you for your purchase! Your tuning file is being processed by our engineers.
                        </p>
                        
                        ${orderNumber ? `
                        <!-- Order Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 12px; margin-bottom: 30px;">
                          <tr>
                            <td style="padding: 20px; text-align: center;">
                              <p style="margin: 0 0 8px; color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                                Your Order ID
                              </p>
                              <p style="margin: 0; color: #00d4ff; font-size: 28px; font-weight: bold; font-family: 'Monaco', 'Consolas', monospace;">
                                ${orderNumber}
                              </p>
                            </td>
                          </tr>
                        </table>
                        ` : ''}
                        
                        <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                          You can track your order progress using the link below:
                        </p>
                        
                        <!-- CTA Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="${trackingLink}" 
                                 style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00d4ff 0%, #00ffcc 100%); color: #000000; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px;">
                                Track Your Order
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 30px 0 0; color: #888; font-size: 14px; line-height: 1.6; text-align: center;">
                          Once your file is ready, you will receive another email with a download link.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; border-top: 1px solid #333; text-align: center;">
                        <p style="margin: 0 0 10px; color: #888; font-size: 14px;">
                          Thank you for choosing REMAPPRO!
                        </p>
                        <p style="margin: 0; color: #666; font-size: 12px;">
                          © ${new Date().getFullYear()} REMAPPRO. Professional ECU Tuning Services.
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
            subject: orderNumber ? `Order Confirmed - ${orderNumber}` : `Order Confirmed - Your Tuning File is being processed!`,
            html: emailHtml,
          }),
        });

        const emailResult = await emailRes.text();
        console.log("Confirmation email sent:", emailRes.ok, emailResult);
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
