import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Home, FileText, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import { supabase, OrderInsert } from '@/integrations/supabase/client';

const SuccessPage = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const processPendingOrder = async () => {
      const pendingOrderData = sessionStorage.getItem('pendingOrder');
      
      if (!pendingOrderData) {
        setIsProcessing(false);
        return;
      }

      try {
        const orderData = JSON.parse(pendingOrderData);
        
        const insertData: OrderInsert = {
          customer_name: orderData.customer.name,
          customer_email: orderData.customer.email,
          car_brand: orderData.vehicle.brand,
          car_model: orderData.vehicle.model,
          fuel_type: orderData.vehicle.fuelType,
          year: orderData.vehicle.year,
          ecu_type: orderData.vehicle.ecuType,
          service_type: orderData.services,
          total_price: orderData.totalPrice,
          status: 'paid',
          file_url: orderData.fileUrl || null,
          legal_consent: orderData.legalConsent,
        };

        const { data, error } = await supabase
          .from('orders')
          .insert([insertData])
          .select()
          .single();

        if (error) {
          console.error('Error creating order:', error);
          toast.error('Order was paid but failed to save. Please contact support.');
        } else {
          const displayOrderId = data.order_number || `RP-${data.id.slice(0, 6).toUpperCase()}`;
          setOrderId(displayOrderId);
          toast.success(`Order ${displayOrderId} has been created!`);
          sessionStorage.removeItem('pendingOrder');
        }
      } catch (error) {
        console.error('Error processing order:', error);
        toast.error('Error processing your order. Please contact support.');
      } finally {
        setIsProcessing(false);
      }
    };

    processPendingOrder();
  }, []);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Processing your order...</p>
        </div>
      </div>
    );
  }

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
              <div className="mb-6">
                <p className="text-muted-foreground mb-2">Your Order ID is</p>
                <p className="text-2xl font-mono font-bold text-primary">
                  {orderId}
                </p>
              </div>
            )}
            
            <p className="text-muted-foreground mb-8">
              Use this ID to track your order status. You will shortly receive an email with instructions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/" className="btn-secondary flex items-center justify-center gap-2">
                <Home className="w-4 h-4" />
                Back to Home
              </Link>
              <Link to="/track" className="btn-primary flex items-center justify-center gap-2">
                <Search className="w-4 h-4" />
                Track Order
              </Link>
            </div>
            
            <div className="mt-6 pt-6 border-t border-border">
              <Link to="/order" className="text-primary hover:underline flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Place Another Order
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} REMAPPRO. Professional ECU Tuning Services.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SuccessPage;
