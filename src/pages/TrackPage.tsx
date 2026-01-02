import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Package, Clock, CheckCircle, Download, AlertCircle, Mail, Hash } from 'lucide-react';
import Logo from '@/components/Logo';
import { supabase, Order } from '@/integrations/supabase/client';
import { SERVICES } from '@/data/services';

const TrackPage = () => {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoSearched, setHasAutoSearched] = useState(false);

  const fetchOrder = async (searchId?: string, searchEmail?: string) => {
    const idToSearch = searchId || orderNumber.trim();
    const emailToSearch = searchEmail || email.trim();

    if (!idToSearch || !emailToSearch) {
      setError('Please enter both Order ID and Email');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .eq('customer_email', emailToSearch.toLowerCase());

      if (idToSearch.toUpperCase().startsWith('RP-')) {
        query = query.eq('order_number', idToSearch.toUpperCase());
      } else {
        query = query.or(`id.eq.${idToSearch},order_number.eq.${idToSearch.toUpperCase()}`);
      }

      const { data, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!data) {
        setError('Order not found. Please check your Order ID and Email.');
        setOrder(null);
      } else {
        setOrder(data as Order);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill from URL params and auto-search
  useEffect(() => {
    if (hasAutoSearched) return;

    const urlId = searchParams.get('id') || searchParams.get('order') || '';
    const urlEmail = searchParams.get('email') || '';

    if (urlId) setOrderNumber(urlId);
    if (urlEmail) setEmail(urlEmail);

    // Auto-search if both params are present
    if (urlId && urlEmail) {
      setHasAutoSearched(true);
      fetchOrder(urlId, urlEmail);
    }
  }, [searchParams, hasAutoSearched]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Pending', progress: 25 };
      case 'processing':
        return { icon: Package, color: 'text-primary', bg: 'bg-primary/10', label: 'Processing', progress: 50 };
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Completed', progress: 100 };
      default:
        return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: status, progress: 0 };
    }
  };

  const getSelectedServices = () => {
    if (!order?.service_type) return [];
    const serviceIds = Array.isArray(order.service_type) 
      ? order.service_type 
      : JSON.parse(order.service_type as unknown as string);
    return serviceIds.map((id: string) => SERVICES.find((s) => s.id === id)?.name).filter(Boolean);
  };
  
  const selectedServices = getSelectedServices();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          <Link to="/order" className="btn-primary text-sm py-2">
            New Order
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2 text-center">Track Your Order</h1>
        <p className="text-muted-foreground text-center mb-8">
          Enter your Order ID and Email to check status
        </p>

        {/* Search Box */}
        <div className="glass-card p-6 mb-8">
          <div className="space-y-4">
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Order ID (e.g., RP-A7K92X)"
                className="input-field w-full pl-12"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address used for order"
                className="input-field w-full pl-12"
                onKeyDown={(e) => e.key === 'Enter' && fetchOrder()}
              />
            </div>
            <button 
              onClick={() => fetchOrder()}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Searching...' : 'Track Order'}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="glass-card p-6 border-destructive/30 flex items-center gap-4 mb-6">
            <AlertCircle className="w-8 h-8 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground">Please verify your details and try again</p>
            </div>
          </div>
        )}

        {/* Order Details */}
        {order && (
          <div className="space-y-6 animate-fadeIn">
            {/* Order ID Banner */}
            <div className="glass-card p-4 bg-primary/5 border-primary/30 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="text-xl font-mono font-bold text-primary">
                  {order.order_number || order.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Status Card */}
            <div className="glass-card p-8">
              {(() => {
                const statusInfo = getStatusInfo(order.status);
                const StatusIcon = statusInfo.icon;
                return (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Order Status</p>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
                          <span className={`text-xl font-bold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-full ${statusInfo.bg} ${statusInfo.color} font-medium`}>
                        {statusInfo.progress}%
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-bar-fill"
                        style={{ width: `${statusInfo.progress}%` }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Vehicle Info */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Vehicle Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Brand</p>
                  <p className="font-medium">{order.car_brand}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Model</p>
                  <p className="font-medium">{order.car_model}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fuel Type</p>
                  <p className="font-medium">{order.fuel_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Year</p>
                  <p className="font-medium">{order.year}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">ECU Type</p>
                  <p className="font-medium">{order.ecu_type}</p>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Selected Services</h3>
              <div className="flex flex-wrap gap-2">
                {selectedServices.map((service, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {service}
                  </span>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span className="text-muted-foreground">Total Price</span>
                <span className="text-2xl font-bold neon-text">{order.total_price}€</span>
              </div>
            </div>

            {/* Download Button */}
            {order.status === 'completed' && order.result_file_url && (
              <a
                href={order.result_file_url}
                download
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 shadow-[0_0_30px_hsl(185_100%_50%/0.4)]"
              >
                <Download className="w-5 h-5" />
                Download Your Tuned File
              </a>
            )}

            {/* Pending/Processing Message */}
            {order.status !== 'completed' && (
              <div className="glass-card p-6 text-center">
                <p className="text-muted-foreground">
                  {order.status === 'pending' 
                    ? 'Your order is in queue. Our engineers will start processing soon.'
                    : 'Your file is being processed. You will receive an email when ready.'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TrackPage;
