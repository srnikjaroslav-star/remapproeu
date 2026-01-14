import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDER = "REMAPPRO <info@remappro.eu>";
const SITE_URL = Deno.env.get("SITE_URL") || "https://remappro.eu";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderConfirmationRequest {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  totalAmount: number;
  brand?: string;
  model?: string;
  fuelType?: string;
  year?: string | number;
  vin?: string;
  createdAt: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-order-confirmation function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    const {
      orderId,
      orderNumber,
      customerEmail,
      customerName,
      totalAmount,
      brand,
      model,
      fuelType,
      year,
      vin,
      createdAt,
    }: OrderConfirmationRequest = await req.json();

    console.log(`Sending order confirmation email for order ${orderNumber} to ${customerEmail}`);

    if (!customerEmail) {
      throw new Error("Customer email is required");
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured in Supabase Edge Function secrets");
      throw new Error("RESEND_API_KEY is not configured. Please set it in Supabase Dashboard > Project Settings > Edge Functions > Secrets");
    }

    const displayOrderId = orderNumber || orderId.slice(0, 8).toUpperCase();
    const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Tracking URL with order ID and email
    const trackingUrl = `${SITE_URL}/track?id=${encodeURIComponent(displayOrderId)}&email=${encodeURIComponent(customerEmail)}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border-radius: 16px; border: 1px solid #333;">
                <!-- Header with Logo -->
                <tr>
                  <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #333;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #ffffff; letter-spacing: 2px;">
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
                    <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
                      Thank you for your purchase!
                    </h2>
                    
                    <p style="margin: 0 0 30px; color: #ffffff; font-size: 16px; line-height: 1.6;">
                      Our technicians are now starting to process your files.
                    </p>
                    
                    <!-- Order Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #111111; border-radius: 8px; border: 1px solid #333; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0;">
                                <p style="margin: 0; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Order ID</p>
                                <p style="margin: 4px 0 0; color: #ffffff; font-size: 18px; font-weight: 600; font-family: 'Courier New', monospace;">${displayOrderId}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <p style="margin: 0; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                                <p style="margin: 4px 0 0; color: #ffffff; font-size: 16px;">${formattedDate}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <p style="margin: 0; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Customer Name</p>
                                <p style="margin: 4px 0 0; color: #ffffff; font-size: 16px;">${customerName || 'N/A'}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <p style="margin: 0; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Price</p>
                                <p style="margin: 4px 0 0; color: #ffffff; font-size: 18px; font-weight: 600;">€${totalAmount.toFixed(2)}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Tracking Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${trackingUrl}" 
                             style="display: inline-block; padding: 18px 48px; background-color: #00f2ff; color: #000000; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(0, 242, 255, 0.3);">
                            VIEW LIVE TRACKING
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 0; color: #888; font-size: 14px; line-height: 1.6; text-align: center;">
                      You can track your order status in real-time by clicking the button above or visiting our tracking page.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; border-top: 1px solid #333; text-align: center; background-color: #111111;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; font-weight: 500;">
                      REMAPPRO
                    </p>
                    <p style="margin: 0 0 8px; color: #888; font-size: 13px; line-height: 1.6;">
                      Janka Kráľa 29, Veľký Krtíš, Slovakia<br>
                      Professional ECU Tuning Services
                    </p>
                    <p style="margin: 8px 0; color: #888; font-size: 12px; line-height: 1.6;">
                      IČO: 41281471 | DIČ: 1041196607
                    </p>
                    <p style="margin: 15px 0 0; color: #666; font-size: 12px;">
                      © ${new Date().getFullYear()} REMAPPRO. All rights reserved.
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

    // Use Resend API to send email
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER,
        to: [customerEmail],
        subject: `Order Confirmation - ${displayOrderId}`,
        html: emailHtml,
      }),
    });

    const rawBody = await res.text();
    let emailResponse: any = null;
    try {
      emailResponse = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      emailResponse = { raw: rawBody };
    }

    if (!res.ok) {
      const errorDetails = {
        status: res.status,
        statusText: res.statusText,
        body: emailResponse,
        apiKeyPresent: !!RESEND_API_KEY,
        apiKeyLength: RESEND_API_KEY.length,
        sender: SENDER,
        recipient: customerEmail,
      };
      
      console.error("Resend API error:", errorDetails);
      
      let errorMessage = "Resend API request failed";
      if (res.status === 401 || res.status === 403) {
        errorMessage = "RESEND_API_KEY is invalid or expired";
      } else if (res.status === 422) {
        errorMessage = "Email domain not verified in Resend or invalid sender/recipient";
      } else if (emailResponse?.message) {
        errorMessage = emailResponse.message;
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: errorDetails,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Order confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending order confirmation email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
