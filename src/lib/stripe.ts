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
 * Hlavná funkcia na spustenie platby
 * OPRAVENÉ: Teraz posiela kompletné metadáta pre tvoj Tracking systém
 */
export const redirectToCheckout = async (options: CheckoutOptions) => {
  try {
    console.log("[Stripe] Inicializujem platbu pre:", options.orderId);

    // Voláme Edge Function v Supabase
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: {
        orderId: options.orderId,
        customerEmail: options.customerEmail,
        customerName: options.customerName,
        items: options.items,
        // TIETO METADÁTA SÚ KĽÚČOVÉ PRE ODSTRÁNENIE "Nezadané"
        metadata: {
          orderId: options.orderId,
          customerEmail: options.customerEmail.toLowerCase(),
          carBrand: options.vehicle.brand || "Unknown",
          carModel: options.vehicle.model || "Unknown",
          fileUrl: options.fileUrl || "",
          // Pridávame aj technické detaily pre tvoj prehľad
          vehicleDetails:
            `${options.vehicle.year || ""} ${options.vehicle.fuelType || ""} ${options.vehicle.ecuType || ""}`.trim(),
        },
      },
    });

    // Ak Edge Function vráti chybu (napr. CORS alebo Stripe error)
    if (error) {
      console.error("[Stripe] Chyba pri volaní Edge Function:", error);
      throw new Error(`Edge Function Error: ${error.message}`);
    }

    // Ak všetko prebehlo OK, presmerujeme na Stripe Checkout URL
    if (data?.url) {
      console.log("[Stripe] Presmerovávam na platbu...");
      window.location.href = data.url;
    } else {
      throw new Error("Stripe nevrátil URL adresu pre platbu.");
    }
  } catch (error: any) {
    console.error("[Stripe] Kritická chyba v redirectToCheckout:", error);
    throw error;
  }
};
