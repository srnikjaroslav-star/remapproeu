'use client';

import { useState, useEffect } from 'react';
import { getWorkLogsBySlug, searchWorkLogs, getServices, getAllWorkLogsBySlug, getCurrentMonthKey } from '@/lib/data';
import { WorkLog, Service } from '@/types';
import { Search } from 'lucide-react';

interface WorkLogTableProps {
  slug: string;
}

export default function WorkLogTable({ slug }: WorkLogTableProps) {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());

  useEffect(() => {
    setServices(getServices());
    loadLogs();
  }, [slug, selectedMonth, showArchive]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = searchWorkLogs(slug, searchQuery, showArchive ? undefined : selectedMonth);
      setLogs(filtered);
    } else {
      loadLogs();
    }
  }, [searchQuery, slug, selectedMonth, showArchive]);

  const loadLogs = () => {
    if (showArchive) {
      const allLogs = getAllWorkLogsBySlug(slug);
      if (selectedMonth) {
        setLogs(allLogs.filter(log => log.month_key === selectedMonth));
      } else {
        setLogs(allLogs);
      }
    } else {
      const monthLogs = getWorkLogsBySlug(slug, selectedMonth);
      setLogs(monthLogs);
    }
  };

  const getServiceName = (serviceId: string): string => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };

  const getServicePrice = (log: WorkLog): number => {
    if (log.price_override) return log.price_override;
    const service = services.find(s => s.id === log.service_id);
    return service?.price_eur || 0;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get unique months for archive selector
  const allLogs = getAllWorkLogsBySlug(slug);
  const uniqueMonths = Array.from(new Set(allLogs.map(log => log.month_key))).sort().reverse();

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Car Model or VIN..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00ffff]/50 focus:ring-2 focus:ring-[#00ffff]/20"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchive(!showArchive)}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              showArchive
                ? 'bg-[#00ffff]/20 border border-[#00ffff]/50 text-[#00ffff]'
                : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            {showArchive ? 'Current Month' : 'Archive View'}
          </button>
        </div>
      </div>

      {/* Month Selector (when in archive mode) */}
      {showArchive && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Month</label>
          <select
            value={selectedMonth || ''}
            onChange={(e) => setSelectedMonth(e.target.value || getCurrentMonthKey())}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#00ffff]/50 focus:ring-2 focus:ring-[#00ffff]/20 min-h-[44px]"
          >
            <option value="">All Months</option>
            {uniqueMonths.map(month => (
              <option key={month} value={month} className="bg-[#1a1a1a]">
                {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Service</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Car Model</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">VIN</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Price</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No work logs found
                </td>
              </tr>
            ) : (
              logs
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-300">{formatDate(log.created_at)}</td>
                    <td className="py-3 px-4 text-sm text-white">{getServiceName(log.service_id)}</td>
                    <td className="py-3 px-4 text-sm text-white font-medium">{log.car_model}</td>
                    <td className="py-3 px-4 text-sm text-gray-400 font-mono">{log.vin || '—'}</td>
                    <td className="py-3 px-4 text-sm text-right text-[#00ffff] font-semibold">
                      €{getServicePrice(log).toFixed(2)}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {logs.length > 0 && (
        <div className="glass rounded-lg p-4 border border-white/10">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total Entries:</span>
            <span className="text-white font-semibold">{logs.length}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-400">Total Revenue:</span>
            <span className="text-[#00ffff] font-bold text-lg">
              €{logs.reduce((sum, log) => sum + getServicePrice(log), 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
