import { supabase } from '@/integrations/supabase/client';

export const redirectToCheckout = async (priceId: string) => {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      priceId,
      successUrl: `${window.location.origin}/success`,
      cancelUrl: `${window.location.origin}/pricing`,
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
