import { supabase } from "@/integrations/supabase/client";

/**
 * Generuje unikátne ID objednávky pre REMAPPRO (napr. RP-X7Y2Z9)
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
  vehicle: {
    brand: string;
    model: string;
    fuelType?: string;
    year?: number;
    ecuType?: string;
    engineDisplacement?: string;
    enginePower?: string;
  };
  fileUrl?: string;
  services: string[];
}

/**
 * Hlavná funkcia na spustenie platby.
 * KOMUNIKUJE S EDGE FUNKCIOU 'create-checkout'
 */
export const redirectToCheckout = async (options: CheckoutOptions) => {
  try {
    console.log("[Stripe] Inicializujem platbu pre objednávku:", options.orderId);

    // DÔLEŽITÉ: Názov funkcie musí byť 'create-checkout', nie 'create-checkout-session'
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        orderId: options.orderId,
        customerEmail: options.customerEmail.toLowerCase(),
        customerName: options.customerName,
        items: options.items,
        // Balíme metadáta, ktoré Webhook zapíše do databázy
        metadata: {
          orderId: options.orderId,
          customerEmail: options.customerEmail.toLowerCase(),
          carBrand: options.vehicle.brand || "Nezadané",
          carModel: options.vehicle.model || "Nezadané",
          fileUrl: options.fileUrl || "",
        },
      },
    });

    // Zachytenie chýb (napr. CORS error z obrázka image_c57c05.png)
    if (error) {
      console.error("[Stripe] Chyba Edge Funkcie:", error.message);
      throw new Error(`Edge Function Error: ${error.message}`);
    }

    // Ak Edge Funkcia vrátila URL, presmerujeme Richarda na Stripe bránu
    if (data?.url) {
      console.log("[Stripe] Dáta prijaté, presmerovávam na Stripe...");
      window.location.href = data.url;
    } else {
      throw new Error("Stripe nevrátil žiadnu URL adresu.");
    }
  } catch (error: any) {
    console.error("[Stripe] Kritické zlyhanie procesu:", error);
    throw error;
  }
};
