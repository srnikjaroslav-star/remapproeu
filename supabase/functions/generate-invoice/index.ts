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
}

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
    
    const { orderId, orderNumber, customerName, customerEmail, items, totalAmount, carBrand, carModel } = data;
    
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
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1A1F2C 0%, #111111 100%); border-radius: 16px; border: 1px solid #333;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #333; background: #1A1F2C; border-radius: 16px 16px 0 0;">
                      <h1 style="margin: 0; font-size: 32px; font-weight: bold;">
                        <span style="color: #ffffff;">REMAP</span><span style="color: #00d4ff;">PRO</span>
                      </h1>
                      <p style="margin: 10px 0 0; color: #888; font-size: 14px;">
                        Digital Solutions
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #00ffcc; font-size: 22px; text-align: center;">
                        🧾 Your Invoice
                      </h2>
                      
                      <p style="margin: 0 0 20px; color: #ffffff; font-size: 16px; line-height: 1.6;">
                        Hello,
                      </p>
                      
                      <p style="margin: 0 0 25px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                        Thank you for your payment. Please find your official invoice for your software optimization service attached below.
                      </p>
                      
                      <!-- Invoice Details Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 12px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 25px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="width: 50%;">
                                  <p style="margin: 0 0 5px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Invoice Number</p>
                                  <p style="margin: 0; color: #00d4ff; font-size: 18px; font-weight: bold; font-family: 'Monaco', monospace;">${invoiceNumber}</p>
                                </td>
                                <td style="width: 50%; text-align: right;">
                                  <p style="margin: 0 0 5px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Amount Paid</p>
                                  <p style="margin: 0; color: #00ff88; font-size: 22px; font-weight: bold;">€${totalAmount.toFixed(2)}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Order Reference -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 107, 0, 0.1); border: 1px solid rgba(255, 107, 0, 0.3); border-radius: 12px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 18px; text-align: center;">
                            <p style="margin: 0 0 5px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Order Reference</p>
                            <p style="margin: 0; color: #ff9500; font-size: 16px; font-weight: bold; font-family: 'Monaco', monospace;">${orderNumber}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0; color: #999; font-size: 14px; line-height: 1.6; text-align: center;">
                        Your order is now being processed by our engineering team.<br>
                        You will receive another email once your tuning file is ready.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 25px 40px; border-top: 1px solid #333; text-align: center;">
                      <p style="margin: 0 0 8px; color: #888; font-size: 13px;">
                        For technical support, contact ${SUPPLIER.email}
                      </p>
                      <p style="margin: 0; color: #555; font-size: 11px;">
                        © ${new Date().getFullYear()} ${SUPPLIER.brandName}<br>
                        ${SUPPLIER.address}, ${SUPPLIER.city}, ${SUPPLIER.country}
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
          subject: `Your REMAPPRO Invoice - Order #${orderNumber}`,
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
