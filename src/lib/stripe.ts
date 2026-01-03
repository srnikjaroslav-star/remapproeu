import { supabase } from '@/integrations/supabase/client';

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
  price: number; // in EUR
};

interface CheckoutOptions {
  items: CheckoutItem[];
  orderId: string;
  customerEmail: string;
  customerNote?: string;
}

export const redirectToCheckout = async ({ items, orderId, customerEmail, customerNote }: CheckoutOptions) => {
  const successUrl = `https://remappro.eu/track?id=${encodeURIComponent(orderId)}&email=${encodeURIComponent(customerEmail)}`;
  const cancelUrl = `${window.location.origin}/order`;

  console.log('[Stripe] Creating checkout session:', { items, orderId, customerEmail });

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      items,
      successUrl,
      cancelUrl,
      clientReferenceId: orderId,
      customerEmail,
      customerNote,
    },
  });

  if (error) {
    console.error('[Stripe] Edge function error:', error);
    throw new Error(error.message || 'Checkout service unavailable. Please try again later.');
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
};
