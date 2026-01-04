import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Home, Loader2, Search } from 'lucide-react';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import { supabase, Order } from '@/integrations/supabase/client';

const SuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchOrderBySession = async () => {
      // Get session_id from URL (Stripe redirects with this)
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        // No session_id - might be direct visit or old flow
        // Clear any old pending order data
        sessionStorage.removeItem('pendingOrder');
        setIsLoading(false);
        return;
      }

      // Wait briefly for webhook to process the order
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to find the most recent order (webhook should have created it)
      // We poll a few times in case webhook is slow
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          // Check if this order was created in the last 2 minutes
          const orderTime = new Date(data.created_at).getTime();
          const now = Date.now();
          const twoMinutes = 2 * 60 * 1000;
          
          if (now - orderTime < twoMinutes) {
            setOrder(data as Order);
            sessionStorage.removeItem('pendingOrder');
            break;
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      setIsLoading(false);
    };

    fetchOrderBySession();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Processing your order...</p>
          <p className="text-sm text-muted-foreground mt-2">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  const orderId = order?.order_number || order?.id?.slice(0, 8).toUpperCase();
  const customerEmail = order?.customer_email;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="md" />
        </div>
      </header>

      {/* Success Content */}
      <main className="flex-1 flex items-center justify-center relative">
        <div className="container mx-auto px-4">
          <div className="glass-card max-w-lg mx-auto p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            
            <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
            
            {orderId && (
              <div className="mb-4">
                <p className="text-muted-foreground mb-2">Your Order ID is</p>
                <p className="text-2xl font-mono font-bold text-primary">
                  {orderId}
                </p>
              </div>
            )}
            
            {customerEmail && (
              <div className="mb-6">
                <p className="text-muted-foreground mb-1">Email</p>
                <p className="text-lg font-medium text-foreground">
                  {customerEmail}
                </p>
              </div>
            )}
            
            <p className="text-muted-foreground mb-8">
              {orderId 
                ? 'Use this ID to track your order status. You will shortly receive an email with instructions.'
                : 'Your payment has been received. You will receive a confirmation email shortly.'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/" className="btn-secondary flex items-center justify-center gap-2">
                <Home className="w-4 h-4" />
                Back to Home
              </Link>
              {orderId && customerEmail && (
                <Link 
                  to={`/track?id=${encodeURIComponent(orderId)}&email=${encodeURIComponent(customerEmail)}`} 
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Track Order
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default SuccessPage;
