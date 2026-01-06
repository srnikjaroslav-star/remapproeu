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
    const serviceNames = options.items?.map((item: any) => item.name).join(', ') || '';
    
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        items: options.items.map((item: any) => ({ name: item.name, amount: item.price })),
        email: options.customerEmail,
        metadata: {
          orderId: options.orderId,
          customer_name: options.customerName,
          customerNote: options.customerNote,
          car_brand: options.vehicle?.brand || '',
          car_model: options.vehicle?.model || '',
          fuel_type: options.vehicle?.fuelType || '',
          year: options.vehicle?.year?.toString() || '',
          ecu_type: options.vehicle?.ecuType || '',
          vin: options.vehicle?.vin || '',
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
