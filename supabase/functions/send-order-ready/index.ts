import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  carBrand: string;
  carModel: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-order-ready function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, orderNumber, customerEmail, customerName, carBrand, carModel }: NotifyRequest = await req.json();

    console.log(`Sending notification for order ${orderNumber} to ${customerEmail}`);

    if (!customerEmail) {
      throw new Error("Customer email is required");
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const displayOrderId = orderNumber || orderId.slice(0, 8).toUpperCase();
    const vehicleInfo = `${carBrand || ''} ${carModel || ''}`.trim() || 'Your vehicle';

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
                      Profesionálny Chiptuning
                    </p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #00ffcc; font-size: 24px; text-align: center;">
                      🏁 Váš remap je pripravený!
                    </h2>
                    
                    <p style="margin: 0 0 20px; color: #ffffff; font-size: 16px; line-height: 1.6;">
                      Dobrý deň${customerName ? `, ${customerName}` : ''},
                    </p>
                    
                    <p style="margin: 0 0 30px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                      S radosťou Vám oznamujeme, že úprava riadiacej jednotky pre Vaše vozidlo <strong style="color: #ffffff;">${vehicleInfo}</strong> bola úspešne dokončená a je pripravená na stiahnutie.
                    </p>
                    
                    <!-- Order Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 12px; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <p style="margin: 0 0 8px; color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                            Číslo objednávky
                          </p>
                          <p style="margin: 0; color: #00d4ff; font-size: 28px; font-weight: bold; font-family: 'Monaco', 'Consolas', monospace;">
                            ${displayOrderId}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="https://remappro.eu/check-order?order=${displayOrderId}" 
                             style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00d4ff 0%, #00ffcc 100%); color: #000000; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px;">
                            Stiahnuť súbor
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 0; color: #888; font-size: 14px; line-height: 1.6; text-align: center;">
                      Ak tlačidlo nefunguje, navštívte našu stránku na sledovanie objednávok a zadajte číslo objednávky a Vašu e-mailovú adresu.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; border-top: 1px solid #333; text-align: center;">
                    <p style="margin: 0 0 10px; color: #888; font-size: 14px;">
                      Ďakujeme, že ste si vybrali REMAPPRO!
                    </p>
                    <p style="margin: 0; color: #666; font-size: 12px;">
                      © 2024 REMAPPRO. Profesionálne služby úpravy riadiacich jednotiek.
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
        from: "REMAPPRO <info@remappro.eu>",
        to: [customerEmail],
        subject: `🏁 Váš remap pre objednávku ${displayOrderId} je pripravený!`,
        html: emailHtml,
      }),
    });

    const emailResponse = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", emailResponse);
      throw new Error(emailResponse.message || "Failed to send email");
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
