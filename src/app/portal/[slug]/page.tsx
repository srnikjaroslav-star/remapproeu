'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { getClientBySlug, getAllWorkLogsByClient, getWorkLogsByClient, getCurrentMonthKey } from '@/lib/supabase/queries';
import { Database } from '@/types/database';
import ClientWorkLogTable from '@/components/ClientWorkLogTable';
import PriceList from '@/components/PriceList';
import MonthSelector from '@/components/MonthSelector';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ServiceItem } from '@/lib/supabase/queries';

type Client = Database['public']['Tables']['clients']['Row'];
type WorkLog = Database['public']['Tables']['work_logs']['Row'] & {
  clients?: Database['public']['Tables']['clients']['Row'];
};

interface PortalPageProps {
  params: Promise<{ slug: string }>;
}

export default function PortalPage({ params }: PortalPageProps) {
  const { slug } = use(params);
  const [client, setClient] = useState<Client | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  // Strict initialization: Always start with current system date, regardless of database records
  const [monthKey, setMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [monthlyCount, setMonthlyCount] = useState<number>(0);

  const loadLogs = useCallback(async (clientId: string, selectedMonth?: string) => {
    try {
      const month = selectedMonth || monthKey;
      const monthLogs = await getWorkLogsByClient(clientId, month);
      setLogs(monthLogs);
      
      // Calculate monthly statistics
      const parseServiceItems = (serviceItems: any): ServiceItem[] => {
        if (Array.isArray(serviceItems)) {
          return serviceItems as ServiceItem[];
        }
        return [];
      };

      // Calculate total revenue from service_items
      // Zero-state: Explicitly default to 0 if no logs
      let totalRevenue = 0;
      if (monthLogs && monthLogs.length > 0) {
        monthLogs.forEach(log => {
          const items = parseServiceItems(log.service_items);
          if (items.length > 0) {
            const logTotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
            totalRevenue += logTotal;
          } else {
            // Fallback to total_price if service_items is empty
            totalRevenue += Number(log.total_price || 0);
          }
        });
      }

      setMonthlyRevenue(totalRevenue);
      setMonthlyCount(monthLogs?.length ?? 0);
    } catch (error) {
      console.error('Error loading logs:', error);
      // Zero-state: Reset to 0 on error
      setMonthlyRevenue(0);
      setMonthlyCount(0);
    }
  }, [monthKey]);

  const loadAvailableMonths = useCallback(async (clientId: string) => {
    try {
      const allLogs = await getAllWorkLogsByClient(clientId);
      // Get unique months where client has at least one record
      const months = Array.from(new Set(allLogs.map(log => log.month_key)))
        .filter(Boolean) // Remove null/undefined values
        .sort()
        .reverse(); // Most recent first
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
    } catch (error) {
      console.error('Error loading months:', error);
      // Fallback: Always show at least the current month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setAvailableMonths([currentMonth]);
    }
  }, []);

  const loadClient = useCallback(async () => {
    try {
      setLoading(true);
      const clientData = await getClientBySlug(slug);
      setClient(clientData);
      
      if (clientData) {
        await Promise.all([
          loadLogs(clientData.id),
          loadAvailableMonths(clientData.id)
        ]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Klient nebol nájdený');
    } finally {
      setLoading(false);
    }
  }, [slug, loadLogs, loadAvailableMonths]);

  const setupRealtime = useCallback(() => {
    if (!client?.id) return () => {};

    const supabase = createClient();
    const channel = supabase
      .channel(`portal_work_logs_${client.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'work_logs',
          filter: `client_id=eq.${client.id}`, // Security: Only this client's records
        },
        () => {
          // Instant update when any change occurs
          loadLogs(client.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [client?.id, loadLogs]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  useEffect(() => {
    if (client?.id) {
      const cleanup = setupRealtime();
      return cleanup;
    }
  }, [client?.id, setupRealtime]);

  useEffect(() => {
    if (client?.id) {
      loadLogs(client.id, monthKey);
    }
  }, [client?.id, monthKey, loadLogs]);

  const formatMonth = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const monthName = date.toLocaleDateString('sk-SK', {
      month: 'long',
      year: 'numeric',
    });
    // Capitalize first letter
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#00d2ff]">Načítavam...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Prístup zamietnutý</h1>
          <p className="text-gray-300">Tento portál neexistuje alebo nemáte prístup.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col overflow-x-hidden">
      <main className="flex-1 w-full max-w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          {/* Header - Client Name Only */}
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold neon-glow-text text-[#00d2ff]">
              {client.name}
            </h1>
          </div>

          {/* Monthly Business Overview */}
          <div className="space-y-4">
            {/* Month Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full">
              <label htmlFor="month-selector" className="text-sm font-medium text-gray-300 whitespace-nowrap">
                Mesiac:
              </label>
              <MonthSelector
                id="month-selector"
                value={monthKey}
                options={availableMonths}
                onChange={setMonthKey}
                formatMonth={formatMonth}
                className="w-full sm:min-w-[180px] sm:w-auto"
              />
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Revenue Card */}
              <div className="rounded-lg p-4 bg-black/40 backdrop-blur-md border border-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.3)] w-full overflow-hidden">
                <div className="text-xs md:text-sm text-gray-400 mb-2 break-words">Obrat tento mesiac</div>
                <div className="text-xl md:text-2xl font-bold text-[#00d2ff] neon-glow-text break-words">
                  €{monthlyRevenue.toFixed(2)}
                </div>
              </div>

              {/* Monthly Count Card */}
              <div className="rounded-lg p-4 bg-black/40 backdrop-blur-md border border-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.3)] w-full overflow-hidden">
                <div className="text-xs md:text-sm text-gray-400 mb-2 break-words">Počet úkonov</div>
                <div className="text-xl md:text-2xl font-bold text-[#00d2ff] neon-glow-text break-words">
                  {monthlyCount}
                </div>
              </div>
            </div>
          </div>

          {/* Work Log Table - Read Only */}
          <div className="glass rounded-xl md:rounded-2xl p-4 md:p-6 border border-[#00d2ff]/30 neon-glow w-full overflow-hidden">
            <h2 className="text-xl md:text-2xl font-semibold text-[#00d2ff] mb-4 md:mb-6 neon-glow-text break-words">
              História úkonov
            </h2>
            <ClientWorkLogTable clientId={client.id} monthKey={monthKey} logs={logs} />
          </div>

          {/* Price List - Read Only */}
          <div className="glass rounded-xl md:rounded-2xl p-4 md:p-6 border border-[#00d2ff]/30 neon-glow w-full overflow-hidden">
            <h2 className="text-xl md:text-2xl font-semibold text-[#00d2ff] mb-4 md:mb-6 neon-glow-text break-words">
              Cenník služieb
            </h2>
            <PriceList />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
