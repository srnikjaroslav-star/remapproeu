import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Download, Upload, Eye, CheckCircle, Clock, Package, 
  RefreshCw, Search, User, Power, Save
} from 'lucide-react';
import Logo from '@/components/Logo';
import SystemStatus, { getSystemStatus, setSystemStatus, isSystemOnline, SystemStatusMode } from '@/components/SystemStatus';
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
  const [editingFields, setEditingFields] = useState<Record<string, { checksum_crc: string; internal_note: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusMode, setStatusMode] = useState<SystemStatusMode>(getSystemStatus);

  const cycleStatusMode = () => {
    // Cycle: auto -> online -> offline -> auto
    const nextMode: Record<SystemStatusMode, SystemStatusMode> = {
      'auto': 'online',
      'online': 'offline',
      'offline': 'auto'
    };
    const newMode = nextMode[statusMode];
    setStatusMode(newMode);
    setSystemStatus(newMode);
    
    const messages: Record<SystemStatusMode, string> = {
      'auto': 'System status set to AUTO (follows schedule 08:00-20:00)',
      'online': 'System forced ONLINE (visible to customers)',
      'offline': 'System forced OFFLINE (visible to customers)'
    };
    toast.success(messages[newMode]);
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
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    console.log('Updating order status:', { orderId, newStatus });
    
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

      toast.success(`Status updated to ${newStatus.charAt(0).toUpperCase()}${newStatus.slice(1)}`);
      await fetchOrders();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(`Failed to update status: ${error.message || 'Unknown error'}`);
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
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'completed':
        return 'status-completed';
      default:
        return 'status-pending';
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
          <div className="flex items-center gap-6">
            <Link to="/">
              <Logo size="sm" />
            </Link>
            <SystemStatus />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={cycleStatusMode}
              className={`py-2 px-4 flex items-center gap-2 rounded-lg border transition-all ${
                statusMode === 'online'
                  ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
                  : statusMode === 'offline'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                    : 'bg-primary/20 border-primary/50 text-primary hover:bg-primary/30'
              }`}
            >
              <Power className="w-4 h-4" />
              {statusMode === 'online' ? 'Force ONLINE' : statusMode === 'offline' ? 'Force OFFLINE' : 'Auto (Schedule)'}
            </button>
            <span className="text-sm text-muted-foreground">Admin Portal</span>
            <button onClick={fetchOrders} className="btn-secondary py-2 px-4 flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-4">Order ID</th>
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Vehicle</th>
                  <th className="text-left p-4">ECU</th>
                  <th className="text-left p-4">Services</th>
                  <th className="text-left p-4">Price</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Checksum (CRC)</th>
                  <th className="text-left p-4">Internal Note</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                      <td colSpan={10} className="text-center py-12 text-muted-foreground">
                        Loading orders...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-muted-foreground">
                        No orders found
                      </td>
                    </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="table-row">
                      <td className="p-4">
                        <span className="font-mono text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                          {order.order_number || order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
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
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`admin-status-select ${getStatusClass(order.status)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={getEditableValue(order, 'checksum_crc')}
                          onChange={(e) => handleFieldChange(order.id, 'checksum_crc', e.target.value)}
                          onBlur={() => handleFieldBlur(order.id, 'checksum_crc')}
                          placeholder="CRC..."
                          className="w-full bg-secondary/50 border border-border/50 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={getEditableValue(order, 'internal_note')}
                          onChange={(e) => handleFieldChange(order.id, 'internal_note', e.target.value)}
                          onBlur={() => handleFieldBlur(order.id, 'internal_note')}
                          placeholder="Internal note..."
                          className="w-full bg-secondary/50 border border-border/50 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {editingFields[order.id] && (
                            <button
                              onClick={() => handleSaveFields(order.id)}
                              disabled={savingId === order.id}
                              className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                              title="Save Admin Fields"
                            >
                              <Save className={`w-4 h-4 ${savingId === order.id ? 'animate-pulse' : ''}`} />
                            </button>
                          )}
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
