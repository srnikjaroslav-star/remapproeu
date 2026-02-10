'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  getClientById, 
  getAnalytics, 
  getDailyRevenue, 
  getAllWorkLogsByClient,
  getCurrentMonthKey,
  getServicesByCategory,
  createWorkLog,
  ServiceItem
} from '@/lib/supabase/queries';
import { Database } from '@/types/database';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AdminWorkLogTable from '@/components/AdminWorkLogTable';
import MonthSelector from '@/components/MonthSelector';
import { Calendar, X, Save } from 'lucide-react';
import { toast } from 'sonner';

type Client = Database['public']['Tables']['clients']['Row'];
type Service = Database['public']['Tables']['services']['Row'];

interface AnalyticsData {
  todayEarnings: number;
  monthlyProjected: number;
  monthlyTotal: number;
  carCount: number;
  topService: {
    name: string;
    count: number;
    revenue: number;
  } | null;
}

interface ChartDataPoint {
  date: string;
  revenue: number;
}

interface AdminDashboardProps {
  clientId: string;
}

export default function AdminDashboard({ clientId }: AdminDashboardProps) {
  const [client, setClient] = useState<Client | null>(null);
  // Strict initialization: Always start with current system date, regardless of database records
  const [monthKey, setMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Work entry state
  const [carInfo, setCarInfo] = useState('');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, Service[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [clientData, analyticsData, revenueData] = await Promise.all([
        getClientById(clientId),
        getAnalytics(clientId, monthKey),
        getDailyRevenue(clientId, monthKey),
      ]);

      setClient(clientData);
      setAnalytics(analyticsData);
      setChartData(revenueData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [clientId, monthKey]);

  const loadServices = useCallback(async () => {
    try {
      const data = await getServicesByCategory();
      setServicesByCategory(data);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadServices();
  }, [loadData, loadServices]);

  const formatMonth = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const monthName = date.toLocaleDateString('sk-SK', {
      month: 'long',
      year: 'numeric',
    });
    // Capitalize first letter: "Február 2026" instead of "február 2026"
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };


  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  useEffect(() => {
    const loadMonths = async () => {
      try {
        const logs = await getAllWorkLogsByClient(clientId);
        const months = Array.from(new Set(logs.map(log => log.month_key)))
          .filter(Boolean) // Remove null/undefined values
          .sort()
          .reverse();
        // Strict: Always include current system month, even if database is empty
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        // Always include current month if not already in the list, and place it first
        if (!months.includes(currentMonth)) {
          months.unshift(currentMonth);
        } else {
          // If current month exists, ensure it's first
          const currentIndex = months.indexOf(currentMonth);
          if (currentIndex > 0) {
            months.splice(currentIndex, 1);
            months.unshift(currentMonth);
          }
        }
        setAvailableMonths(months.length > 0 ? months : [currentMonth]);
      } catch {
        // Fallback: Always show at least the current month
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setAvailableMonths([currentMonth]);
      }
    };
    if (clientId) {
      loadMonths();
    }
  }, [clientId]);

  const handleServiceClick = (service: Service) => {
    setSelectedServices(prev => [...prev, service]);
  };

  const removeService = (index: number) => {
    setSelectedServices(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = (): number => {
    return selectedServices.reduce((sum, service) => {
      return sum + Number(service.price);
    }, 0);
  };

  const handleSaveWorkLog = async () => {
    if (!carInfo.trim()) {
      toast.error('Prosím zadajte údaje o aute');
      return;
    }

    if (selectedServices.length === 0) {
      toast.error('Prosím vyberte aspoň jednu službu');
      return;
    }

    setIsSaving(true);

    try {
      const serviceItems: ServiceItem[] = selectedServices.map(service => ({
        service_id: service.id,
        service_name: service.name,
        price: Number(service.price),
      }));

      await createWorkLog({
        client_id: clientId,
        car_info: carInfo.trim(),
        service_items: serviceItems,
        total_price: calculateTotal(),
        month_key: monthKey,
      });

      toast.success('Úkon bol úspešne zapísaný');
      
      // Reset form
      setCarInfo('');
      setSelectedServices([]);
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error creating work log:', error);
      toast.error('Nepodarilo sa zapísať úkon');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-12">
        Načítavam dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full overflow-hidden flex flex-col pr-16">
      {/* Header - Compact */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold neon-glow-text text-[#00d2ff]">
            {client?.name || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Calendar size={14} />
            <span>{formatMonth(monthKey)}</span>
          </div>
        </div>
        <MonthSelector
          value={monthKey}
          options={availableMonths}
          onChange={setMonthKey}
          formatMonth={formatMonth}
          className="min-w-[180px]"
        />
      </div>

      {/* Main Grid Layout - Compact */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Column - Stats & Chart */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-0 p-6">
          {/* Live Stats Cards - Compact */}
          {analytics && (
            <div className="grid grid-cols-3 gap-3 flex-shrink-0">
              <div className="glass rounded-xl p-4 border border-[#00d2ff]/20 neon-glow">
                <div className="text-xs text-gray-400 mb-1">Revenue</div>
                <div className="text-lg font-bold text-[#00d2ff] neon-glow-text">
                  €{(analytics.monthlyTotal ?? 0).toFixed(0)}
                </div>
              </div>
              <div className="glass rounded-xl p-4 border border-[#00d2ff]/20 neon-glow">
                <div className="text-xs text-gray-400 mb-1">Cars</div>
                <div className="text-lg font-bold text-[#00d2ff] neon-glow-text">
                  {analytics.carCount ?? 0}
                </div>
              </div>
              <div className="glass rounded-xl p-4 border border-[#00d2ff]/20 neon-glow">
                <div className="text-xs text-gray-400 mb-1">Top</div>
                <div className="text-xs font-medium text-white truncate">
                  {analytics.topService?.name || 'N/A'}
                </div>
              </div>
            </div>
          )}

          {/* Revenue Chart - Compact, Fixed 220px Height */}
          {chartData.length > 0 && (
            <div className="glass rounded-xl p-3 border border-[#00d2ff]/20 neon-glow flex-shrink-0">
              <h2 className="text-xs font-semibold text-[#00d2ff] mb-2">Denné príjmy</h2>
              <div className="w-full" style={{ height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(0, 210, 255, 0.5)"
                      style={{ fontSize: '9px' }}
                      tick={{ fill: 'rgba(255, 255, 255, 0.6)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="rgba(0, 210, 255, 0.5)"
                      style={{ fontSize: '9px' }}
                      tick={{ fill: 'rgba(255, 255, 255, 0.6)' }}
                      tickFormatter={(value) => `€${value}`}
                      tickLine={false}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(5, 5, 5, 0.98)',
                        border: '1px solid rgba(0, 210, 255, 0.4)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '11px',
                        padding: '6px 8px',
                      }}
                      formatter={(value: number | undefined) => {
                        if (value === undefined) return ['€0.00', 'Príjem'];
                        return [`€${value.toFixed(2)}`, 'Príjem'];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#00d2ff"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#00d2ff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>

        {/* Right Column - Work Entry */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 min-h-0">
          {/* Work Entry Section - Compact */}
          <div className="glass rounded-xl p-4 border border-white/10 flex-1 min-h-0 flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-4 flex-shrink-0">Nový úkon</h2>
            
            {/* Car Info Input - Compact */}
            <div className="mb-4 flex-shrink-0">
              <label htmlFor="carInfo" className="block text-xs font-medium text-gray-300 mb-1">
                Údaje o aute <span className="text-red-400">*</span>
              </label>
              <input
                  id="carInfo"
                  type="text"
                  autoComplete="off"
                  value={carInfo}
                  onChange={(e) => setCarInfo(e.target.value)}
                  placeholder="Napríklad: BMW X5 VIN..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#00d2ff] transition-colors"
                />
            </div>

            {/* Action Cards - Selected Services with Real-time Price Counter */}
            {selectedServices.length > 0 && (
              <div className="mb-4 flex-shrink-0 w-full">
                <div className="glass rounded-2xl border border-[#00d2ff]/30 bg-[#00d2ff]/10 neon-glow p-6 overflow-visible w-full" style={{ overflow: 'visible !important' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-white">Aktívne služby</h3>
                    <div className="text-[#00d2ff] font-bold text-lg neon-glow-text">
                      €{calculateTotal().toFixed(2)}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {selectedServices.map((service, index) => (
                      <div
                        key={`${service.id}-${index}`}
                        className="glass rounded-lg p-2 border border-[#00d2ff]/30 bg-[#00d2ff]/10 neon-glow"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium text-xs truncate">{service.name}</div>
                            <div className="text-[#00d2ff] font-semibold text-xs mt-0.5">
                              €{Number(service.price).toFixed(2)}
                            </div>
                          </div>
                          <button
                            onClick={() => removeService(index)}
                            className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                            aria-label="Odstrániť"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Service Grid - Compact with Prices Below Labels */}
            <div className="flex-1 min-h-0 flex flex-col">
              <h3 className="text-sm font-medium text-gray-300 mb-2 flex-shrink-0">Vyberte služby</h3>
              <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-12">
                <div className="space-y-3 ml-10">
                  {Object.entries(servicesByCategory).map(([category, services]) => (
                    <div key={category}>
                      <h4 className="text-xs font-medium text-[#00d2ff] mb-1.5">{category}</h4>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1.5">
                        {services.map((service) => (
                          <button
                            key={service.id}
                            onClick={() => handleServiceClick(service)}
                            className="glass rounded-lg p-2 text-center transition-all border border-white/10 hover:bg-white/10 hover:border-[#00d2ff]/50 neon-glow cursor-pointer active:scale-95 touch-manipulation flex flex-col items-center justify-center min-h-[70px]"
                          >
                            <div className="font-medium text-white text-[10px] mb-0.5 leading-tight">
                              {service.name}
                            </div>
                            <div className="text-[#00d2ff] font-semibold text-[10px] neon-glow-text">
                              €{Number(service.price).toFixed(2)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button - Compact */}
            <button
              onClick={handleSaveWorkLog}
              disabled={isSaving || !carInfo.trim() || selectedServices.length === 0}
              className="w-full px-4 py-3 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 border border-[#00d2ff]/50 rounded-lg text-[#00d2ff] font-medium transition-all neon-glow disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2 text-sm flex-shrink-0 mt-4 mb-4"
            >
              <Save size={18} />
              <span>{isSaving ? 'Ukladám...' : 'Zapísať úkon'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Work Log Table - Compact, Scrollable */}
      <div className="flex-shrink-0 mb-12">
        <div className="ml-10 pr-2">
          <div className="glass rounded-xl p-4 border border-[#00d2ff]/30 neon-glow backdrop-blur-md bg-black/40 flex flex-col">
            <h2 className="text-sm font-semibold text-[#00d2ff] mb-3 flex-shrink-0 neon-glow-text">História úkonov</h2>
            <div className="flex-1 min-h-0">
              <AdminWorkLogTable 
                clientId={clientId} 
                monthKey={monthKey} 
                onDataChange={loadData}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
