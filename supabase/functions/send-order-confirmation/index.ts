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
      <html style="background-color: #000000;">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #000000; font-family: Arial, Helvetica, sans-serif;">
        <div style="background-color: #000000; padding: 40px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; max-width: 600px; margin: 0 auto;">
            <tr>
              <td style="background-color: #000000;">
                <!-- Header with Logo -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
                  <tr>
                    <td style="padding: 50px 40px 40px; text-align: center; background-color: #000000; border-bottom: 2px solid #00d4ff;">
                      <div style="background-color: #000000;">
                        <h1 style="margin: 0; padding: 0; font-size: 36px; font-weight: 800; color: #ffffff; letter-spacing: 3px; background-color: #000000;">
                          <span style="color: #ffffff; background-color: #000000;">REMAP</span><span style="color: #00d4ff; background-color: #000000;">PRO</span>
                        </h1>
                        <p style="margin: 12px 0 0; padding: 0; color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; background-color: #000000;">
                          Professional ECU Tuning
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
                
                <!-- Main Content -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
                  <tr>
                    <td style="padding: 50px 40px; background-color: #000000;">
                      <div style="background-color: #000000;">
                        <h2 style="margin: 0 0 25px; padding: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.2; background-color: #000000;">
                          Thank you for your purchase!
                        </h2>
                        
                        <p style="margin: 0 0 35px; padding: 0; color: #e0e0e0; font-size: 16px; line-height: 1.7; background-color: #000000;">
                          Our technicians are now starting to process your files.
                        </p>
                        
                        <!-- Order Details -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border: 1px solid #1a1a1a; margin-bottom: 35px;">
                          <tr>
                            <td style="padding: 25px; background-color: #0a0a0a;">
                              <div style="background-color: #0a0a0a;">
                                <div style="padding: 10px 0; background-color: #0a0a0a;">
                                  <p style="margin: 0; padding: 0; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; background-color: #0a0a0a;">Order ID</p>
                                  <p style="margin: 6px 0 0; padding: 0; color: #00d4ff; font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px; background-color: #0a0a0a;">${displayOrderId}</p>
                                </div>
                                <div style="padding: 10px 0; background-color: #0a0a0a;">
                                  <p style="margin: 0; padding: 0; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; background-color: #0a0a0a;">Date</p>
                                  <p style="margin: 6px 0 0; padding: 0; color: #ffffff; font-size: 16px; font-weight: 500; background-color: #0a0a0a;">${formattedDate}</p>
                                </div>
                                <div style="padding: 10px 0; background-color: #0a0a0a;">
                                  <p style="margin: 0; padding: 0; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; background-color: #0a0a0a;">Customer Name</p>
                                  <p style="margin: 6px 0 0; padding: 0; color: #ffffff; font-size: 16px; font-weight: 500; background-color: #0a0a0a;">${customerName || 'N/A'}</p>
                                </div>
                                <div style="padding: 10px 0; background-color: #0a0a0a;">
                                  <p style="margin: 0; padding: 0; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; background-color: #0a0a0a;">Price</p>
                                  <p style="margin: 6px 0 0; padding: 0; color: #00d4ff; font-size: 22px; font-weight: 700; background-color: #0a0a0a;">€${totalAmount.toFixed(2)}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Tracking Button -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
                          <tr>
                            <td align="center" style="padding: 25px 0; background-color: #000000;">
                              <a href="${trackingUrl}" 
                                 style="display: inline-block; padding: 20px 50px; background-color: #00d4ff; color: #000000; font-size: 15px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 2px;">
                                VIEW LIVE TRACKING
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 35px 0 0; padding: 0; color: #888888; font-size: 14px; line-height: 1.7; text-align: center; background-color: #000000;">
                          You can track your order status in real-time by clicking the button above or visiting our tracking page.
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
                
                <!-- Footer -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; border-top: 1px solid #1a1a1a;">
                  <tr>
                    <td style="padding: 40px 40px 30px; text-align: center; background-color: #000000;">
                      <div style="background-color: #000000;">
                        <p style="margin: 0 0 8px; padding: 0; color: #888888; font-size: 12px; line-height: 1.6; background-color: #000000;">
                          REMAPPRO
                        </p>
                        <p style="margin: 0 0 8px; padding: 0; color: #888888; font-size: 12px; line-height: 1.6; background-color: #000000;">
                          Janka Kráľa 29, 990 01 Veľký Krtíš, Slovakia
                        </p>
                        <p style="margin: 0 0 15px; padding: 0; color: #888888; font-size: 12px; line-height: 1.6; background-color: #000000;">
                          IČO: 41281471 | DIČ: 1041196607
                        </p>
                        <p style="margin: 0; padding: 0; color: #555555; font-size: 11px; background-color: #000000;">
                          © ${new Date().getFullYear()} REMAPPRO. All rights reserved.
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    // Use Resend API to send email
    console.log("Sending email via Resend API:", {
      from: SENDER,
      to: customerEmail,
      subject: `Order Confirmation - ${displayOrderId}`,
      apiKeyPresent: !!RESEND_API_KEY,
      apiKeyLength: RESEND_API_KEY.length,
    });

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
    console.log("Resend Response:", rawBody);
    
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
