import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Download, Upload, Eye, CheckCircle, Clock, Package, 
  RefreshCw, Search, User, Power, Save, Edit3, LogOut, FileText, X
} from 'lucide-react';
import Logo from '@/components/Logo';
import SystemStatus, { fetchSystemStatusFromDB, setSystemStatusInDB, isSystemOnline, SystemStatusMode } from '@/components/SystemStatus';
import SmartTooltip from '@/components/SmartTooltip';
import InternalNoteModal from '@/components/InternalNoteModal';
import { supabase } from '@/lib/supabase';
import { Order } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SERVICES } from '@/data/services';

const ManagementPortal = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingFields, setEditingFields] = useState<Record<string, { checksum_crc: string; internal_note: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusMode, setStatusMode] = useState<SystemStatusMode>('auto');
  const [statusLoading, setStatusLoading] = useState(false);
  const [noteModalOrder, setNoteModalOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication on mount - only allow specific email
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      // Check if user email matches allowed email
      const allowedEmail = import.meta.env.VITE_ADMIN_EMAIL || 'info@remappro.eu';
      const userEmail = session.user?.email?.toLowerCase();
      
      if (userEmail !== allowedEmail.toLowerCase()) {
        toast.error('Nemáte oprávnenie na prístup k tomuto portálu');
        await supabase.auth.signOut();
        navigate('/login');
        return;
      }

      setIsCheckingAuth(false);
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        navigate('/login');
        return;
      }

      // Re-check email on auth state change
      const allowedEmail = import.meta.env.VITE_ADMIN_EMAIL || 'info@remappro.eu';
      const userEmail = session.user?.email?.toLowerCase();
      
      if (userEmail !== allowedEmail.toLowerCase()) {
        toast.error('Nemáte oprávnenie na prístup k tomuto portálu');
        await supabase.auth.signOut();
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Load initial status from DB
  useEffect(() => {
    if (isCheckingAuth) return;
    
    const loadStatus = async () => {
      const mode = await fetchSystemStatusFromDB();
      setStatusMode(mode);
    };
    loadStatus();
  }, [isCheckingAuth]);

  const cycleStatusMode = async () => {
    // Cycle: auto -> online -> offline -> auto
    const nextMode: Record<SystemStatusMode, SystemStatusMode> = {
      'auto': 'online',
      'online': 'offline',
      'offline': 'auto'
    };
    const newMode = nextMode[statusMode];
    
    setStatusLoading(true);
    const success = await setSystemStatusInDB(newMode);
    setStatusLoading(false);
    
    if (success) {
      setStatusMode(newMode);
      const messages: Record<SystemStatusMode, string> = {
        'auto': 'System status set to AUTO (follows schedule 08:00-20:00)',
        'online': 'System forced ONLINE (visible to customers)',
        'offline': 'System forced OFFLINE (visible to customers)'
      };
      toast.success(messages[newMode]);
    } else {
      toast.error('Failed to update system status. Check RLS policies.');
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as Order[]);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCheckingAuth) return;

    fetchOrders();

    // Set up realtime subscription for orders table
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev]);
            toast.info('New order received!');
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(order => 
              order.id === payload.new.id ? (payload.new as Order) : order
            ));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(order => order.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to orders realtime updates');
        }
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [isCheckingAuth]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Chyba pri odhlasovaní');
        return;
      }
      toast.success('Úspešne odhlásený');
      navigate('/login');
    } catch (error: any) {
      toast.error('Chyba pri odhlasovaní');
    }
  };

  const sendStatusEmail = async (order: Order, status: string) => {
    try {
      const orderId = order.order_number || order.id.slice(0, 8).toUpperCase();
      
      console.log('[sendStatusEmail] Sending email for order:', {
        orderId,
        orderNumber: orderId,
        customerEmail: order.customer_email,
        status,
      });
      
      // Call Supabase function to send status email via Resend
      const response = await supabase.functions.invoke('send-status-email', {
        body: {
          orderId: order.id,
          orderNumber: orderId,
          customerEmail: order.customer_email,
          customerName: order.customer_name || '',
          carBrand: order.car_brand || '',
          carModel: order.car_model || '',
          year: order.year || 0,
          status: status,
        },
      });

      console.log('[sendStatusEmail] Response:', response);

      if (response.error) {
        console.error('[sendStatusEmail] Supabase function error:', {
          error: response.error,
          message: response.error.message,
          details: response.error.details,
          hint: response.error.hint,
        });
        throw new Error(response.error.message || 'Failed to send email');
      }

      if (response.data) {
        const data = response.data as any;
        if (data.success === false) {
          console.error('[sendStatusEmail] Email sending failed:', {
            error: data.error,
            resend: data.resend,
          });
          throw new Error(data.error || 'Email sending failed');
        }
      }

      console.log('[sendStatusEmail] Email sent successfully');
      return response;
    } catch (error: any) {
      console.error('[sendStatusEmail] Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        name: error.name,
      });
      throw error;
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    console.log('Updating order status:', { orderId, newStatus });
    
    // Find the order before update
    const order = orders.find(o => o.id === orderId);
    const previousStatus = order?.status;
    
    // Optimistic UI update
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select();

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      // Send email when status changes to Completed
      if (newStatus === 'completed' && previousStatus !== 'completed' && order) {
        try {
          await sendStatusEmail(order, newStatus);
          toast.success('Status aktualizovaný a email odoslaný klientovi');
        } catch (emailError: any) {
          console.error('[handleStatusChange] Email sending failed:', {
            error: emailError,
            message: emailError?.message,
            stack: emailError?.stack,
            orderId: order.id,
            customerEmail: order.customer_email,
          });
          
          // Show detailed error message
          const errorMsg = emailError?.message || 'Neznáma chyba';
          if (errorMsg.includes('RESEND_API_KEY') || errorMsg.includes('API key')) {
            toast.error('Chyba: RESEND_API_KEY nie je nastavený alebo je neplatný');
          } else if (errorMsg.includes('domain') || errorMsg.includes('verified')) {
            toast.error('Chyba: Emailová doména nie je overená v Resend');
          } else {
            toast.error(`Chyba pri odosielaní emailu: ${errorMsg}`);
          }
          toast.success('Status aktualizovaný (email sa nepodarilo odoslať)');
        }
      } else {
        const statusLabels: Record<string, string> = {
          'pending': 'Pending',
          'processing': 'Processing',
          'completed': 'Completed',
          'paid': 'Paid'
        };
        toast.success(`Status changed to: ${statusLabels[newStatus] || newStatus}`);
      }

      await fetchOrders();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(`Chyba pri aktualizácii statusu: ${error.message || 'Neznáma chyba'}`);
      // Revert optimistic update
      if (order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: previousStatus || 'pending' } : o)));
      }
      await fetchOrders();
    }
  };

  const handleFieldChange = (orderId: string, field: 'checksum_crc' | 'internal_note', value: string) => {
    setEditingFields(prev => ({
      ...prev,
      [orderId]: {
        checksum_crc: prev[orderId]?.checksum_crc ?? orders.find(o => o.id === orderId)?.checksum_crc ?? '',
        internal_note: prev[orderId]?.internal_note ?? orders.find(o => o.id === orderId)?.internal_note ?? '',
        [field]: value
      }
    }));
  };

  const handleFieldBlur = async (orderId: string, field: 'checksum_crc' | 'internal_note') => {
    const order = orders.find(o => o.id === orderId);
    const editedValue = editingFields[orderId]?.[field];
    const originalValue = order?.[field] ?? '';
    
    // Only save if value actually changed
    if (editedValue === undefined || editedValue === originalValue) return;
    
    setSavingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ [field]: editedValue || null })
        .eq('id', orderId);

      if (error) throw error;
      toast.success(`${field === 'checksum_crc' ? 'Checksum CRC' : 'Internal Note'} saved`);
      await fetchOrders();
      // Clear the editing state for this order
      setEditingFields(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save field');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveFields = async (orderId: string) => {
    const fields = editingFields[orderId];
    if (!fields) return;

    setSavingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          checksum_crc: fields.checksum_crc || null,
          internal_note: fields.internal_note || null
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Admin fields saved');
      await fetchOrders();
      // Clear the editing state
      setEditingFields(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save fields');
    } finally {
      setSavingId(null);
    }
  };

  const getEditableValue = (order: Order, field: 'checksum_crc' | 'internal_note') => {
    if (editingFields[order.id]?.[field] !== undefined) {
      return editingFields[order.id][field];
    }
    return order[field] || '';
  };

  const handleResultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrderId) return;

    setUploadingId(selectedOrderId);
    
    try {
      const fileName = `result-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('modified-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('modified-files')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          result_file_url: publicUrl,
          status: 'completed',
        })
        .eq('id', selectedOrderId);

      if (updateError) throw updateError;

      // Find the order to get customer details for email
      const order = orders.find(o => o.id === selectedOrderId);
      
      // Send email notification
      if (order?.customer_email) {
        try {
          const response = await supabase.functions.invoke('send-order-ready', {
            body: {
              orderId: order.id,
              orderNumber: order.order_number || '',
              customerEmail: order.customer_email,
              customerName: order.customer_name || '',
              carBrand: order.car_brand || '',
              carModel: order.car_model || '',
              resultFileUrl: publicUrl,
            },
          });
          
          const emailFailed = Boolean(response.error) || response.data?.success === false;

          if (emailFailed) {
            console.error('Email notification failed:', {
              error: response.error,
              data: response.data,
            });
            toast.success('Result file uploaded! (Email notification failed)');
          } else {
            toast.success('Result file uploaded and customer notified via email!');
          }
        } catch (emailError) {
          console.error('Email notification error:', emailError);
          toast.success('Result file uploaded! (Email notification failed)');
        }
      } else {
        toast.success('Result file uploaded and status updated to completed');
      }
      
      fetchOrders();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload result file');
    } finally {
      setUploadingId(null);
      setSelectedOrderId(null);
    }
  };

  const triggerUpload = (orderId: string) => {
    setSelectedOrderId(orderId);
    fileInputRef.current?.click();
  };

  const handleDownload = async (fileName: string, orderNumber: string, orderId: string) => {
    try {
      // Create Public URL from file name
      const { data: { publicUrl } } = supabase.storage
        .from('tunes')
        .getPublicUrl(fileName);

      if (!publicUrl) {
        toast.error('Nepodarilo sa vytvoriť URL pre sťahovanie');
        return;
      }

      // Force download for Supabase Storage URLs
      try {
        const response = await fetch(publicUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `order-${orderNumber || 'file'}-${fileName}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // After successful download, immediately update order status to 'processing'
        if (orderId) {
          try {
            const { error: updateError } = await supabase
              .from('orders')
              .update({ status: 'processing' })
              .eq('id', orderId);

            if (updateError) {
              console.error('Error updating order status:', updateError);
              toast.error('Chyba pri aktualizácii statusu objednávky');
            } else {
              // Refresh data in UI to show the change immediately
              await fetchOrders();
              toast.success('Status objednávky bol aktualizovaný na Processing');
            }
          } catch (statusError) {
            console.error('Error updating order status after download:', statusError);
            // Don't show error to user, download was successful
          }
        }
      } catch (err) {
        console.error('Download error:', err);
        // Fallback: open in new tab
        window.open(publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Error creating download URL:', error);
      toast.error('Chyba pri sťahovaní súboru');
    }
  };

  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (order.order_number || '').toLowerCase().includes(searchLower) ||
      (order.customer_name || '').toLowerCase().includes(searchLower) ||
      (order.customer_email || '').toLowerCase().includes(searchLower) ||
      (order.car_brand || '').toLowerCase().includes(searchLower) ||
      (order.car_model || '').toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'status-paid';
      case 'pending':
        return 'bg-black text-orange-500 border border-orange-500/50';
      case 'processing':
        return 'status-processing';
      case 'completed':
        return 'status-completed';
      default:
        return 'bg-black text-orange-500 border border-orange-500/50';
    }
  };

