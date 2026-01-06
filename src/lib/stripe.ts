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
    const serviceNames = options.items?.map((item: any) => item.name).join(', ') || 'Nezadané';
    
    // Extract vehicle data with 'Nezadané' fallbacks to ensure request never fails
    const vehicle = options.vehicle || {};
    const brand = vehicle.brand?.trim() || 'Nezadané';
    const model = vehicle.model?.trim() || 'Nezadané';
    const ecuType = vehicle.ecuType?.trim() || 'Nezadané';
    const fuelType = vehicle.fuelType?.trim() || 'Nezadané';
    const year = vehicle.year ? vehicle.year.toString() : 'Nezadané';
    
    console.log('[redirectToCheckout] Sending metadata:', { 
      orderId: options.orderId,
      email: options.customerEmail,
      brand, 
      model, 
      ecu_type: ecuType, 
      fuel_type: fuelType, 
      year 
    });
    
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        items: options.items.map((item: any) => ({ name: item.name, amount: item.price })),
        email: options.customerEmail,
        orderId: options.orderId,
        metadata: {
          orderId: options.orderId,
          customer_name: options.customerName?.trim() || 'Nezadané',
          customerNote: options.customerNote || '',
          brand: brand,
          model: model,
          ecu_type: ecuType,
          fuel_type: fuelType,
          year: year,
          file_url: options.fileUrl || '',
          services: serviceNames,
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
