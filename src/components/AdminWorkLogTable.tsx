'use client';

import { useState, useEffect, useCallback } from 'react';
import { getWorkLogsByClient, deleteWorkLog } from '@/lib/supabase/queries';
import { Database } from '@/types/database';
import { Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ServiceItem } from '@/lib/supabase/queries';

type WorkLog = Database['public']['Tables']['work_logs']['Row'] & {
  clients?: Database['public']['Tables']['clients']['Row'];
};

interface AdminWorkLogTableProps {
  clientId: string;
  monthKey: string;
  onDataChange?: () => void;
}

export default function AdminWorkLogTable({ clientId, monthKey, onDataChange }: AdminWorkLogTableProps) {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      const data = await getWorkLogsByClient(clientId, monthKey);
      setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Nepodarilo sa načítať záznamy');
    }
  }, [clientId, monthKey]);

  const setupRealtime = useCallback(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`work_logs_changes_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_logs',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          loadLogs();
          // Trigger analytics refresh when data changes
          onDataChange?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, loadLogs, onDataChange]);

  useEffect(() => {
    // Reset logs when client or month changes to show loading state
    setLogs([]);
    loadLogs();
    const cleanup = setupRealtime();
    return cleanup;
  }, [clientId, monthKey, loadLogs, setupRealtime]);

  const handleDelete = async (logId: string) => {
    if (deleteConfirm !== logId) {
      setDeleteConfirm(logId);
      return;
    }

    try {
      await deleteWorkLog(logId);
      toast.success('Záznam bol vymazaný');
      setDeleteConfirm(null);
      loadLogs();
      // Immediately trigger analytics refresh after deletion
      onDataChange?.();
    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('Nepodarilo sa vymazať záznam');
    }
  };

  const parseServiceItems = (serviceItems: any): ServiceItem[] => {
    if (Array.isArray(serviceItems)) {
      return serviceItems as ServiceItem[];
    }
    return [];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('sk-SK', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return log.car_info.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#00d2ff]" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hľadať podľa údajov o aute..."
          className="w-full pl-10 pr-4 py-3 bg-white/5 backdrop-blur-sm border border-[#00d2ff]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#00d2ff]/30 transition-all"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-black/60 backdrop-blur-md z-10">
            <tr className="border-b border-[#00d2ff]/20">
              <th className="text-left py-3 px-4 text-sm font-medium text-[#00d2ff]">Dátum</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-[#00d2ff]">Auto</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-[#00d2ff]">Služby</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-[#00d2ff]">Cena</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-[#00d2ff]">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Žiadne záznamy
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const serviceItems = parseServiceItems(log.service_items);
                return (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-[#00d2ff]/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-300">{formatDate(log.created_at)}</td>
                    <td className="py-3 px-4 text-sm text-white font-medium">{log.car_info}</td>
                    <td className="py-3 px-4 text-sm text-gray-300">
                      <div className="flex flex-wrap gap-1">
                        {serviceItems.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-1 bg-[#00d2ff]/10 border border-[#00d2ff]/20 rounded text-xs text-[#00d2ff]"
                          >
                            {item.service_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-[#00d2ff] font-semibold">
                      €{Number(log.total_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDelete(log.id)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                          deleteConfirm === log.id
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : 'bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/50'
                        }`}
                      >
                        {deleteConfirm === log.id ? 'Potvrdiť' : <Trash2 size={14} />}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {filteredLogs.length > 0 && (
        <div className="glass rounded-lg p-4 border border-[#00d2ff]/20 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Celkom záznamov:</span>
            <span className="text-[#00d2ff] font-semibold">{filteredLogs.length}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-400">Celkový príjem:</span>
            <span className="text-[#00d2ff] font-bold text-lg">
              €{filteredLogs.reduce((sum, log) => sum + Number(log.total_price), 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
