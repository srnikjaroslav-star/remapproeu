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
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        orderId: options.orderId,
        customerEmail: options.customerEmail,
        items: options.items,
        metadata: {
          carBrand: options.vehicle.brand,
          carModel: options.vehicle.model,
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
