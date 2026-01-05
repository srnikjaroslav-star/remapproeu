import { supabase } from "@/integrations/supabase/client";

/**
 * Generuje unikátne ID objednávky pre REMAPPRO
 */
export const generateOrderId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RP-${result}`;
};

interface CheckoutOptions {
  items: { name: string; price: number }[];
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerNote?: string;
  vehicle: { brand: string; model: string; fuelType?: string; year?: number };
  fileUrl?: string;
  services: string[];
}

/**
 * Hlavná funkcia na spustenie platby
 * POSIELA METADÁTA DO SUPABASE EDGE FUNCTION
 */
export const redirectToCheckout = async (options: CheckoutOptions) => {
  try {
    console.log("[Stripe] Inicializujem platbu pre:", options.orderId);

    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: {
        items: options.items,
        orderId: options.orderId,
        customerEmail: options.customerEmail,
        customerName: options.customerName,
        // TOTO JE TO, ČO TI CHÝBALO - METADÁTA PRE WEBHOOK
        metadata: {
          orderId: options.orderId,
          customerEmail: options.customerEmail,
          carBrand: options.vehicle.brand,
          carModel: options.vehicle.model,
          fileUrl: options.fileUrl || "",
        },
        success_url: `${window.location.origin}/success?id=${options.orderId}`,
        cancel_url: `${window.location.origin}/order`,
      },
    });

    if (error) throw error;

    if (data?.url) {
      // Presmerovanie na Stripe Checkout
      window.location.href = data.url;
    } else {
      throw new Error("Nepodarilo sa získať platobnú adresu od Stripe.");
    }
  } catch (error: any) {
    console.error("[Stripe] Kritická chyba:", error);
    throw error;
  }
};
