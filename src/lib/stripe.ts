import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/integrations/supabase/client';

// LIVE MODE - Stripe Publishable Key
export const STRIPE_PUBLISHABLE_KEY = 'pk_live_51Sjj4V4DSSkujAMNClROw2Dr8RmeNqgZjTbboTaLB8cS0BfpxYOacvGqBIn8SQEJ29ey5q6ryYnMsNV3hIyc1oWI00fpWzzYKb';

// Generate unique order ID (RP-XXXXXX format)
export const generateOrderId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'RP-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

type CheckoutItem = {
  name: string;
  amount: number; // in EUR
};

interface VehicleData {
  brand: string;
  model: string;
  fuelType: string;
  year: number;
  ecuType: string;
}

interface CheckoutOptions {
  items: { name: string; price: number }[]; // price in EUR
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerNote?: string;
  vehicle: VehicleData;
  fileUrl?: string;
  services: string[];
}

export const redirectToCheckout = async ({ 
  items, 
  orderId, 
  customerEmail, 
  customerName,
  customerNote, 
  vehicle,
  fileUrl,
  services 
}: CheckoutOptions) => {
  // Validate email
  if (!customerEmail || !customerEmail.includes('@')) {
    throw new Error('Valid email address is required.');
  }

  // Validate items before calling edge function
  if (!items || items.length === 0) {
    throw new Error('No items selected for checkout.');
  }

  // Convert items to the format expected by edge function (amount in EUR)
  const formattedItems: CheckoutItem[] = items.map(item => {
    if (!item.name || item.price <= 0) {
      throw new Error(`Invalid item: ${item.name || 'unnamed'} with price ${item.price}`);
    }
    return {
      name: item.name,
      amount: item.price // Keep in EUR, edge function will convert to cents
    };
  });

  const successUrl = `https://remappro.eu/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${window.location.origin}/order`;

  const requestBody = {
    items: formattedItems,
    email: customerEmail,
    successUrl,
    cancelUrl,
    metadata: {
      orderId,
      orderType: 'tuning',
      source: 'web',
      customerNote: customerNote || '',
      customer_name: customerName,
      car_brand: vehicle.brand,
      car_model: vehicle.model,
      fuel_type: vehicle.fuelType,
      year: String(vehicle.year),
      ecu_type: vehicle.ecuType,
      file_url: fileUrl || '',
      services: JSON.stringify(services),
    }
  };

  console.log('[Stripe] Creating checkout session:', requestBody);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json().catch(() => null);

    console.log('[Stripe] Edge function response:', { status: response.status, data });

    if (!response.ok) {
      console.error('[Stripe] create-checkout HTTP error:', response.status, data);
      throw new Error((data as any)?.error || `Checkout service error (${response.status}).`);
    }

    if (data?.error) {
      console.error('[Stripe] Checkout creation error:', data.error);
      throw new Error(data.error || 'Failed to create payment session.');
    }

    if (data?.url) {
      console.log('[Stripe] Redirecting to checkout:', data.url);
      window.location.assign(data.url);
    } else {
      console.error('[Stripe] No checkout URL in response:', data);
      throw new Error('Payment gateway did not return a valid session. Please contact support.');
    }
  } catch (err: any) {
    console.error('[Stripe] Full error object:', err);
    throw err;
  }
};
