import { supabase } from "@/integrations/supabase/client";

export const generateOrderId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RP-${result}`;
};

export const redirectToCheckout = async (options: any) => {
  try {
    // Validate items array before processing
    if (!options.items || !Array.isArray(options.items) || options.items.length === 0) {
      throw new Error('No services selected');
    }

    // Build items array with validated prices
    const items = options.items.map((item: any) => {
      const price = typeof item.price === 'number' ? item.price : 0;
      if (price <= 0) {
        console.warn('[redirectToCheckout] Invalid price for item:', item);
      }
      return {
        name: item.name || 'Service',
        amount: price,
      };
    });

    // Validate that at least one item has a valid price
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.amount, 0);
    if (totalAmount <= 0) {
      throw new Error('Total amount must be greater than 0');
    }

    const serviceNames = items.map((item: any) => item.name).join(', ') || 'Nezadané';
    
    // Extract vehicle data with 'Nezadané' fallbacks to ensure request never fails
    const vehicle = options.vehicle || {};
    const brand = vehicle.brand?.trim() || 'Nezadané';
    const model = vehicle.model?.trim() || 'Nezadané';
    const ecuType = vehicle.ecuType?.trim() || 'Nezadané';
    const fuelType = vehicle.fuelType?.trim() || 'Nezadané';
    const year = vehicle.year ? vehicle.year.toString() : 'Nezadané';
    
    console.log('[redirectToCheckout] Sending request:', { 
      orderId: options.orderId,
      customerEmail: options.customerEmail,
      totalAmount,
      items,
      metadata: { carBrand: brand, carModel: model, carEcu: ecuType, carServices: serviceNames }
    });
    
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        items,
        orderId: options.orderId,
        customerEmail: options.customerEmail,
        metadata: {
          orderId: options.orderId,
          customer_name: options.customerName?.trim() || 'Nezadané',
          customerNote: options.customerNote || '',
          carBrand: brand,
          carModel: model,
          carEcu: ecuType,
          carServices: serviceNames,
          fuel_type: fuelType,
          year: year,
          file_url: options.fileUrl || '',
        },
      },
    });

    if (error) throw error;
    if (data?.url) window.location.href = data.url;
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    throw error;
  }
};
