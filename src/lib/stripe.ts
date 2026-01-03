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

interface CheckoutOptions {
  priceId: string;
  orderId: string;
  customerEmail: string;
}

export const redirectToCheckout = async ({ priceId, orderId, customerEmail }: CheckoutOptions) => {
  const successUrl = `https://remappro.eu/track?id=${encodeURIComponent(orderId)}&email=${encodeURIComponent(customerEmail)}`;
  const cancelUrl = `${window.location.origin}/order`;

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      priceId,
      successUrl,
      cancelUrl,
      clientReferenceId: orderId,
      customerEmail,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to create checkout session');
  }

  if (data?.url) {
    window.location.assign(data.url);
  } else {
    throw new Error('No checkout URL returned');
  }
};
