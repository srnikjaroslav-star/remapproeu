import { supabase } from '@/integrations/supabase/client';

// TEST MODE - Stripe Publishable Key (test)
export const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Sjj4V4DSSkujAMNbvZ3d621V2YeYtkUJ2SK4HmyQvi2Da716qBKg5i0DeCersm9FJq6Zk8YMblDentovPM11QzN00KOB4IANl';

export const redirectToCheckout = async (priceId: string) => {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      priceId,
      successUrl: `${window.location.origin}/success`,
      cancelUrl: `${window.location.origin}/`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to create checkout session');
  }

  if (data?.url) {
    window.location.href = data.url;
  } else {
    throw new Error('No checkout URL returned');
  }
};
