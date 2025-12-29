import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Download, Upload, Eye, CheckCircle, Clock, Package, 
  RefreshCw, Search, ChevronDown
} from 'lucide-react';
import Logo from '@/components/Logo';
import { supabase, Order } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SERVICES } from '@/data/services';

const ManagementPortal = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success('Status updated');
      fetchOrders();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update status');
    }
  };

  const handleResultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrderId) return;

    setUploadingId(selectedOrderId);
    
    try {
      const fileName = `result-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('tunes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tunes')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          result_file_url: publicUrl, 
          status: 'completed',
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedOrderId);

      if (updateError) throw updateError;

      toast.success('Result file uploaded and status updated to completed');
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

  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (order.customer_name || '').toLowerCase().includes(searchLower) ||
      (order.customer_email || '').toLowerCase().includes(searchLower) ||
      (order.car_brand || '').toLowerCase().includes(searchLower) ||
      (order.car_model || '').toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">Pending</span>;
      case 'processing':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500 border border-blue-500/30">Processing</span>;
      case 'completed':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500 border border-green-500/30">Completed</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">{status}</span>;
    }
  };

  const getServiceNames = (serviceIds: string[] | string | null) => {
    if (!serviceIds) return '';
    const ids = Array.isArray(serviceIds) ? serviceIds : JSON.parse(serviceIds);
    return ids.map((id: string) => SERVICES.find((s) => s.id === id)?.name).filter(Boolean).join(', ');
  };

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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Admin Portal</span>
            <button onClick={fetchOrders} className="btn-secondary py-2 px-4 flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
            className="input-field min-w-[150px]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4">
            <p className="text-muted-foreground text-sm">Total Orders</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" /> Pending
            </p>
            <p className="text-2xl font-bold text-yellow-500">
              {orders.filter((o) => o.status === 'pending').length}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" /> Processing
            </p>
            <p className="text-2xl font-bold text-blue-500">
              {orders.filter((o) => o.status === 'processing').length}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> Completed
            </p>
            <p className="text-2xl font-bold text-green-500">
              {orders.filter((o) => o.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Orders Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Vehicle</th>
                  <th className="text-left p-4">ECU</th>
                  <th className="text-left p-4">Services</th>
                  <th className="text-left p-4">Price</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
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
                    <tr key={order.id} className="table-row">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{order.car_brand} {order.car_model}</p>
                          <p className="text-sm text-muted-foreground">{order.fuel_type} • {order.year}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{order.ecu_type}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm max-w-[200px] truncate" title={getServiceNames(order.service_type)}>
                          {getServiceNames(order.service_type)}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-primary">{order.total_price}€</p>
                      </td>
                      <td className="p-4">
                        <div className="relative">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="input-field text-sm py-1 pr-8 appearance-none cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {order.file_url && (
                            <a
                              href={order.file_url}
                              download
                              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                              title="Download Original"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => triggerUpload(order.id)}
                            disabled={uploadingId === order.id}
                            className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
                            title="Upload Result"
                          >
                            <Upload className={`w-4 h-4 ${uploadingId === order.id ? 'animate-pulse' : ''}`} />
                          </button>
                          {order.result_file_url && (
                            <a
                              href={order.result_file_url}
                              download
                              className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-500 transition-colors"
                              title="Download Result"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManagementPortal;
