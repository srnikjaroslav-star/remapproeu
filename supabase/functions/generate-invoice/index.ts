import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDER = "REMAPPRO <info@remappro.eu>";

// Supplier Details - Hardcoded pre REMAPPRO
const SUPPLIER = {
  brandName: "REMAPPRO",
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
  brand?: string;
  model?: string;
  fuelType?: string;
  year?: number;
  ecuType?: string;
  vin?: string;
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
  vin?: string;
}): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colors - Strict Dark Mode
  const primaryCyan = [0, 212, 255]; // #00d4ff - Žiarivá cyanová modrá
  const absoluteBlack = [0, 0, 0]; // #000000 - Absolútna čierna
  const darkGray = [10, 10, 10]; // #0a0a0a - Veľmi tmavá sivá
  const cardBg = [15, 15, 15]; // Tmavšia pre karty
  const textWhite = [255, 255, 255]; // #ffffff - Čisto biely
  const textGray = [136, 136, 136]; // #888 - Šedý text
  const textLight = [224, 224, 224]; // #e0e0e0 - Off-white
  
  // Absolute black background for entire page
  doc.setFillColor(...absoluteBlack);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Cyan accent line at top
  doc.setFillColor(...primaryCyan);
  doc.rect(0, 0, pageWidth, 4, 'F');
  
  // Logo text - REMAPPRO style (no header background, just text on black)
  doc.setTextColor(...textWhite);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text("REMAP", 20, 35);
  doc.setTextColor(...primaryCyan);
  doc.text("PRO", 78, 35);
  
  // Company name
  doc.setTextColor(...textGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Professional ECU Tuning", 20, 45);
  
  // Invoice title on right
  doc.setTextColor(...textWhite);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - 20, 30, { align: "right" });
  
  // Invoice number (cyan)
  doc.setTextColor(...primaryCyan);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.invoiceNumber, pageWidth - 20, 42, { align: "right" });
  
  // Date
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setTextColor(...textGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${currentDate}`, pageWidth - 20, 52, { align: "right" });
  
  // Two column layout for addresses
  let yPos = 70;
  
  // Supplier box (left) - Modern block design
  doc.setFillColor(...cardBg);
  doc.roundedRect(15, yPos - 8, 85, 65, 0, 0, 'F'); // Sharp corners for modern look
  
  // Cyan border
  doc.setDrawColor(...primaryCyan);
  doc.setLineWidth(1);
  doc.roundedRect(15, yPos - 8, 85, 65, 0, 0, 'S');
  
  doc.setTextColor(...primaryCyan);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("FROM", 20, yPos);
  
  doc.setTextColor(...textWhite);
  doc.setFontSize(12);
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
  doc.text(`IČO: ${SUPPLIER.ico}`, 20, yPos + 48);
  doc.text(`DIČ: ${SUPPLIER.dic}`, 20, yPos + 55);
  
  // Customer box (right) - Modern block design
  doc.setFillColor(...cardBg);
  doc.roundedRect(105, yPos - 8, 85, 65, 0, 0, 'F');
  
  // Cyan border
  doc.setDrawColor(...primaryCyan);
  doc.setLineWidth(1);
  doc.roundedRect(105, yPos - 8, 85, 65, 0, 0, 'S');
  
  doc.setTextColor(...primaryCyan);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 110, yPos);
  
  doc.setTextColor(...textWhite);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.customerName || "Customer", 110, yPos + 10);
  
  doc.setTextColor(...textLight);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(data.customerEmail, 110, yPos + 18);
  
  if (data.carInfo) {
    doc.setTextColor(...primaryCyan);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`🚗 ${data.carInfo}`, 110, yPos + 28);
  }
  
  if (data.vin) {
    doc.setTextColor(...primaryCyan);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`VIN: ${data.vin}`, 110, yPos + 38);
  }
  
  doc.setTextColor(...primaryCyan);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Order: ${data.orderNumber}`, 110, yPos + 48);
  
  // Items table
  yPos = 150;
  
  // Table header - Cyan background
  doc.setFillColor(...primaryCyan);
  doc.roundedRect(15, yPos - 8, pageWidth - 30, 16, 0, 0, 'F');
  
  doc.setTextColor(0, 0, 0); // Black text on cyan
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("SERVICE DESCRIPTION", 20, yPos + 2);
  doc.text("AMOUNT", pageWidth - 20, yPos + 2, { align: "right" });
  
  yPos += 18;
  
  // Table items - Black background rows
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    
    // Alternating row background (very dark)
    if (i % 2 === 0) {
      doc.setFillColor(5, 5, 5);
    } else {
      doc.setFillColor(10, 10, 10);
    }
    doc.rect(15, yPos - 6, pageWidth - 30, 14, 'F');
    
    doc.setTextColor(...textWhite);
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
  
  // Total box - Cyan background (svieti)
  doc.setFillColor(...primaryCyan);
  doc.roundedRect(pageWidth / 2 + 10, yPos - 6, pageWidth / 2 - 25, 22, 0, 0, 'F');
  
  doc.setTextColor(0, 0, 0); // Black text on cyan
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", pageWidth / 2 + 20, yPos + 8);
  doc.setFontSize(18);
  doc.text(`€${data.totalAmount.toFixed(2)}`, pageWidth - 20, yPos + 8, { align: "right" });
  
  // Payment status badge - Cyan
  yPos += 35;
  doc.setFillColor(...primaryCyan);
  doc.roundedRect(15, yPos - 6, 70, 18, 0, 0, 'F');
  doc.setTextColor(0, 0, 0);
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
  
  // Cyan footer line
  doc.setDrawColor(...primaryCyan);
  doc.setLineWidth(1);
  doc.line(15, footerY - 15, pageWidth - 15, footerY - 15);
  
  // Thank you message
  doc.setTextColor(...textWhite);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for choosing REMAPPRO.", pageWidth / 2, footerY - 5, { align: "center" });
  
  doc.setTextColor(...textGray);
  doc.setFontSize(9);
  doc.text(`For technical support, contact ${SUPPLIER.email}`, pageWidth / 2, footerY + 3, { align: "center" });
  
  // Company details with IČO and DIČ
  doc.setFontSize(8);
  doc.text(`${SUPPLIER.brandName}, ${SUPPLIER.address}, ${SUPPLIER.city}, ${SUPPLIER.country}.`, pageWidth / 2, footerY + 8, { align: "center" });
  doc.text(`IČO: ${SUPPLIER.ico}, DIČ: ${SUPPLIER.dic}`, pageWidth / 2, footerY + 15, { align: "center" });
  
  // Copyright
  doc.setFontSize(7);
  doc.text(`© ${new Date().getFullYear()} ${SUPPLIER.brandName}. All rights reserved.`, pageWidth / 2, footerY + 22, { align: "center" });
  
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
    
    // Extract data with fallback values
    const orderId = data.orderId || "";
    const orderNumber = data.orderNumber || orderId || "N/A";
    const customerName = data.customerName || "Customer";
    const customerEmail = data.customerEmail || "";
    const items = data.items || [];
    const totalAmount = data.totalAmount || 0;
    const brand = data.brand || undefined;
    const model = data.model || undefined;
    const fuelType = data.fuelType || undefined;
    const year = data.year || undefined;
    const ecuType = data.ecuType || undefined;
    const vin = data.vin || undefined;
    
    // Validate only truly required fields
    if (!orderId) {
      console.error("Missing orderId in invoice request");
      throw new Error("Missing required field: orderId");
    }
    
    if (!customerEmail) {
      console.error("Missing customerEmail in invoice request");
      throw new Error("Missing required field: customerEmail");
    }
    
    if (!items || items.length === 0) {
      console.error("Missing or empty items array in invoice request");
      // Use default item if none provided
      const defaultItems = [{
        name: "ECU Tuning Service",
        price: totalAmount || 0
      }];
      items.push(...defaultItems);
    }
    
    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();
    const invoiceDate = new Date().toISOString();
    console.log("Generated invoice number:", invoiceNumber);
    
    // Format totalAmount to 2 decimal places (ensure it's a number)
    const formattedTotalAmount = typeof totalAmount === 'number' && !isNaN(totalAmount) 
      ? parseFloat(totalAmount.toFixed(2)) 
      : 0;
    
    console.log("Invoice data prepared:", {
      orderId,
      orderNumber,
      customerName,
      customerEmail: customerEmail ? `${customerEmail.substring(0, 5)}...` : 'MISSING',
      itemsCount: items.length,
      totalAmount: formattedTotalAmount,
      brand: brand || 'N/A',
      model: model || 'N/A',
    });
    
    // Generate PDF with vehicle info
    const carInfo = brand && model ? `${brand} ${model}` : undefined;
    const pdfBase64 = generateInvoicePDF({
      invoiceNumber,
      customerName,
      customerEmail,
      items,
      totalAmount: formattedTotalAmount,
      orderNumber,
      carInfo,
      vin,
    });
    
    console.log("PDF generated, size:", pdfBase64.length);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // STEP 1: Upload PDF to storage FIRST - bucket 'invoices'
    // File name: invoice-${orderId}.pdf
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const fileName = `invoice-${orderId}.pdf`;
    
    console.log("Uploading invoice PDF to storage:", fileName);
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    
    if (uploadError) {
      console.error("PDF upload error:", uploadError);
      throw new Error(`Failed to upload invoice PDF: ${uploadError.message}`);
    }
    
    console.log("PDF uploaded successfully to invoices bucket");
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(fileName);
    
    const invoiceUrl = urlData?.publicUrl || null;
    console.log("Invoice public URL:", invoiceUrl);
    
    // STEP 2: Save invoice URL to database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        invoice_number: invoiceNumber,
        invoice_url: invoiceUrl,
      })
      .eq('id', orderId);
    
    if (updateError) {
      console.error("Order update error:", updateError);
      // Non-fatal - continue even if DB update fails
    } else {
      console.log("Invoice URL saved to orders table");
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
    
    // STEP 3: Send email with PDF attachment via Resend (separate try-catch, non-blocking)
    // If Resend fails (e.g., 403), function continues and returns success because PDF is already in Storage
    if (RESEND_API_KEY) {
      try {
        const trackingLink = `${SITE_URL}/track?id=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(customerEmail)}`;
        const carInfo = brand && model ? `${brand} ${model}` : '';
        
        const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #000000; border-radius: 0;">
                  
                  <!-- Header with Logo -->
                  <tr>
                    <td style="padding: 50px 40px 40px; text-align: center; border-bottom: 2px solid #00d4ff;">
                      <h1 style="margin: 0; font-size: 36px; font-weight: 800; color: #ffffff; letter-spacing: 3px;">
                        <span style="color: #ffffff;">REMAP</span><span style="color: #00d4ff;">PRO</span>
                      </h1>
                      <p style="margin: 12px 0 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
                        Professional ECU Tuning
                      </p>
                      <p style="margin: 15px 0 0; color: #00d4ff; font-size: 14px; font-weight: 600;">
                        ✅ Payment Confirmed
                      </p>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 50px 40px;">
                      <h2 style="margin: 0 0 25px; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.2;">
                        Thank you for your order!
                      </h2>
                      
                      <!-- Order ID Banner -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border-radius: 0; border: 1px solid #00d4ff; margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 25px; text-align: center;">
                            <p style="margin: 0 0 8px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Your Order ID</p>
                            <p style="margin: 0; color: #00d4ff; font-size: 28px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px;">${orderNumber}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Customer & Invoice Details -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                        <tr>
                          <td style="vertical-align: top; width: 50%; padding-right: 10px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 0;">
                              <tr>
                                <td style="padding: 20px;">
                                  <p style="margin: 0 0 8px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Customer</p>
                                  <p style="margin: 0 0 6px; color: #ffffff; font-size: 16px; font-weight: 600;">${customerName || 'Customer'}</p>
                                  <p style="margin: 0; color: #888; font-size: 14px;">${customerEmail}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td style="vertical-align: top; width: 50%; padding-left: 10px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border: 1px solid #00d4ff; border-radius: 0;">
                              <tr>
                                <td style="padding: 20px;">
                                  <p style="margin: 0 0 8px; color: #00d4ff; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Invoice</p>
                                  <p style="margin: 0 0 6px; color: #ffffff; font-size: 16px; font-weight: 600;">${invoiceNumber}</p>
                                  <p style="margin: 0; color: #00d4ff; font-size: 22px; font-weight: 700;">€${totalAmount.toFixed(2)}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      ${carInfo ? `
                      <!-- Vehicle Details -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 0; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 15px; color: #00d4ff; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                              🚗 Vehicle Details
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="color: #888; font-size: 12px; padding: 4px 0;">Brand:</td>
                                <td style="color: #ffffff; font-size: 12px; padding: 4px 0; font-weight: 500;">${brand || '-'}</td>
                                <td style="color: #888; font-size: 12px; padding: 4px 0; padding-left: 20px;">Model:</td>
                                <td style="color: #ffffff; font-size: 12px; padding: 4px 0; font-weight: 500;">${model || '-'}</td>
                              </tr>
                              <tr>
                                <td style="color: #888; font-size: 12px; padding: 4px 0;">Year:</td>
                                <td style="color: #ffffff; font-size: 12px; padding: 4px 0; font-weight: 500;">${year || '-'}</td>
                                <td style="color: #888; font-size: 12px; padding: 4px 0; padding-left: 20px;">Fuel:</td>
                                <td style="color: #ffffff; font-size: 12px; padding: 4px 0; font-weight: 500;">${fuelType || '-'}</td>
                              </tr>
                              ${ecuType ? `
                              <tr>
                                <td style="color: #888; font-size: 12px; padding: 4px 0;">ECU:</td>
                                <td colspan="3" style="color: #00d4ff; font-size: 12px; padding: 4px 0; font-weight: 600;">${ecuType}</td>
                              </tr>
                              ` : ''}
                              ${vin ? `
                              <tr>
                                <td style="color: #888; font-size: 12px; padding: 4px 0;">VIN:</td>
                                <td colspan="3" style="color: #00d4ff; font-size: 12px; padding: 4px 0; font-weight: 600; font-family: 'Courier New', monospace;">${vin}</td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                      
                      <!-- What's Next -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 0; margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 25px; text-align: center;">
                            <p style="margin: 0 0 12px; color: #ffffff; font-size: 15px; font-weight: 600;">
                              What happens next?
                            </p>
                            <p style="margin: 0; color: #888; font-size: 14px; line-height: 1.7;">
                              Our engineers are now processing your file. You will receive<br>
                              an email notification when your optimized file is ready for download.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Buttons -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding-bottom: 15px;">
                            ${invoiceUrl ? `
                            <a href="${invoiceUrl}" 
                               style="display: inline-block; padding: 18px 40px; background-color: #00d4ff; color: #000000; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 0; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);">
                              📄 Stiahnuť faktúru
                            </a>
                            ` : ''}
                          </td>
                        </tr>
                        <tr>
                          <td align="center">
                            <a href="${trackingLink}" 
                               style="display: inline-block; padding: 18px 40px; background-color: #00d4ff; color: #000000; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 0; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);">
                              🔍 Sledovať objednávku
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 40px 40px 30px; border-top: 1px solid #1a1a1a; text-align: center; background-color: #000000;">
                      <p style="margin: 0 0 8px; color: #888; font-size: 12px; line-height: 1.6; background-color: #000000;">
                        REMAPPRO
                      </p>
                      <p style="margin: 0 0 8px; color: #888; font-size: 12px; line-height: 1.6; background-color: #000000;">
                        Janka Kráľa 29, 990 01 Veľký Krtíš, Slovakia
                      </p>
                      <p style="margin: 0 0 15px; color: #888; font-size: 12px; line-height: 1.6; background-color: #000000;">
                        IČO: 41281471 | DIČ: 1041196607
                      </p>
                      <p style="margin: 0; color: #555; font-size: 11px; background-color: #000000;">
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
          subject: `Potvrdenie objednávky č. ${orderNumber} - REMAPPRO`,
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
      
      if (!emailRes.ok) {
        // If Resend fails (e.g., 403), log but continue - PDF is already in Storage
        if (emailRes.status === 403) {
          console.warn("Resend API returned 403 (forbidden) - invoice PDF is saved in Storage, continuing...");
        } else {
          console.error("Resend API error:", emailRes.status, emailResult);
        }
      } else {
        console.log("Invoice email sent successfully via Resend");
      }
      } catch (resendError: any) {
        // Resend error is non-fatal - PDF is already in Storage and URL is saved to DB
        console.error("Resend email sending failed (non-fatal):", resendError);
        console.log("Invoice PDF is saved in Storage, function will return success");
      }
    }
    
    // Return success - PDF is in Storage and URL is in DB, even if email failed
    return new Response(
      JSON.stringify({
        success: true,
        invoiceNumber,
        invoiceUrl,
        message: "Invoice generated and saved successfully",
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
