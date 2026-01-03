import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDER = "REMAPPRO <info@remappro.eu>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceItem {
  name: string;
  price: number;
}

interface InvoiceRequest {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: InvoiceItem[];
  totalAmount: number;
  carBrand?: string;
  carModel?: string;
}

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}-${random}`;
}

function generateInvoicePDF(data: {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  items: InvoiceItem[];
  totalAmount: number;
  orderNumber: string;
  carInfo?: string;
}): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor = [0, 212, 255]; // Cyan
  const darkBg = [15, 15, 15];
  const textWhite = [255, 255, 255];
  const textGray = [150, 150, 150];
  const textLight = [200, 200, 200];
  
  // Dark background
  doc.setFillColor(...darkBg);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');
  
  // Header section
  doc.setFillColor(25, 25, 25);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Logo text
  doc.setTextColor(...textWhite);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("REMAP", 20, 25);
  doc.setTextColor(...primaryColor);
  doc.text("PRO", 65, 25);
  
  // Company tagline
  doc.setTextColor(...textGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Professional ECU Tuning Services", 20, 35);
  
  // Invoice title
  doc.setTextColor(...textWhite);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - 20, 25, { align: "right" });
  
  // Invoice number
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(data.invoiceNumber, pageWidth - 20, 35, { align: "right" });
  
  // Date
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setTextColor(...textGray);
  doc.setFontSize(10);
  doc.text(`Date: ${currentDate}`, pageWidth - 20, 45, { align: "right" });
  
  // Divider line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, 55, pageWidth - 20, 55);
  
  // Two column layout for addresses
  let yPos = 70;
  
  // Supplier details (left)
  doc.setTextColor(...textGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("FROM:", 20, yPos);
  
  doc.setTextColor(...textLight);
  doc.setFont("helvetica", "normal");
  doc.text("REMAPPRO Digital Solutions", 20, yPos + 8);
  doc.text("info@remappro.eu", 20, yPos + 16);
  doc.text("Slovakia", 20, yPos + 24);
  doc.text("European Union", 20, yPos + 32);
  
  // Customer details (right)
  doc.setTextColor(...textGray);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", pageWidth / 2 + 10, yPos);
  
  doc.setTextColor(...textLight);
  doc.setFont("helvetica", "normal");
  doc.text(data.customerName, pageWidth / 2 + 10, yPos + 8);
  doc.text(data.customerEmail, pageWidth / 2 + 10, yPos + 16);
  if (data.carInfo) {
    doc.text(`Vehicle: ${data.carInfo}`, pageWidth / 2 + 10, yPos + 24);
  }
  
  // Order reference
  doc.setTextColor(...textGray);
  doc.setFontSize(9);
  doc.text(`Order Reference: ${data.orderNumber}`, pageWidth / 2 + 10, yPos + 36);
  
  // Items table
  yPos = 130;
  
  // Table header background
  doc.setFillColor(30, 30, 30);
  doc.rect(20, yPos - 8, pageWidth - 40, 14, 'F');
  
  // Table header
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("SERVICE", 25, yPos);
  doc.text("PRICE", pageWidth - 25, yPos, { align: "right" });
  
  yPos += 15;
  
  // Table items
  doc.setTextColor(...textWhite);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  
  for (const item of data.items) {
    // Alternating row background
    if (data.items.indexOf(item) % 2 === 0) {
      doc.setFillColor(22, 22, 22);
      doc.rect(20, yPos - 6, pageWidth - 40, 12, 'F');
    }
    
    doc.setTextColor(...textLight);
    doc.text(item.name, 25, yPos);
    doc.setTextColor(...textWhite);
    doc.text(`€${item.price.toFixed(2)}`, pageWidth - 25, yPos, { align: "right" });
    yPos += 12;
  }
  
  // Total section
  yPos += 10;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2, yPos, pageWidth - 20, yPos);
  
  yPos += 15;
  doc.setFillColor(...primaryColor);
  doc.rect(pageWidth / 2, yPos - 10, pageWidth / 2 - 20, 18, 'F');
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", pageWidth / 2 + 10, yPos);
  doc.text(`€${data.totalAmount.toFixed(2)}`, pageWidth - 25, yPos, { align: "right" });
  
  // Payment status
  yPos += 30;
  doc.setFillColor(0, 150, 0);
  doc.roundedRect(20, yPos - 8, 80, 16, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PAID", 60, yPos, { align: "center" });
  
  // Footer section
  const footerY = doc.internal.pageSize.getHeight() - 40;
  
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.3);
  doc.line(20, footerY - 10, pageWidth - 20, footerY - 10);
  
  doc.setTextColor(...textGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for choosing REMAPPRO.", pageWidth / 2, footerY, { align: "center" });
  doc.text("For technical support, contact info@remappro.eu", pageWidth / 2, footerY + 8, { align: "center" });
  
  doc.setFontSize(8);
  doc.text(`© ${new Date().getFullYear()} REMAPPRO Digital Solutions. Slovakia, European Union.`, pageWidth / 2, footerY + 18, { align: "center" });
  
  // Return as base64
  return doc.output('datauristring').split(',')[1];
}

serve(async (req) => {
  console.log("Generate invoice function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: InvoiceRequest = await req.json();
    console.log("Invoice request data:", JSON.stringify(data));
    
    const { orderId, orderNumber, customerName, customerEmail, items, totalAmount, carBrand, carModel } = data;
    
    if (!orderId || !customerEmail || !items || items.length === 0) {
      throw new Error("Missing required invoice data");
    }
    
    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();
    console.log("Generated invoice number:", invoiceNumber);
    
    // Generate PDF
    const carInfo = carBrand && carModel ? `${carBrand} ${carModel}` : undefined;
    const pdfBase64 = generateInvoicePDF({
      invoiceNumber,
      customerName: customerName || "Customer",
      customerEmail,
      items,
      totalAmount,
      orderNumber: orderNumber || orderId,
      carInfo,
    });
    
    console.log("PDF generated, size:", pdfBase64.length);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Upload PDF to storage
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const fileName = `invoices/${invoiceNumber}.pdf`;
    
    const { error: uploadError } = await supabase.storage
      .from('modified-files')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    
    if (uploadError) {
      console.error("PDF upload error:", uploadError);
      // Continue anyway - we can still send the email with attachment
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('modified-files')
      .getPublicUrl(fileName);
    
    const invoiceUrl = urlData?.publicUrl || null;
    console.log("Invoice URL:", invoiceUrl);
    
    // Update order with invoice info
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        invoice_number: invoiceNumber,
        invoice_url: invoiceUrl,
      })
      .eq('id', orderId);
    
    if (updateError) {
      console.error("Order update error:", updateError);
    }
    
    // Send email with PDF attachment via Resend
    if (RESEND_API_KEY) {
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
                      <h1 style="margin: 0; font-size: 28px; font-weight: bold;">
                        <span style="color: #ffffff;">REMAP</span><span style="color: #00d4ff;">PRO</span>
                      </h1>
                      <p style="margin: 10px 0 0; color: #888; font-size: 14px;">
                        Payment Confirmation & Invoice
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #00ffcc; font-size: 22px; text-align: center;">
                        🧾 Invoice Attached
                      </h2>
                      
                      <p style="margin: 0 0 20px; color: #ffffff; font-size: 16px; line-height: 1.6;">
                        Dear ${customerName || "Customer"},
                      </p>
                      
                      <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                        Thank you for your order. Attached is your official invoice for your records.
                      </p>
                      
                      <!-- Invoice Details Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 12px; margin-bottom: 20px;">
                        <tr>
                          <td style="padding: 20px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="width: 50%;">
                                  <p style="margin: 0 0 5px; color: #888; font-size: 12px; text-transform: uppercase;">Invoice Number</p>
                                  <p style="margin: 0; color: #00d4ff; font-size: 16px; font-weight: bold;">${invoiceNumber}</p>
                                </td>
                                <td style="width: 50%; text-align: right;">
                                  <p style="margin: 0 0 5px; color: #888; font-size: 12px; text-transform: uppercase;">Amount Paid</p>
                                  <p style="margin: 0; color: #00ff88; font-size: 20px; font-weight: bold;">€${totalAmount.toFixed(2)}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                        Your order is now being processed by our engineering team. You will receive another email once your tuning file is ready for download.
                      </p>
                      
                      <!-- Order ID Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 107, 0, 0.1); border: 1px solid rgba(255, 107, 0, 0.3); border-radius: 12px; margin-bottom: 20px;">
                        <tr>
                          <td style="padding: 15px; text-align: center;">
                            <p style="margin: 0 0 5px; color: #888; font-size: 12px; text-transform: uppercase;">Your Order ID</p>
                            <p style="margin: 0; color: #ff9500; font-size: 18px; font-weight: bold; font-family: 'Monaco', 'Consolas', monospace;">${orderNumber}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; border-top: 1px solid #333; text-align: center;">
                      <p style="margin: 0 0 10px; color: #888; font-size: 14px;">
                        For technical support, contact info@remappro.eu
                      </p>
                      <p style="margin: 0; color: #666; font-size: 12px;">
                        © ${new Date().getFullYear()} REMAPPRO Digital Solutions. Slovakia, European Union.
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
          subject: `Invoice ${invoiceNumber} - REMAPPRO`,
          html: emailHtml,
          attachments: [
            {
              filename: `${invoiceNumber}.pdf`,
              content: pdfBase64,
            },
          ],
        }),
      });
      
      const emailResult = await emailRes.text();
      console.log("Invoice email sent:", emailRes.ok, emailResult);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        invoiceNumber,
        invoiceUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
    
  } catch (error: any) {
    console.error("Generate invoice error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
