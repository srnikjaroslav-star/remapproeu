import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDER = "REMAPPRO <info@remappro.eu>";

// Supplier Details
const SUPPLIER = {
  brandName: "REMAPPRO Digital Solutions",
  legalEntity: "Jaroslav Srník",
  address: "Janka Kráľa 29",
  city: "990 01 Veľký Krtíš",
  country: "Slovakia",
  ico: "41281471",
  dic: "1041196607",
  email: "info@remappro.eu",
};

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
  fuelType?: string;
  year?: number;
  ecuType?: string;
}

const BCC_EMAIL = "richard.srnik2@gmail.com";
const SITE_URL = "https://remappro.eu";

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
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
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colors - matching REMAPPRO website
  const headerBg = [26, 31, 44]; // #1A1F2C
  const primaryCyan = [0, 212, 255]; // #00d4ff
  const darkBg = [10, 10, 10];
  const cardBg = [20, 20, 25];
  const textWhite = [255, 255, 255];
  const textGray = [150, 150, 150];
  const textLight = [200, 200, 200];
  const successGreen = [0, 200, 100];
  
  // Dark background for entire page
  doc.setFillColor(...darkBg);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Header section with brand color
  doc.setFillColor(...headerBg);
  doc.rect(0, 0, pageWidth, 55, 'F');
  
  // Logo text - REMAPPRO style
  doc.setTextColor(...textWhite);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("REMAP", 20, 28);
  doc.setTextColor(...primaryCyan);
  doc.text("PRO", 72, 28);
  
  // Company name
  doc.setTextColor(...textGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Digital Solutions", 20, 38);
  
  // Invoice title on right
  doc.setTextColor(...textWhite);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - 20, 25, { align: "right" });
  
  // Invoice number
  doc.setTextColor(...primaryCyan);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.invoiceNumber, pageWidth - 20, 38, { align: "right" });
  
  // Date
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setTextColor(...textGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${currentDate}`, pageWidth - 20, 48, { align: "right" });
  
  // Cyan accent line under header
  doc.setFillColor(...primaryCyan);
  doc.rect(0, 55, pageWidth, 2, 'F');
  
  // Two column layout for addresses
  let yPos = 75;
  
  // Supplier box (left)
  doc.setFillColor(...cardBg);
  doc.roundedRect(15, yPos - 10, 85, 60, 3, 3, 'F');
  
  doc.setTextColor(...primaryCyan);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("FROM", 20, yPos);
  
  doc.setTextColor(...textWhite);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(SUPPLIER.brandName, 20, yPos + 10);
  
  doc.setTextColor(...textLight);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(SUPPLIER.legalEntity, 20, yPos + 18);
  doc.text(SUPPLIER.address, 20, yPos + 25);
  doc.text(SUPPLIER.city, 20, yPos + 32);
  doc.text(SUPPLIER.country, 20, yPos + 39);
  
  doc.setTextColor(...textGray);
  doc.setFontSize(8);
  doc.text(`IČO: ${SUPPLIER.ico}  |  DIČ: ${SUPPLIER.dic}`, 20, yPos + 48);
  
  // Customer box (right)
  doc.setFillColor(...cardBg);
  doc.roundedRect(105, yPos - 10, 85, 60, 3, 3, 'F');
  
  doc.setTextColor(...primaryCyan);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 110, yPos);
  
  doc.setTextColor(...textWhite);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.customerName || "Customer", 110, yPos + 10);
  
  doc.setTextColor(...textLight);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(data.customerEmail, 110, yPos + 18);
  
  if (data.carInfo) {
    doc.setTextColor(...textGray);
    doc.setFontSize(8);
    doc.text(`Vehicle: ${data.carInfo}`, 110, yPos + 28);
  }
  
  doc.setTextColor(...primaryCyan);
  doc.setFontSize(8);
  doc.text(`Order: ${data.orderNumber}`, 110, yPos + 40);
  
  // Items table
  yPos = 150;
  
  // Table header
  doc.setFillColor(...headerBg);
  doc.roundedRect(15, yPos - 8, pageWidth - 30, 16, 2, 2, 'F');
  
  doc.setTextColor(...primaryCyan);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("SERVICE DESCRIPTION", 20, yPos + 2);
  doc.text("AMOUNT", pageWidth - 20, yPos + 2, { align: "right" });
  
  yPos += 18;
  
  // Table items
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    
    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(18, 18, 22);
    } else {
      doc.setFillColor(25, 25, 30);
    }
    doc.rect(15, yPos - 6, pageWidth - 30, 14, 'F');
    
    doc.setTextColor(...textLight);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(item.name, 20, yPos + 2);
    
    doc.setTextColor(...textWhite);
    doc.setFont("helvetica", "bold");
    doc.text(`€${item.price.toFixed(2)}`, pageWidth - 20, yPos + 2, { align: "right" });
    
    yPos += 14;
  }
  
  // Total section
  yPos += 10;
  
  // Total box
  doc.setFillColor(...primaryCyan);
  doc.roundedRect(pageWidth / 2 + 10, yPos - 6, pageWidth / 2 - 25, 22, 3, 3, 'F');
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", pageWidth / 2 + 20, yPos + 8);
  doc.setFontSize(16);
  doc.text(`€${data.totalAmount.toFixed(2)}`, pageWidth - 20, yPos + 8, { align: "right" });
  
  // Payment status badge
  yPos += 35;
  doc.setFillColor(...successGreen);
  doc.roundedRect(15, yPos - 6, 70, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PAID", 50, yPos + 4, { align: "center" });
  
  // Payment date
  doc.setTextColor(...textGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Payment received: ${currentDate}`, 90, yPos + 4);
  
  // Footer section
  const footerY = pageHeight - 35;
  
  // Footer line
  doc.setDrawColor(50, 50, 55);
  doc.setLineWidth(0.5);
  doc.line(15, footerY - 15, pageWidth - 15, footerY - 15);
  
  // Thank you message
  doc.setTextColor(...textLight);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for choosing REMAPPRO.", pageWidth / 2, footerY - 5, { align: "center" });
  
  doc.setTextColor(...textGray);
  doc.setFontSize(9);
  doc.text(`For technical support, contact ${SUPPLIER.email}`, pageWidth / 2, footerY + 3, { align: "center" });
  
  // Copyright
  doc.setFontSize(8);
  doc.text(`© ${new Date().getFullYear()} ${SUPPLIER.brandName}. ${SUPPLIER.city}, ${SUPPLIER.country}.`, pageWidth / 2, footerY + 12, { align: "center" });
  
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
    
    const { orderId, orderNumber, customerName, customerEmail, items, totalAmount, carBrand, carModel, fuelType, year, ecuType } = data;
    
    if (!orderId || !customerEmail || !items || items.length === 0) {
      throw new Error("Missing required invoice data");
    }
    
    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();
    const invoiceDate = new Date().toISOString();
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
    
    // Save to invoices table for accounting
    const { error: invoiceInsertError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        order_id: orderId,
        order_number: orderNumber,
        customer_name: customerName,
        customer_email: customerEmail,
        amount: totalAmount,
        invoice_url: invoiceUrl,
        invoice_date: invoiceDate,
        items: items,
      });
    
    if (invoiceInsertError) {
      console.error("Invoice table insert error:", invoiceInsertError);
    }
    
    // Send email with PDF attachment via Resend
    if (RESEND_API_KEY) {
      const trackingLink = `${SITE_URL}/track?id=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(customerEmail)}`;
      const carInfo = carBrand && carModel ? `${carBrand} ${carModel}` : '';
      
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
                <table width="650" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #111111 0%, #1a1a1a 100%); border-radius: 16px; border: 1px solid #333; overflow: hidden;">
                  
                  <!-- Header with Logo -->
                  <tr>
                    <td style="padding: 30px 40px; background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-bottom: 2px solid #ff6b00;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align: top;">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">
                              <span style="color: #ffffff;">REMAP</span><span style="color: #ff6b00;">PRO</span>
                            </h1>
                            <p style="margin: 5px 0 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
                              Professional ECU Tuning
                            </p>
                          </td>
                          <td style="vertical-align: top; text-align: right;">
                            <p style="margin: 0; color: #00ff88; font-size: 16px; font-weight: bold;">
                              ✅ Payment Confirmed
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Order Confirmation -->
                  <tr>
                    <td style="padding: 30px 40px;">
                      <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; text-align: center;">
                        Thank you for your order!
                      </h2>
                      
                      <!-- Order ID Banner -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(255, 107, 0, 0.15) 0%, rgba(255, 149, 0, 0.1) 100%); border: 1px solid rgba(255, 107, 0, 0.4); border-radius: 12px; margin-bottom: 20px;">
                        <tr>
                          <td style="padding: 20px; text-align: center;">
                            <p style="margin: 0 0 8px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                              Your Order ID
                            </p>
                            <p style="margin: 0; color: #ff6b00; font-size: 28px; font-weight: bold; font-family: 'Monaco', 'Consolas', monospace; letter-spacing: 2px;">
                              ${orderNumber}
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Customer & Invoice Details -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                        <tr>
                          <td style="vertical-align: top; width: 50%; padding-right: 10px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 212, 255, 0.08); border: 1px solid rgba(0, 212, 255, 0.25); border-radius: 10px;">
                              <tr>
                                <td style="padding: 16px;">
                                  <p style="margin: 0 0 8px; color: #00d4ff; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Customer</p>
                                  <p style="margin: 0 0 4px; color: #ffffff; font-size: 14px; font-weight: 600;">${customerName || 'Customer'}</p>
                                  <p style="margin: 0; color: #aaa; font-size: 13px;">${customerEmail}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td style="vertical-align: top; width: 50%; padding-left: 10px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 255, 136, 0.08); border: 1px solid rgba(0, 255, 136, 0.25); border-radius: 10px;">
                              <tr>
                                <td style="padding: 16px;">
                                  <p style="margin: 0 0 8px; color: #00ff88; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Invoice</p>
                                  <p style="margin: 0 0 4px; color: #ffffff; font-size: 14px; font-weight: 600;">${invoiceNumber}</p>
                                  <p style="margin: 0; color: #00ff88; font-size: 18px; font-weight: bold;">€${totalAmount.toFixed(2)}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      ${carInfo ? `
                      <!-- Vehicle Details -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 107, 0, 0.08); border: 1px solid rgba(255, 107, 0, 0.25); border-radius: 10px; margin-bottom: 20px;">
                        <tr>
                          <td style="padding: 16px;">
                            <p style="margin: 0 0 10px; color: #ff6b00; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
                              🚗 Vehicle Details
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="color: #888; font-size: 12px; padding: 2px 0;">Brand:</td>
                                <td style="color: #ffffff; font-size: 12px; padding: 2px 0; font-weight: 500;">${carBrand || '-'}</td>
                                <td style="color: #888; font-size: 12px; padding: 2px 0; padding-left: 20px;">Model:</td>
                                <td style="color: #ffffff; font-size: 12px; padding: 2px 0; font-weight: 500;">${carModel || '-'}</td>
                              </tr>
                              <tr>
                                <td style="color: #888; font-size: 12px; padding: 2px 0;">Year:</td>
                                <td style="color: #ffffff; font-size: 12px; padding: 2px 0; font-weight: 500;">${year || '-'}</td>
                                <td style="color: #888; font-size: 12px; padding: 2px 0; padding-left: 20px;">Fuel:</td>
                                <td style="color: #ffffff; font-size: 12px; padding: 2px 0; font-weight: 500;">${fuelType || '-'}</td>
                              </tr>
                              ${ecuType ? `
                              <tr>
                                <td style="color: #888; font-size: 12px; padding: 2px 0;">ECU:</td>
                                <td colspan="3" style="color: #00d4ff; font-size: 12px; padding: 2px 0; font-weight: 500;">${ecuType}</td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                      
                      <!-- What's Next -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 20px; text-align: center;">
                            <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; font-weight: 600;">
                              What happens next?
                            </p>
                            <p style="margin: 0; color: #999; font-size: 13px; line-height: 1.6;">
                              Our engineers are now processing your file. You will receive<br>
                              an email notification when your optimized file is ready for download.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Buttons -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding-bottom: 12px;">
                            ${invoiceUrl ? `
                            <a href="${invoiceUrl}" 
                               style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%); color: #000000; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px; margin-right: 10px;">
                              📄 Download Invoice
                            </a>
                            ` : ''}
                          </td>
                        </tr>
                        <tr>
                          <td align="center">
                            <a href="${trackingLink}" 
                               style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%); color: #000000; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px;">
                              🔍 Track Your Order
                            </a>
                          </td>
                        </tr>
                      </table>
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
                              ${SUPPLIER.address}<br>
                              ${SUPPLIER.city}<br>
                              ${SUPPLIER.country}
                            </p>
                          </td>
                          <td style="vertical-align: top; text-align: right;">
                            <table cellpadding="0" cellspacing="0" style="margin-left: auto;">
                              <tr>
                                <td style="padding: 2px 0; color: #888; font-size: 12px;">IČO:</td>
                                <td style="padding: 2px 0 2px 8px; color: #ffffff; font-size: 12px;">${SUPPLIER.ico}</td>
                              </tr>
                              <tr>
                                <td style="padding: 2px 0; color: #888; font-size: 12px;">DIČ:</td>
                                <td style="padding: 2px 0 2px 8px; color: #ffffff; font-size: 12px;">${SUPPLIER.dic}</td>
                              </tr>
                              <tr>
                                <td style="padding: 2px 0; color: #888; font-size: 12px;">Email:</td>
                                <td style="padding: 2px 0 2px 8px; color: #00d4ff; font-size: 12px;">${SUPPLIER.email}</td>
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
          bcc: [BCC_EMAIL],
          subject: `✅ Order Confirmed - ${orderNumber} | REMAPPRO Invoice`,
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
