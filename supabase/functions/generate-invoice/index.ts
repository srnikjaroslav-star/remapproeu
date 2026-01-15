import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDER = "REMAPPRO <info@remappro.eu>";

// Supplier Details - Hardcoded for REMAPPRO
// All text in English, no special characters (basic Latin only)
const SUPPLIER = {
  brandName: "REMAPPRO",
  legalEntity: "Jaroslav Srnik",
  address: "Janka Krala 29",
  city: "990 01 Velky Krtis",
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
  quantity?: number; // Optional quantity, defaults to 1
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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Margins: 20mm from each side
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Colors - Professional White Background Design
  const textBlack = [0, 0, 0]; // #000000 - Black text
  const textGray = [100, 100, 100]; // #646464 - Gray text
  const textLightGray = [150, 150, 150]; // #969696 - Light gray
  const lineGray = [220, 220, 220]; // #dcdcdc - Light gray lines
  const bgWhite = [255, 255, 255]; // #ffffff - White background
  const bgLightGray = [245, 245, 245]; // #f5f5f5 - Light gray background for table rows
  const bgDarkGray = [80, 80, 80]; // #505050 - Dark gray for table header
  const textWhite = [255, 255, 255]; // #ffffff - White text
  const cyanBlue = [0, 255, 255]; // #00ffff - Cyan blue for PRO
  const successGreen = [0, 150, 0]; // #009600 - Green for PAID IN FULL
  
  // White background for entire page
  doc.setFillColor(...bgWhite);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Header section
  let yPos = margin;
  
  // Logo - REMAPPRO (one word, no space)
  // REMAP in black (#000000), bold
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textBlack);
  const remapWidth = doc.getTextWidth("REMAP");
  doc.text("REMAP", margin, yPos);
  
  // PRO in cyan (#00ffff), bold, no space
  doc.setTextColor(...cyanBlue);
  doc.text("PRO", margin + remapWidth, yPos);
  
  // Right-aligned block: Invoice title, number, order, date
  const rightEdge = pageWidth - margin;
  const rightBlockY = yPos;
  
  // Invoice title (right) - INVOICE
  doc.setTextColor(...textBlack);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", rightEdge, rightBlockY, { align: "right" });
  
  // Invoice number (right, below title)
  doc.setTextColor(...textGray);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice No.: ${data.invoiceNumber}`, rightEdge, rightBlockY + 10, { align: "right" });
  
  // Order number (right, below invoice number)
  doc.setFontSize(10);
  doc.text(`Order: ${data.orderNumber}`, rightEdge, rightBlockY + 17, { align: "right" });
  
  // Date - aligned to right edge
  const currentDate = new Date().toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  doc.text(`Date: ${currentDate}`, rightEdge, rightBlockY + 24, { align: "right" });
  
  // Two column layout for addresses
  yPos = margin + 45;
  
  // Supplier section (left) - "Supplier"
  doc.setTextColor(...textBlack);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Supplier", margin, yPos);
  
  // Light gray line under header
  doc.setDrawColor(...lineGray);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos + 2, margin + 75, yPos + 2);
  
  doc.setTextColor(...textBlack);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(SUPPLIER.brandName, margin, yPos + 12);
  
  doc.setTextColor(...textGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(SUPPLIER.legalEntity, margin, yPos + 20);
  doc.text(SUPPLIER.address, margin, yPos + 28);
  doc.text(SUPPLIER.city, margin, yPos + 36);
  doc.text(SUPPLIER.country, margin, yPos + 44);
  doc.text(`Reg. No.: ${SUPPLIER.ico}`, margin, yPos + 52);
  doc.text(`Tax ID: ${SUPPLIER.dic}`, margin, yPos + 60);
  
  // Customer section (right) - "Customer"
  const customerX = margin + 90;
  doc.setTextColor(...textBlack);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Customer", customerX, yPos);
  
  // Light gray line under header
  doc.setDrawColor(...lineGray);
  doc.setLineWidth(0.5);
  doc.line(customerX, yPos + 2, rightEdge, yPos + 2);
  
  doc.setTextColor(...textBlack);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.customerName || "Customer", customerX, yPos + 12);
  
  doc.setTextColor(...textGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(data.customerEmail, customerX, yPos + 20);
  
  if (data.carInfo) {
    doc.text(`Vehicle: ${data.carInfo}`, customerX, yPos + 28);
  }
  
  if (data.vin) {
    doc.text(`VIN: ${data.vin}`, customerX, yPos + 36);
  }
  
  // Items table with 4 columns: Item | Qty | Unit Price | Total
  yPos = margin + 125;
  
  // Table header - Dark gray with white text
  doc.setFillColor(...bgDarkGray);
  doc.rect(margin, yPos - 8, contentWidth, 12, 'F');
  
  // Header border
  doc.setDrawColor(...bgDarkGray);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos - 8, contentWidth, 12, 'S');
  
  // Column widths (4 columns)
  const col1Width = contentWidth * 0.40; // Item - 40%
  const col2Width = contentWidth * 0.15; // Qty - 15%
  const col3Width = contentWidth * 0.22; // Unit Price - 22%
  const col4Width = contentWidth * 0.23; // Total - 23%
  
  const col1X = margin + 5;
  const col2X = col1X + col1Width;
  const col3X = col2X + col2Width;
  const col4X = col3X + col3Width;
  
  doc.setTextColor(...textWhite);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Item", col1X, yPos);
  doc.text("Qty", col2X, yPos);
  doc.text("Unit Price", col3X, yPos);
  doc.text("Total", col4X, yPos, { align: "right" });
  
  yPos += 12;
  
  // Table items
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const quantity = item.quantity || 1; // Default quantity is 1
    const unitPrice = item.price;
    const totalPrice = unitPrice * quantity;
    
    // Alternating row background - very light gray for better readability
    if (i % 2 === 0) {
      doc.setFillColor(...bgWhite);
    } else {
      doc.setFillColor(...bgLightGray);
    }
    doc.rect(margin, yPos - 6, contentWidth, 12, 'F');
    
    // Row border
    doc.setDrawColor(...lineGray);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos - 6, rightEdge, yPos - 6);
    
    doc.setTextColor(...textBlack);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(item.name, col1X, yPos + 2);
    doc.text(quantity.toString(), col2X, yPos + 2);
    doc.text(`€${unitPrice.toFixed(2)}`, col3X, yPos + 2);
    
    doc.setFont("helvetica", "bold");
    doc.text(`€${totalPrice.toFixed(2)}`, col4X, yPos + 2, { align: "right" });
    
    yPos += 12;
  }
  
  // Bottom border of table
  doc.setDrawColor(...lineGray);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos - 6, rightEdge, yPos - 6);
  
  // Summary section (right aligned)
  yPos += 15;
  
  const summaryWidth = 80;
  const summaryX = rightEdge - summaryWidth;
  
  // "Total Amount" label
  doc.setTextColor(...textGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Total Amount:", summaryX, yPos, { align: "right" });
  
  // Total amount
  doc.setTextColor(...textBlack);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`€${data.totalAmount.toFixed(2)}`, rightEdge, yPos + 8, { align: "right" });
  
  // "PAID IN FULL" status - Green color for customer reassurance
  yPos += 20;
  doc.setTextColor(...successGreen);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PAID IN FULL", rightEdge, yPos, { align: "right" });
  
  // Payment date
  doc.setTextColor(...textGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Payment received: ${currentDate}`, rightEdge, yPos + 8, { align: "right" });
  
  // Footer section - Single line with vertical separators (|)
  const footerY = pageHeight - margin - 10;
  
  // Light gray footer line
  doc.setDrawColor(...lineGray);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, rightEdge, footerY);
  
  // Company details in footer - Single line separated by vertical bars
  doc.setTextColor(...textGray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const footerText = `${SUPPLIER.brandName} | ${SUPPLIER.address}, ${SUPPLIER.city}, ${SUPPLIER.country} | Reg. No.: ${SUPPLIER.ico} | Tax ID: ${SUPPLIER.dic}`;
  doc.text(footerText, pageWidth / 2, footerY + 8, { align: "center" });
  
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
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
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
