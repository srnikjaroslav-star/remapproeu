'use client';

import { Database } from '@/types/database';
import { Euro, Car, TrendingUp } from 'lucide-react';

interface LiveStatsCardsProps {
  monthlyRevenue: number;
  carCount: number;
  bestSellingService: {
    name: string;
    count: number;
    revenue: number;
  } | null;
}

export default function LiveStatsCards({
  monthlyRevenue,
  carCount,
  bestSellingService,
}: LiveStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Monthly Revenue */}
      <div className="glass rounded-xl p-6 border border-white/10 neon-glow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Euro className="text-[#00d2ff]" size={20} />
            <h3 className="text-sm font-medium text-gray-400">Monthly Revenue</h3>
          </div>
        </div>
        <div className="text-3xl font-bold text-[#00d2ff] neon-glow-text">
          €{monthlyRevenue.toFixed(2)}
        </div>
      </div>

      {/* Car Count */}
      <div className="glass rounded-xl p-6 border border-white/10 neon-glow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Car className="text-[#00d2ff]" size={20} />
            <h3 className="text-sm font-medium text-gray-400">Car Count</h3>
          </div>
        </div>
        <div className="text-3xl font-bold text-[#00d2ff] neon-glow-text">
          {carCount}
        </div>
        <div className="text-xs text-gray-500 mt-2">Unique vehicles</div>
      </div>

      {/* Best Selling Service */}
      <div className="glass rounded-xl p-6 border border-white/10 neon-glow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-[#00d2ff]" size={20} />
            <h3 className="text-sm font-medium text-gray-400">Best Selling Service</h3>
          </div>
        </div>
        {bestSellingService ? (
          <>
            <div className="text-xl font-bold text-white mb-1">
              {bestSellingService.name}
            </div>
            <div className="text-lg text-[#00d2ff] font-semibold">
              €{bestSellingService.revenue.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {bestSellingService.count} {bestSellingService.count === 1 ? 'entry' : 'entries'}
            </div>
          </>
        ) : (
          <div className="text-gray-400">No data yet</div>
        )}
      </div>
    </div>
  );
}
