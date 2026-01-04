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
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      // Poll for the order with exponential backoff
      let attempts = 0;
      const maxAttempts = 10;
      let delay = 1000;
      
      while (attempts < maxAttempts) {
        console.log(`[SuccessPage] Attempt ${attempts + 1}: Fetching order by session_id: ${sessionId}`);
        
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('stripe_session_id', sessionId)
          .maybeSingle();

        if (data && !error) {
          console.log('[SuccessPage] Order found:', data.order_number);
          setOrder(data as Order);
          break;
        }
        
        if (error) {
          console.error('[SuccessPage] Supabase error:', error);
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`[SuccessPage] Order not found yet, waiting ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.5, 5000); // Exponential backoff, max 5s
        }
      }

      if (!order && attempts >= maxAttempts) {
        console.warn('[SuccessPage] Max attempts reached, order not found');
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