const getServiceNames = (serviceIds: string[] | string | null) => {
    if (!serviceIds) return '';
    if (Array.isArray(serviceIds)) {
      return serviceIds.map((id: string) => SERVICES.find((s) => s.id === id)?.name || id).filter(Boolean).join(', ');
    }
    // Try to parse as JSON, otherwise treat as plain text
    try {
      const ids = JSON.parse(serviceIds);
      return ids.map((id: string) => SERVICES.find((s) => s.id === id)?.name || id).filter(Boolean).join(', ');
    } catch {
      // Already a plain text service name(s), return as-is
      return serviceIds;
    }
  };

  const formatLocalDateTime = (utcDateString: string) => {
    const date = new Date(utcDateString);
    return date.toLocaleString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Kontrola prístupu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleResultUpload}
        accept=".bin,.ori,.mod,.ecu"
      />

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="w-full max-w-[77%] mx-auto px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/">
              <Logo size="sm" />
            </Link>
            <SystemStatus />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={cycleStatusMode}
              disabled={statusLoading}
              className={`py-2 px-4 flex items-center gap-2 rounded-lg border transition-all disabled:opacity-50 ${
                statusMode === 'online'
                  ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
                  : statusMode === 'offline'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                    : 'bg-primary/20 border-primary/50 text-primary hover:bg-primary/30'
              }`}
            >
              <Power className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
              {statusLoading ? 'Updating...' : statusMode === 'online' ? 'Force ONLINE' : statusMode === 'offline' ? 'Force OFFLINE' : 'Auto (Schedule)'}
            </button>
            <span className="text-sm text-muted-foreground">Admin Portal</span>
            <button onClick={fetchOrders} className="btn-secondary py-2 px-4 flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={handleLogout}
              className="btn-secondary py-2 px-4 flex items-center gap-2 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Odhlásiť sa
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[77%] mx-auto px-12 py-8">
        {/* Revenue Header */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="neon-text">Revenue Dashboard</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-secondary/30 rounded-lg border-2 border-green-500/30">
              <p className="text-muted-foreground text-sm mb-1 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Total Revenue
              </p>
              <p className="text-3xl font-bold text-green-500">
                €{orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg border border-white shadow-[0_0_8px_rgba(255,255,255,0.15)]">
              <p className="text-white text-sm mb-1 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white"></span> Orders Count
              </p>
              <p className="text-3xl font-bold text-white">{orders.length}</p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg border-2 border-orange-500/30">
              <p className="text-muted-foreground text-sm mb-1 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" /> Pending
              </p>
              <p className="text-3xl font-bold text-orange-500">
                {orders.filter((o) => o.status === 'pending').length}
              </p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg border-2 border-primary/30">
              <p className="text-muted-foreground text-sm mb-1 flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" /> Completed
              </p>
              <p className="text-3xl font-bold text-primary">
                {orders.filter((o) => o.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders..."
              className="input-field w-full pl-12"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-filter-select min-w-[150px]"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 border-l-4 border-l-white">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-white" /> Total Orders
            </p>
            <p className="text-2xl font-bold text-white">{orders.length}</p>
          </div>
          <div className="glass-card p-4 border-l-4 border-l-orange-500">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" /> Pending
            </p>
            <p className="text-2xl font-bold text-orange-500">
              {orders.filter((o) => o.status === 'pending').length}
            </p>
          </div>
          <div className="glass-card p-4 border-l-4 border-l-primary">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Processing
            </p>
            <p className="text-2xl font-bold text-primary">
              {orders.filter((o) => o.status === 'processing').length}
            </p>
          </div>
          <div className="glass-card p-4 border-l-4 border-l-green-500">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> Completed
            </p>
            <p className="text-2xl font-bold text-green-500">
              {orders.filter((o) => o.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Orders Table */}
        <div className="rounded-xl bg-background/40 backdrop-blur-xl border border-primary/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead className="sticky top-0 z-50">
                <tr className="bg-[#0a192f] border-b border-primary/30 shadow-md">
                  <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white w-1 whitespace-nowrap">ID</th>
                  <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white whitespace-nowrap">Date</th>
                  <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white w-full">Customer</th>
                  <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white whitespace-nowrap">Price</th>
                  <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white whitespace-nowrap">Status</th>
                  <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white whitespace-nowrap">Invoice</th>
                  <th className="text-right p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white whitespace-nowrap sticky right-0 backdrop-blur-sm z-10">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        Loading orders...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No orders found
                      </td>
                    </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="align-top border-b border-gray-700/50 hover:bg-white/5 transition-colors duration-150">
                      <td className="p-2 w-1 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded inline-block">
                          {order.order_number || order.id.slice(0, 6).toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <p className="text-xs text-muted-foreground">
                          {formatLocalDateTime(order.created_at)}
                        </p>
                      </td>
                      <td className="p-2 w-full">
                        <div className="overflow-hidden">
                          <p className="font-medium text-xs truncate" title={order.customer_name}>{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground truncate" title={order.customer_email}>{order.customer_email}</p>
                        </div>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <p className="font-semibold text-primary text-xs">{order.total_price}€</p>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`admin-status-select text-xs w-full ${getStatusClass(order.status)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {order.invoice_number ? (
                          <a
                            href={order.invoice_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-green-400 hover:text-green-300 underline truncate block"
                            title="View Invoice PDF"
                          >
                            {order.invoice_number}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2 sticky right-0 bg-background/95 backdrop-blur-sm z-10">
                        <div className="flex items-center justify-end gap-1.5 flex-shrink-0">
                          {order.file_url ? (
                            <button
                              onClick={() => handleDownload(order.file_url!, order.order_number || order.id.slice(0, 8), order.id)}
                              className="p-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 transition-colors flex-shrink-0"
                              title="Stiahnuť súbor zákazníka"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="p-2 rounded-lg bg-secondary/30 text-muted-foreground/50 cursor-not-allowed flex-shrink-0" title="Súbor nie je k dispozícii">
                              <Download className="w-4 h-4" />
                            </span>
                          )}
                          <button
                            onClick={() => triggerUpload(order.id)}
                            disabled={uploadingId === order.id}
                            className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-500 transition-colors flex-shrink-0"
                            title="Nahrať hotový súbor"
                          >
                            <Upload className={`w-4 h-4 ${uploadingId === order.id ? 'animate-pulse' : ''}`} />
                          </button>
                          <button
                            onClick={() => setDetailOrder(order)}
                            className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors flex-shrink-0"
                            title="Zobraziť detail objednávky"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Detail Modal */}
        {detailOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    Detail objednávky
                  </h2>
                  <button
                    onClick={() => setDetailOrder(null)}
                    className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Základné informácie */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2">
                      Základné informácie
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">ID objednávky</p>
                        <p className="font-mono font-semibold text-primary">{detailOrder.order_number || detailOrder.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Dátum vytvorenia</p>
                        <p className="text-foreground">{formatLocalDateTime(detailOrder.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                          detailOrder.status === 'pending' 
                            ? 'bg-black text-orange-500 border border-orange-500/50'
                            : detailOrder.status === 'processing'
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : detailOrder.status === 'completed'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {detailOrder.status === 'pending' ? 'Pending' : detailOrder.status === 'processing' ? 'Processing' : detailOrder.status === 'completed' ? 'Completed' : detailOrder.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Celková cena</p>
                        <p className="text-xl font-bold text-primary">{detailOrder.total_price}€</p>
                      </div>
                    </div>
                  </div>

                  {/* Zákazník */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2">
                      Zákazník
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Meno</p>
                        <p className="text-foreground font-medium">{detailOrder.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">E-mail</p>
                        <p className="text-foreground">{detailOrder.customer_email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Vozidlo */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2">
                      Vozidlo
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Značka / Model</p>
                        <p className="text-foreground font-medium">{detailOrder.car_brand || 'Nezadané'} {detailOrder.car_model || ''}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Palivo</p>
                        <p className="text-foreground">{detailOrder.fuel_type || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Rok výroby</p>
                        <p className="text-foreground">{detailOrder.year ? detailOrder.year.toString() : '—'}</p>
                      </div>
                      {detailOrder.ecu_type && (
                        <div>
                          <p className="text-sm text-muted-foreground">Typ ECU</p>
                          <p className="text-foreground">{detailOrder.ecu_type}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Služby */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2">
                      Služby
                    </h3>
                    <div>
                      <p className="text-foreground">{getServiceNames(detailOrder.service_type) || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Súbory */}
                <div className="mt-6 pt-6 border-t border-primary/20">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Súbory</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Súbor zákazníka</p>
                      {detailOrder.file_url ? (
                        <button
                          onClick={() => handleDownload(detailOrder.file_url!, detailOrder.order_number || detailOrder.id.slice(0, 8), detailOrder.id)}
                          className="btn-secondary inline-flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Stiahnuť súbor zákazníka
                        </button>
                      ) : (
                        <p className="text-muted-foreground text-sm">Súbor nie je k dispozícii</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Hotový súbor</p>
                      {detailOrder.result_file_url ? (
                        <a
                          href={detailOrder.result_file_url}
                          download
                          className="btn-primary inline-flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Stiahnuť hotový súbor
                        </a>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-muted-foreground text-sm">Hotový súbor ešte nie je nahraný</p>
                          <button
                            onClick={() => {
                              setDetailOrder(null);
                              triggerUpload(detailOrder.id);
                            }}
                            className="btn-primary inline-flex items-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Nahrať hotový súbor
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Poznámka zákazníka */}
                <div className="mt-6 pt-6 border-t border-primary/20">
                  <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2 mb-4">
                    Poznámka zákazníka
                  </h3>
                  <div className="bg-secondary/30 p-4 rounded-lg">
                    <p className="text-foreground whitespace-pre-wrap">{detailOrder.customer_note || '—'}</p>
                  </div>
                </div>

                {/* Interná poznámka */}
                {detailOrder.internal_note && (
                  <div className="mt-6 pt-6 border-t border-primary/20">
                    <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2 mb-4">
                      Interná poznámka
                    </h3>
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <p className="text-foreground whitespace-pre-wrap">{detailOrder.internal_note}</p>
                    </div>
                  </div>
                )}

                {/* CRC */}
                <div className="mt-6 pt-6 border-t border-primary/20">
                  <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2 mb-4">
                    CRC
                  </h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={getEditableValue(detailOrder, 'checksum_crc')}
                      onChange={(e) => {
                        handleFieldChange(detailOrder.id, 'checksum_crc', e.target.value);
                        // Automaticky aktivovať tlačidlo pri zmene
                        if (!editingFields[detailOrder.id]) {
                          setEditingFields(prev => ({
                            ...prev,
                            [detailOrder.id]: { ...prev[detailOrder.id], checksum_crc: e.target.value }
                          }));
                        }
                      }}
                      placeholder="CRC..."
                      maxLength={6}
                      className="w-[120px] h-9 bg-secondary/50 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                    />
                    <button
                      onClick={() => handleSaveFields(detailOrder.id)}
                      disabled={savingId === detailOrder.id}
                      className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Uložiť CRC"
                    >
                      <Save className={`w-4 h-4 ${savingId === detailOrder.id ? 'animate-pulse' : ''}`} />
                      Uložiť
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Internal Note Modal */}
        <InternalNoteModal
          isOpen={!!noteModalOrder}
          onClose={() => setNoteModalOrder(null)}
          orderId={noteModalOrder?.id || ''}
          orderNumber={noteModalOrder?.order_number || noteModalOrder?.id.slice(0, 8).toUpperCase() || ''}
          initialNote={noteModalOrder ? getEditableValue(noteModalOrder, 'internal_note') : ''}
          onSave={async (note) => {
            if (!noteModalOrder) return;
            handleFieldChange(noteModalOrder.id, 'internal_note', note);
            await handleSaveFields(noteModalOrder.id);
            setNoteModalOrder(null);
          }}
          isSaving={savingId === noteModalOrder?.id}
        />
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border/50 mt-auto">
        <div className="w-full max-w-[77%] mx-auto px-12 py-8">
          <div className="glass-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground text-lg mb-4">Fakturačné údaje</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground text-base">REMAPPRO</p>
                  <p>Janka Kráľa 29</p>
                  <p>990 01 Veľký Krtíš</p>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-border/50">
              <p className="text-center text-sm text-muted-foreground">
                Copyright © 2026 REMAPPRO Digital Solutions. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ManagementPortal;
