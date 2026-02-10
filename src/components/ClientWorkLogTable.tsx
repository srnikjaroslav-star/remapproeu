'use client';

import { useState, useEffect } from 'react';
import { getWorkLogsByClient, getAllWorkLogsByClient } from '@/lib/supabase/queries';
import { Database } from '@/types/database';
import { Search } from 'lucide-react';
import { ServiceItem } from '@/lib/supabase/queries';

type WorkLog = Database['public']['Tables']['work_logs']['Row'] & {
  clients?: Database['public']['Tables']['clients']['Row'];
};

interface ClientWorkLogTableProps {
  clientId: string;
  monthKey?: string;
  logs?: WorkLog[]; // Optional: if provided, use these logs instead of fetching
}

export default function ClientWorkLogTable({ clientId, monthKey, logs: providedLogs }: ClientWorkLogTableProps) {
  const [logs, setLogs] = useState<WorkLog[]>(providedLogs || []);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (providedLogs) {
      setLogs(providedLogs);
    } else {
      loadLogs();
    }
  }, [clientId, monthKey, providedLogs]);

  const loadLogs = async () => {
    try {
      const data = monthKey 
        ? await getWorkLogsByClient(clientId, monthKey)
        : await getAllWorkLogsByClient(clientId);
      setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
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
    <div className="space-y-4 w-full overflow-hidden">
      {/* Search Bar */}
      <div className="relative mb-4 w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#00d2ff]" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hľadať podľa údajov o aute..."
          className="w-full pl-10 pr-4 py-3 bg-white/5 backdrop-blur-sm border border-[#00d2ff]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#00d2ff]/30 transition-all"
        />
      </div>

      {/* Table - Desktop View */}
      <div className="hidden md:block overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-black/60 backdrop-blur-md z-10">
            <tr className="border-b border-[#00d2ff]/20">
              <th className="text-left py-3 px-4 text-sm font-medium text-[#00d2ff]">Dátum</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-[#00d2ff]">Auto</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-[#00d2ff]">Služby</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-[#00d2ff]">Cena</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  Žiadne záznamy
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const serviceItems = parseServiceItems(log.service_items);
                return (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-[#00d2ff]/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-300">{formatDate(log.created_at)}</td>
                    <td className="py-3 px-4 text-sm text-white font-medium break-words max-w-xs">{log.car_info}</td>
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {filteredLogs.length > 0 && (
        <div className="glass rounded-lg p-4 border border-[#00d2ff]/20 backdrop-blur-sm w-full overflow-hidden">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
            <span className="text-gray-400 break-words">Celkom záznamov:</span>
            <span className="text-[#00d2ff] font-semibold break-words">{filteredLogs.length}</span>
          </div>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mt-2 gap-2">
            <span className="text-gray-400 break-words">Celková suma:</span>
            <span className="text-[#00d2ff] font-bold text-lg break-words">
              €{filteredLogs.reduce((sum, log) => sum + Number(log.total_price), 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 w-full">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Žiadne záznamy
          </div>
        ) : (
          filteredLogs.map((log) => {
            const serviceItems = parseServiceItems(log.service_items);
            return (
              <div
                key={log.id}
                className="glass rounded-lg p-4 border border-white/10 w-full overflow-hidden"
              >
                <div className="flex flex-col space-y-3">
                  <div className="flex flex-col space-y-2">
                    <div className="text-xs text-gray-400 break-words">
                      {formatDate(log.created_at)}
                    </div>
                    <div className="text-sm font-medium text-white break-words overflow-hidden">
                      {log.car_info}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {serviceItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-1 bg-[#00d2ff]/10 border border-[#00d2ff]/20 rounded text-xs text-[#00d2ff] break-words"
                      >
                        {item.service_name}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-end pt-2 border-t border-white/10">
                    <div className="text-lg font-bold text-[#00d2ff] break-words">
                      €{Number(log.total_price).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
