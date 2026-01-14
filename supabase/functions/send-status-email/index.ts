import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDER = "REMAPPRO <info@remappro.eu>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusEmailRequest {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  carBrand: string;
  carModel: string;
  year: number;
  status: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-status-email function called");

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
      year,
      status,
    }: StatusEmailRequest = await req.json();

    console.log(`Sending status email for order ${orderNumber} to ${customerEmail}, status: ${status}`);

    if (!customerEmail) {
      throw new Error("Customer email is required");
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured in Supabase Edge Function secrets");
      throw new Error("RESEND_API_KEY is not configured. Please set it in Supabase Dashboard > Project Settings > Edge Functions > Secrets");
    }

    const displayOrderId = orderNumber || orderId.slice(0, 8).toUpperCase();
    const brand = carBrand || '';
    const model = carModel || '';
    const yearStr = year ? year.toString() : '';
    const vehicleInfo = `${brand} ${model} ${yearStr}`.trim();

    // Generate email content based on status
    let emailSubject = '';
    let emailContent = '';

    if (status === 'completed') {
      emailSubject = `Objednávka ${displayOrderId} dokončená - REMAPPRO`;
      emailContent = `
        <p style="margin: 0 0 20px; color: #ffffff; font-size: 16px; line-height: 1.6;">
          Dobrý deň,<br><br>
          Vaša objednávka <strong style="color: #00d4ff;">${displayOrderId}</strong> v REMAPPRO pre vozidlo <strong>${vehicleInfo}</strong> bola úspešne dokončená.<br><br>
          Tešíme sa na Vašu návštevu.
        </p>
      `;
    } else if (status === 'processing') {
      emailSubject = `Objednávka ${displayOrderId} v riešení - REMAPPRO`;
      emailContent = `
        <p style="margin: 0 0 20px; color: #ffffff; font-size: 16px; line-height: 1.6;">
          Dobrý deň,<br><br>
          Vaša objednávka <strong style="color: #00d4ff;">${displayOrderId}</strong> v REMAPPRO pre vozidlo <strong>${vehicleInfo}</strong> je teraz v riešení.<br><br>
          O priebehu Vás budeme informovať.
        </p>
      `;
    } else if (status === 'pending') {
      emailSubject = `Objednávka ${displayOrderId} prijatá - REMAPPRO`;
      emailContent = `
        <p style="margin: 0 0 20px; color: #ffffff; font-size: 16px; line-height: 1.6;">
          Dobrý deň,<br><br>
          Vaša objednávka <strong style="color: #00d4ff;">${displayOrderId}</strong> v REMAPPRO pre vozidlo <strong>${vehicleInfo}</strong> bola prijatá.<br><br>
          Ďakujeme za Vašu objednávku.
        </p>
      `;
    } else {
      emailSubject = `Aktualizácia objednávky ${displayOrderId} - REMAPPRO`;
      emailContent = `
        <p style="margin: 0 0 20px; color: #ffffff; font-size: 16px; line-height: 1.6;">
          Dobrý deň,<br><br>
          Status Vašej objednávky <strong style="color: #00d4ff;">${displayOrderId}</strong> v REMAPPRO pre vozidlo <strong>${vehicleInfo}</strong> bol aktualizovaný.<br><br>
          Nový status: <strong>${status}</strong>
        </p>
      `;
    }

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
                    ${emailContent}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; border-top: 1px solid #333; text-align: center;">
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

    // Use Resend API (fetch) to send email
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER,
        to: [customerEmail],
        subject: emailSubject,
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
      
      // Check for specific error types
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

    console.log("Status email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending status email:", error);
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
