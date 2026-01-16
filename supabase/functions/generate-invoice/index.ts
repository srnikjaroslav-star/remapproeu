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
  creditNote?: boolean;
  originalInvoiceNumber?: string;
  creditNoteNumber?: string;
}

const BCC_EMAIL = "richard.srnik2@gmail.com";
const SITE_URL = "https://remappro.eu";

// Services definition - must match src/data/services.ts
interface Service {
  id: string;
  name: string;
  price: number;
  category: 'stage' | 'removal' | 'modification';
}

const SERVICES: Service[] = [
  // Stage tuning
  { id: 'diesel-stage1', name: 'Diesel STAGE1', price: 60, category: 'stage' },
  { id: 'petrol-stage1', name: 'Petrol STAGE1', price: 60, category: 'stage' },
  { id: 'tcu-gearbox', name: 'TCU Gearbox', price: 60, category: 'stage' },
  // Removal services
  { id: 'adblue', name: 'ADBlue', price: 35, category: 'removal' },
  { id: 'dpf', name: 'DPF', price: 35, category: 'removal' },
  { id: 'opf-gpf', name: 'OPF/GPF', price: 35, category: 'removal' },
  { id: 'egr', name: 'EGR', price: 25, category: 'removal' },
  { id: 'swirl-flaps', name: 'SWIRL Flaps', price: 25, category: 'removal' },
  { id: 'lambda', name: 'Lambda', price: 25, category: 'removal' },
  { id: 'immo', name: 'Immo', price: 25, category: 'removal' },
  // Modifications
  { id: 'emission-ek-stk', name: 'Emission (EK/STK)', price: 35, category: 'modification' },
  { id: 'vmax', name: 'V-Max', price: 25, category: 'modification' },
  { id: 'hot-start', name: 'Hot Start', price: 25, category: 'modification' },
  { id: 'cold-start', name: 'Cold Start', price: 25, category: 'modification' },
  { id: 'idle-speed-rpm', name: 'Idle Speed RPM', price: 25, category: 'modification' },
  { id: 'torque-limiter', name: 'Torque (Errors) Limiter', price: 35, category: 'modification' },
  { id: 'dtc', name: 'DTC', price: 25, category: 'modification' },
  { id: 'start-stop', name: 'Start Stop', price: 25, category: 'modification' },
  { id: 'burbles', name: 'Burbles', price: 35, category: 'modification' },
  { id: 'cylinder-shutdown', name: 'Cylinder Shutdown', price: 35, category: 'modification' },
  { id: 'oil-pressure', name: 'Oil Pressure', price: 35, category: 'modification' },
  { id: 'glow-plugs-time', name: 'Glow Plugs Time', price: 35, category: 'modification' },
  { id: 'eolys-off', name: 'Eolys (OFF)', price: 35, category: 'modification' },
];

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${random}`;
}

// Map service_type array from order to invoice items
// Takes full order object and returns items with { name, qty, unitPrice, total }
interface MappedInvoiceItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

function mapServicesToItems(order: any): MappedInvoiceItem[] {
  // Get total_amount from order (handle string/number conversion)
  const totalAmount = typeof order.total_price === 'string' 
    ? parseFloat(order.total_price) 
    : (order.total_price || 0);
  
  // Extract service_type from order - handle string with comma-separated values
  let serviceTypes: string[] = [];
  if (order.service_type) {
    if (Array.isArray(order.service_type)) {
      serviceTypes = order.service_type;
    } else if (typeof order.service_type === 'string') {
      // Split by comma and trim spaces - "Diesel STAGE1, Petrol STAGE1" -> ["Diesel STAGE1", "Petrol STAGE1"]
      serviceTypes = order.service_type.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    } else {
      serviceTypes = [String(order.service_type)];
    }
  }
  
  // If service_type is empty or not found, return error item
  if (!serviceTypes || serviceTypes.length === 0) {
    return [{
      name: 'DATA ERROR: NO SERVICES FOUND',
      qty: 1,
      unitPrice: 0,
      total: 0
    }];
  }
  
  // Map each service - try to find by name first, then by id
  const items: MappedInvoiceItem[] = [];
  const pricePerService = totalAmount / serviceTypes.length; // Fallback price if service not found
  
  for (const serviceNameOrId of serviceTypes) {
    // Clean service name - remove brackets [ ] and quotes "
    const cleanServiceName = serviceNameOrId.replace(/[\[\]"]/g, '').trim();
    
    // Try to find service by id first
    let service = SERVICES.find(s => s.id === cleanServiceName);
    
    // If not found by id, try to find by name (case-insensitive)
    if (!service) {
      service = SERVICES.find(s => s.name.toLowerCase() === cleanServiceName.toLowerCase());
    }
    
    if (service) {
      // Service found in SERVICES array - use its price
      const unitPrice = parseFloat(service.price.toFixed(2));
      const qty = 1;
      const total = parseFloat((unitPrice * qty).toFixed(2));
      
      items.push({
        name: service.name, // Use clean service name from SERVICES
        qty: qty,
        unitPrice: unitPrice,
        total: total
      });
    } else {
      // Service not found - use cleaned service name and price from total_price
      // Ensure price is not 0 - use total_price divided by number of services
      const unitPrice = pricePerService > 0 ? parseFloat(pricePerService.toFixed(2)) : parseFloat((totalAmount / serviceTypes.length).toFixed(2));
      const qty = 1;
      const total = parseFloat((unitPrice * qty).toFixed(2));
      
      items.push({
        name: cleanServiceName, // Use cleaned service name from the string
        qty: qty,
        unitPrice: unitPrice,
        total: total
      });
    }
  }
  
  // If no items were created, return error
  if (items.length === 0) {
    return [{
      name: 'DATA ERROR: NO SERVICES FOUND',
      qty: 1,
      unitPrice: 0,
      total: 0
    }];
  }
  
  return items;
}

// Convert MappedInvoiceItem to InvoiceItem for PDF generation
function convertToInvoiceItems(mappedItems: MappedInvoiceItem[]): InvoiceItem[] {
  return mappedItems.map(item => ({
    name: item.name,
    price: item.unitPrice,
    quantity: item.qty
  }));
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
  creditNote?: boolean;
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
  
  // Invoice title (right) - INVOICE or CREDIT NOTE
  doc.setTextColor(...textBlack);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  const invoiceTitle = data.creditNote ? "CREDIT NOTE" : "INVOICE";
  doc.text(invoiceTitle, rightEdge, rightBlockY, { align: "right" });
  
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
  
  // Two column layout for addresses - compact spacing (reduced by 35%)
  yPos = margin + 45;
  const lineSpacing = 7; // Reduced from ~8-10 to 7 (35% reduction)
  
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
  doc.text(SUPPLIER.brandName, margin, yPos + lineSpacing);
  
  doc.setTextColor(...textGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(SUPPLIER.legalEntity, margin, yPos + lineSpacing * 2);
  doc.text(SUPPLIER.address, margin, yPos + lineSpacing * 3);
  doc.text(SUPPLIER.city, margin, yPos + lineSpacing * 4);
  doc.text(SUPPLIER.email, margin, yPos + lineSpacing * 5); // Email added after address
  doc.text(SUPPLIER.country, margin, yPos + lineSpacing * 6);
  doc.text(`Reg. No.: ${SUPPLIER.ico}`, margin, yPos + lineSpacing * 7);
  doc.text(`Tax ID: ${SUPPLIER.dic}`, margin, yPos + lineSpacing * 8);
  
  // Customer section (right) - "Customer" - aligned horizontally with Supplier
  const customerX = margin + 90;
  doc.setTextColor(...textBlack);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Customer", customerX, yPos); // Same yPos as Supplier for horizontal alignment
  
  // Light gray line under header
  doc.setDrawColor(...lineGray);
  doc.setLineWidth(0.5);
  doc.line(customerX, yPos + 2, rightEdge, yPos + 2);
  
  doc.setTextColor(...textBlack);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.customerName || "Customer", customerX, yPos + lineSpacing);
  
  doc.setTextColor(...textGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(data.customerEmail, customerX, yPos + lineSpacing * 2);
  
  if (data.carInfo) {
    doc.text(`Vehicle: ${data.carInfo}`, customerX, yPos + lineSpacing * 3);
  }
  
  if (data.vin) {
    doc.text(`VIN: ${data.vin}`, customerX, yPos + lineSpacing * 4);
  }
  
  // Adjust table start position for compact header (reduced spacing)
  const tableStartY = margin + 110;
  
  // Items table with 4 columns: Item | Qty | Unit Price | Total
  // Dynamically iterate through all items in the order
  yPos = tableStartY;
  
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
  
  // Right edges for right-aligned columns
  const col3Right = col3X + col3Width - 5;
  const col4Right = col4X + col4Width - 5;
  
  doc.setTextColor(...textWhite);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Item", col1X, yPos);
  doc.text("Qty", col2X, yPos);
  doc.text("Unit Price", col3Right, yPos, { align: "right" });
  doc.text("Total", col4Right, yPos, { align: "right" });
  
  yPos += 12;
  
  // Table items
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const quantity = item.quantity || 1; // Default quantity is 1
    let unitPrice = item.price;
    let totalPrice = unitPrice * quantity;
    
    // If price is 0 or missing, calculate from total_amount
    if (!unitPrice || unitPrice === 0) {
      unitPrice = data.totalAmount / data.items.length;
      totalPrice = unitPrice * quantity;
    }
    
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
    // Clean item name - remove brackets [ ] and quotes "
    const cleanItemName = item.name.replace(/[\[\]"]/g, '').trim();
    doc.text(cleanItemName, col1X, yPos + 2);
    doc.text(quantity.toString(), col2X, yPos + 2);
    // Unit Price - right aligned
    doc.text(`€${unitPrice.toFixed(2)}`, col3Right, yPos + 2, { align: "right" });
    
    // Total - right aligned
    doc.setFont("helvetica", "bold");
    doc.text(`€${totalPrice.toFixed(2)}`, col4Right, yPos + 2, { align: "right" });
    
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
  
  // Calculate total dynamically from items (sum of all rows)
  const calculatedTotal = data.items.reduce((sum, item) => {
    const quantity = item.quantity || 1;
    return sum + (item.price * quantity);
  }, 0);
  
  // "Total Amount" label
  doc.setTextColor(...textGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Total Amount:", summaryX, yPos, { align: "right" });
  
  // Total amount - use calculated total from items
  doc.setTextColor(...textBlack);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`€${calculatedTotal.toFixed(2)}`, rightEdge, yPos + 8, { align: "right" });
  
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
  
  // Company details in footer - Mandatory footer details with required information
  doc.setTextColor(...textGray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  // Required footer: REMAPPRO Janka Krala 29, 990 01 Velky Krtis, Slovakia ICO: 41281471, DIC: 1041196607 Email: info@remappro.eu
  const footerText = `${SUPPLIER.brandName} ${SUPPLIER.address}, ${SUPPLIER.city}, ${SUPPLIER.country} ICO: ${SUPPLIER.ico}, DIC: ${SUPPLIER.dic} Email: ${SUPPLIER.email}`;
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
    console.log("[generate-invoice] Received request:", JSON.stringify(data, null, 2));
    
    // Extract data with fallback values
    const orderId = data.orderId || "";
    const isCreditNote = data.creditNote || false;
    console.log("[generate-invoice] isCreditNote:", isCreditNote);
    
    // Validate only truly required fields
    if (!orderId) {
      console.error("Missing orderId in invoice request");
      throw new Error("Missing required field: orderId");
    }
    
    // Create Supabase client to fetch order data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch order from database to get real service data
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError || !orderData) {
      console.error("Error fetching order:", orderError);
      throw new Error(`Failed to fetch order: ${orderError?.message || 'Order not found'}`);
    }
    
    // Extract data from order
    const orderNumber = orderData.order_number || data.orderNumber || orderId || "N/A";
    const customerName = orderData.customer_name || data.customerName || "Customer";
    const customerEmail = orderData.customer_email || data.customerEmail || "";
    const totalAmount = orderData.total_price || data.totalAmount || 0;
    const brand = orderData.car_brand || data.brand || undefined;
    const model = orderData.car_model || data.model || undefined;
    const fuelType = orderData.fuel_type || data.fuelType || undefined;
    const year = orderData.year || data.year || undefined;
    const ecuType = orderData.ecu_type || data.ecuType || undefined;
    const vin = orderData.vin || data.vin || undefined;
    
    if (!customerEmail) {
      console.error("Missing customerEmail in order data");
      throw new Error("Missing required field: customerEmail");
    }
    
    // REAL DATA MAPPING: Try to fetch from order_items table first, then fallback to service_type from orders
    let mappedItems: MappedInvoiceItem[] = [];
    
    // Try to fetch from order_items table
    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    
    if (!orderItemsError && orderItemsData && orderItemsData.length > 0) {
      // REAL DATA FROM order_items TABLE
      const orderTotal = typeof totalAmount === 'string' ? parseFloat(totalAmount) : (totalAmount || 0);
      mappedItems = orderItemsData.map((item: any) => {
        const service = SERVICES.find(s => s.id === item.service_type || s.id === item.service_id);
        // Get price - prioritize item price, then service price, then calculate from total
        let unitPrice = item.price || item.unit_price;
        if (!unitPrice || unitPrice === 0) {
          unitPrice = service ? service.price : (orderTotal / orderItemsData.length);
        }
        const qty = item.quantity || item.qty || 1;
        const total = parseFloat((unitPrice * qty).toFixed(2));
        
        // Clean service name - remove brackets [ ] and quotes "
        let serviceName = service ? service.name : (item.name || item.service_name || 'Unknown Service');
        serviceName = serviceName.replace(/[\[\]"]/g, '').trim();
        
        return {
          name: serviceName,
          qty: qty,
          unitPrice: parseFloat(unitPrice.toFixed(2)),
          total: total
        };
      });
    } else {
      // Fallback: Use service_type from orders table
      // service_type can be a comma-separated string like "Diesel STAGE1, Petrol STAGE1"
      mappedItems = mapServicesToItems(orderData);
    }
    
    // Calculate total dynamically as sum of all items (primary source of truth)
    const calculatedTotalFromItems = mappedItems.reduce((sum, item) => sum + item.total, 0);
    
    // Use calculated total from items, fallback to order total if needed
    // For credit notes, use the negative amount from request, otherwise use calculated total
    let finalTotalAmount = calculatedTotalFromItems > 0 
      ? calculatedTotalFromItems 
      : (typeof totalAmount === 'string' ? parseFloat(totalAmount) : (totalAmount || 0));
    
    // If this is a credit note and totalAmount from request is negative, use it
    if (isCreditNote && data.totalAmount && data.totalAmount < 0) {
      finalTotalAmount = data.totalAmount;
      console.log("[generate-invoice] Using negative totalAmount from request for credit note:", finalTotalAmount);
    }
    
    // Convert to InvoiceItem format for PDF generation
    const items = convertToInvoiceItems(mappedItems);
    
    // Generate invoice number (or use credit note number if provided)
    const invoiceNumber = isCreditNote && data.creditNoteNumber 
      ? data.creditNoteNumber 
      : generateInvoiceNumber();
    const invoiceDate = new Date().toISOString();
    console.log("[generate-invoice] Invoice/Credit Note Number:", invoiceNumber);
    console.log("[generate-invoice] isCreditNote flag:", isCreditNote);
    
    // Format totalAmount to 2 decimal places (ensure it's a number)
    // For credit notes, totalAmount should already be negative
    const formattedTotalAmount = typeof finalTotalAmount === 'number' && !isNaN(finalTotalAmount) 
      ? parseFloat(finalTotalAmount.toFixed(2)) 
      : 0;
    
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
      creditNote: isCreditNote,
    });
    
    // STEP 1: Upload PDF to storage FIRST
    // For credit notes: use 'credit-note' bucket, for invoices: use 'invoices' bucket
    console.log("[generate-invoice] STEP 1: Uploading PDF to storage. isCreditNote:", isCreditNote);
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const fileName = isCreditNote ? `credit-note-${orderId}.pdf` : `invoice-${orderId}.pdf`;
    const bucketName = isCreditNote ? 'credit-note' : 'invoices';
    console.log("[generate-invoice] File name:", fileName);
    console.log("[generate-invoice] Bucket name:", bucketName);
    
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    
    if (uploadError) {
      console.error("[generate-invoice] PDF upload error:", uploadError);
      throw new Error(`Failed to upload ${isCreditNote ? 'credit note' : 'invoice'} PDF: ${uploadError.message}`);
    }
    
    console.log("[generate-invoice] PDF uploaded successfully to storage bucket:", bucketName);
    
    // Get public URL from the correct bucket
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    const invoiceUrl = urlData?.publicUrl || null;
    console.log("[generate-invoice] PDF URL:", invoiceUrl);
    
    // STEP 2: Save invoice URL to database
    // CRITICAL: For credit notes, preserve original invoice data and add credit note separately
    console.log("[generate-invoice] STEP 2: Saving to database. isCreditNote:", isCreditNote);
    if (isCreditNote) {
      // For credit notes: Save credit note number and PDF URL to separate columns, preserve original invoice
      console.log("[generate-invoice] Updating credit note fields:", {
        credit_note_number: invoiceNumber,
        credit_note_pdf: invoiceUrl,
        orderId: orderId
      });
      
      if (!invoiceUrl) {
        console.error("[generate-invoice] CRITICAL: invoiceUrl is null! Cannot save credit note to database.");
        throw new Error("Failed to get public URL for credit note PDF");
      }
      
      const { data: updateData, error: creditNoteUpdateError } = await supabase
        .from('orders')
        .update({
          credit_note_number: invoiceNumber,
          credit_note_pdf: invoiceUrl,
          // DO NOT overwrite invoice_number or invoice_url - preserve original invoice
        })
        .eq('id', orderId)
        .select();
      
      if (creditNoteUpdateError) {
        console.error("[generate-invoice] Credit note update error:", creditNoteUpdateError);
        console.error("[generate-invoice] Error details:", JSON.stringify(creditNoteUpdateError, null, 2));
        throw new Error(`Failed to save credit note to database: ${creditNoteUpdateError.message}`);
      } else {
        console.log("[generate-invoice] ✓ Credit note saved successfully to database:", {
          credit_note_number: invoiceNumber,
          credit_note_pdf: invoiceUrl,
          updatedOrder: updateData
        });
        
        // Verify the update
        if (updateData && updateData.length > 0) {
          const updated = updateData[0];
          if (updated.credit_note_number === invoiceNumber && updated.credit_note_pdf === invoiceUrl) {
            console.log("[generate-invoice] ✓ Verification: Credit note data matches in database");
          } else {
            console.warn("[generate-invoice] ⚠ Verification: Credit note data mismatch in database");
            console.warn("[generate-invoice] Expected:", { credit_note_number: invoiceNumber, credit_note_pdf: invoiceUrl });
            console.warn("[generate-invoice] Got:", { credit_note_number: updated.credit_note_number, credit_note_pdf: updated.credit_note_pdf });
          }
        }
      }
    } else {
      // For regular invoices: Save invoice_number and invoice_url normally
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
      }
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
        amount: formattedTotalAmount,
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
        
        // Use mappedItems for email table (with qty, unitPrice, total structure)
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
                      <p style="margin: 15px 0 0; color: #00f2ff; font-size: 14px; font-weight: 600;">
                        ${isCreditNote ? '🔄 Order Cancelled' : '✅ Payment Confirmed'}
                      </p>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 50px 40px;">
                      <h2 style="margin: 0 0 25px; color: #e5e5e5; font-size: 28px; font-weight: 700; line-height: 1.2;">
                        ${isCreditNote ? 'Order Cancelled - Credit Note Issued' : 'Thank you for your order!'}
                      </h2>
                      ${isCreditNote ? `
                      <p style="margin: 0 0 30px; color: #e5e5e5; font-size: 16px; line-height: 1.6;">
                        Dear customer, we regret to inform you that your order <strong style="color: #ffffff;">${orderNumber}</strong> has been cancelled. Please find the attached Credit Note. The refund will be processed within the standard period.
                      </p>
                      ` : ''}
                      
                      <!-- Order ID Banner -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a2e31; border-radius: 5px; margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 25px; text-align: center;">
                            <p style="margin: 0 0 8px; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Your Order ID</p>
                            <p style="margin: 0; color: #00f2ff; font-size: 28px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px;">${orderNumber}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Customer & Invoice Details -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                        <tr>
                          <td style="vertical-align: top; width: 50%; padding-right: 10px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a2e31; border-radius: 5px;">
                              <tr>
                                <td style="padding: 20px;">
                                  <p style="margin: 0 0 8px; color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Customer</p>
                                  <p style="margin: 0 0 6px; color: #00f2ff; font-size: 16px; font-weight: 600;">${customerName || 'Customer'}</p>
                                  <p style="margin: 0; color: #888888; font-size: 14px;">${customerEmail}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td style="vertical-align: top; width: 50%; padding-left: 10px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a2e31; border-radius: 5px;">
                              <tr>
                                <td style="padding: 20px;">
                                  <p style="margin: 0 0 8px; color: #00f2ff; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">${isCreditNote ? 'Credit Note' : 'Invoice'}</p>
                                  <p style="margin: 0 0 6px; color: #00f2ff; font-size: 16px; font-weight: 600;">${invoiceNumber}</p>
                                  <p style="margin: 0; color: #00f2ff; font-size: 22px; font-weight: 700;">€${formattedTotalAmount.toFixed(2)}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      ${carInfo ? `
                      <!-- Vehicle Details -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a2e31; border-radius: 5px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 15px; color: #00f2ff; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                              🚗 Vehicle Details
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="color: #888888; font-size: 12px; padding: 4px 0;">Brand:</td>
                                <td style="color: #00f2ff; font-size: 12px; padding: 4px 0; font-weight: 500;">${brand || '-'}</td>
                                <td style="color: #888888; font-size: 12px; padding: 4px 0; padding-left: 20px;">Model:</td>
                                <td style="color: #00f2ff; font-size: 12px; padding: 4px 0; font-weight: 500;">${model || '-'}</td>
                              </tr>
                              <tr>
                                <td style="color: #888888; font-size: 12px; padding: 4px 0;">Year:</td>
                                <td style="color: #00f2ff; font-size: 12px; padding: 4px 0; font-weight: 500;">${year || '-'}</td>
                                <td style="color: #888888; font-size: 12px; padding: 4px 0; padding-left: 20px;">Fuel:</td>
                                <td style="color: #00f2ff; font-size: 12px; padding: 4px 0; font-weight: 500;">${fuelType || '-'}</td>
                              </tr>
                              ${ecuType ? `
                              <tr>
                                <td style="color: #888888; font-size: 12px; padding: 4px 0;">ECU:</td>
                                <td colspan="3" style="color: #00f2ff; font-size: 12px; padding: 4px 0; font-weight: 600;">${ecuType}</td>
                              </tr>
                              ` : ''}
                              ${vin ? `
                              <tr>
                                <td style="color: #888888; font-size: 12px; padding: 4px 0;">VIN:</td>
                                <td colspan="3" style="color: #00f2ff; font-size: 12px; padding: 4px 0; font-weight: 600; font-family: 'Courier New', monospace;">${vin}</td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                      
                      <!-- Services Table -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a2e31; border-radius: 5px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 15px; color: #00f2ff; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                              📋 Order Items
                            </p>
                            <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                              <thead>
                                <tr style="background-color: #2a4a4f;">
                                  <th style="text-align: left; color: #00f2ff; font-size: 11px; font-weight: 600; padding: 10px; border-bottom: 1px solid #3a5a5f;">Item</th>
                                  <th style="text-align: center; color: #00f2ff; font-size: 11px; font-weight: 600; padding: 10px; border-bottom: 1px solid #3a5a5f;">Qty</th>
                                  <th style="text-align: right; color: #00f2ff; font-size: 11px; font-weight: 600; padding: 10px; border-bottom: 1px solid #3a5a5f;">Unit Price</th>
                                  <th style="text-align: right; color: #00f2ff; font-size: 11px; font-weight: 600; padding: 10px; border-bottom: 1px solid #3a5a5f;">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${mappedItems.map((item, index) => {
                                  // Format item name with word-wrap for long service names
                                  return `
                                    <tr style="${index % 2 === 0 ? 'background-color: #1a2e31;' : 'background-color: #1f3a3f;'}">
                                      <td style="color: #00f2ff; font-size: 12px; padding: 10px; border-bottom: 1px solid #3a5a5f; word-wrap: break-word; max-width: 200px;">${item.name}</td>
                                      <td style="text-align: center; color: #00f2ff; font-size: 12px; padding: 10px; border-bottom: 1px solid #3a5a5f;">${item.qty}</td>
                                      <td style="text-align: right; color: #00f2ff; font-size: 12px; padding: 10px; border-bottom: 1px solid #3a5a5f;">€${item.unitPrice.toFixed(2)}</td>
                                      <td style="text-align: right; color: #00f2ff; font-size: 12px; font-weight: 600; padding: 10px; border-bottom: 1px solid #3a5a5f;">€${item.total.toFixed(2)}</td>
                                    </tr>
                                  `;
                                }).join('')}
                                <tr>
                                  <td colspan="3" style="text-align: right; color: #00f2ff; font-size: 13px; font-weight: 600; padding: 15px 10px 10px; border-top: 2px solid #00f2ff;">Total Amount:</td>
                                  <td style="text-align: right; color: #00f2ff; font-size: 16px; font-weight: 700; padding: 15px 10px 10px; border-top: 2px solid #00f2ff;">€${mappedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      ${!isCreditNote ? `
                      <!-- What's Next -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a2e31; border-radius: 5px; margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 25px; text-align: center;">
                            <p style="margin: 0 0 12px; color: #00f2ff; font-size: 15px; font-weight: 600;">
                              What happens next?
                            </p>
                            <p style="margin: 0; color: #00f2ff; font-size: 14px; line-height: 1.7;">
                              Our engineers are now processing your file. You will receive<br>
                              an email notification when your optimized file is ready for download.
                            </p>
                          </td>
                        </tr>
                      </table>
                      ` : `
                      <!-- Refund Information -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a2e31; border-radius: 5px; margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 25px; text-align: center;">
                            <p style="margin: 0 0 12px; color: #00f2ff; font-size: 15px; font-weight: 600;">
                              Refund Information
                            </p>
                            <p style="margin: 0; color: #00f2ff; font-size: 14px; line-height: 1.7;">
                              Your refund will be processed within 5-10 business days to the original payment method.<br>
                              If you have any questions, please contact us at info@remappro.eu
                            </p>
                          </td>
                        </tr>
                      </table>
                      `}
                      
                      <!-- CTA Buttons -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding-bottom: 15px;">
                            ${invoiceUrl ? `
                            ${isCreditNote ? `
                            <a href="${invoiceUrl}" 
                               style="background-color: #00f2ff; color: #000000; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
                              📄 Download Credit Note
                            </a>
                            ` : `
                            <a href="${invoiceUrl}" 
                               style="background-color: #00f2ff; color: #000000; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
                              📄 Download Invoice
                            </a>
                            `}
                            ` : ''}
                          </td>
                        </tr>
                        ${!isCreditNote ? `
                        <tr>
                          <td align="center">
                            <a href="${trackingLink}" 
                               style="background-color: #00f2ff; color: #000000; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
                              🔍 Track Order
                            </a>
                          </td>
                        </tr>
                        ` : ''}
                      </table>
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
          subject: isCreditNote 
            ? `Order ${orderNumber} Cancelled - Credit Note Issued`
            : `Potvrdenie objednávky č. ${orderNumber} - REMAPPRO`,
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
    const responseData = {
      success: true,
      invoiceNumber,
      invoiceUrl,
      isCreditNote,
      message: isCreditNote ? "Credit note generated and saved successfully" : "Invoice generated and saved successfully",
    };
    
    console.log("[generate-invoice] Returning success response:", responseData);
    
    return new Response(
      JSON.stringify(responseData),
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
