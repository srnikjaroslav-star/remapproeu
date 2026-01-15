import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDER = "REMAPPRO <info@remappro.eu>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  carBrand: string;
  carModel: string;
  resultFileUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-order-ready function called");

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
      carBrand,
      carModel,
      resultFileUrl,
    }: NotifyRequest = await req.json();

    console.log(`Sending notification for order ${orderNumber} to ${customerEmail}`);

    if (!customerEmail) {
      throw new Error("Customer email is required");
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const displayOrderId = orderNumber || orderId.slice(0, 8).toUpperCase();
    const vehicleInfo = `${carBrand || ''} ${carModel || ''}`.trim() || 'your vehicle';
    const downloadUrl = resultFileUrl || `https://remappro.eu/check-order?order=${displayOrderId}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 20px; background-color: #0a0a0a; color: #ffffff; font-family: sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #333333; padding: 40px; border-radius: 8px;">
                <!-- Header with Logo -->
                <tr>
                  <td style="padding: 50px 40px 40px; text-align: center; border-bottom: 2px solid #00f2ff;">
                    <h1 style="margin: 0; font-size: 36px; font-weight: 800; letter-spacing: 3px;">
                      <span style="color: #ffffff;">REMAP</span><span style="color: #00f2ff;">PRO</span>
                    </h1>
                    <p style="margin: 12px 0 0; color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
                      Professional ECU Tuning
                    </p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 50px 40px;">
                    <h2 style="margin: 0 0 20px; color: #e5e5e5; font-size: 24px; text-align: center;">
                      🏁 Your Tuning File is Ready!
                    </h2>
                    
                    <p style="margin: 0 0 20px; color: #e5e5e5; font-size: 16px; line-height: 1.6;">
                      Hi${customerName ? ` ${customerName}` : ''},
                    </p>
                    
                    <p style="margin: 0 0 30px; color: #e5e5e5; font-size: 16px; line-height: 1.6;">
                      Great news! The ECU tuning for <strong style="color: #ffffff;">${vehicleInfo}</strong> has been completed and your modified file is ready for download.
                    </p>
                    
                    <!-- Order Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a2e31; border-radius: 5px; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <p style="margin: 0 0 8px; color: #888888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                            Order ID
                          </p>
                          <p style="margin: 0; color: #00f2ff; font-size: 28px; font-weight: bold; font-family: 'Monaco', 'Consolas', monospace;">
                            ${displayOrderId}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${downloadUrl}" 
                             style="background-color: #00f2ff; color: #000000; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
                            Download Your File
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 0; color: #888888; font-size: 14px; line-height: 1.6; text-align: center;">
                      If the button doesn't work, visit our order tracking page and enter your Order ID and email address.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="margin-top: 30px; border-top: 1px solid #333333; padding-top: 20px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #666666; font-size: 12px; line-height: 1.6;">
                      REMAPPRO | Janka Krala 29, 990 01 Velky Krtis, Slovakia
                    </p>
                    <p style="margin: 0 0 15px; color: #666666; font-size: 12px; line-height: 1.6;">
                      Reg. No.: 41281471 | Tax ID: 1041196607 | info@remappro.eu
                    </p>
                    <p style="margin: 0; color: #666666; font-size: 12px;">
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

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER,
        to: [customerEmail],
        subject: `Your Tuning File is Ready! - Order ${displayOrderId}`,
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
      console.error("Resend API error:", {
        status: res.status,
        statusText: res.statusText,
        body: emailResponse,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Resend API request failed",
          resend: {
            status: res.status,
            statusText: res.statusText,
            body: emailResponse,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
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
