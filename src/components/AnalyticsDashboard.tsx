'use client';

import { useState, useEffect } from 'react';
import { getAnalytics } from '@/lib/data';
import { Analytics } from '@/types';
import { TrendingUp, Calendar, Star } from 'lucide-react';

interface AnalyticsDashboardProps {
  slug: string;
}

export default function AnalyticsDashboard({ slug }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    const data = getAnalytics(slug);
    setAnalytics(data);
    
    // Refresh analytics every 30 seconds
    const interval = setInterval(() => {
      const updated = getAnalytics(slug);
      setAnalytics(updated);
    }, 30000);

    return () => clearInterval(interval);
  }, [slug]);

  if (!analytics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-white/10 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Today's Earnings */}
      <div className="glass rounded-xl p-6 border border-white/10 cyan-glow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-[#00ffff]" size={20} />
            <h3 className="text-sm font-medium text-gray-400">Today's Earnings</h3>
          </div>
        </div>
        <div className="text-3xl font-bold text-[#00ffff] cyan-glow-text">
          €{analytics.todayEarnings.toFixed(2)}
        </div>
        <div className="text-xs text-gray-500 mt-2">Live updates every 30s</div>
      </div>

      {/* Monthly Projected */}
      <div className="glass rounded-xl p-6 border border-white/10 cyan-glow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-[#00ffff]" size={20} />
            <h3 className="text-sm font-medium text-gray-400">Monthly Projected</h3>
          </div>
        </div>
        <div className="text-3xl font-bold text-[#00ffff] cyan-glow-text">
          €{analytics.monthlyProjected.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500 mt-2">Based on current progress</div>
      </div>

      {/* Top Service */}
      <div className="glass rounded-xl p-6 border border-white/10 cyan-glow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="text-[#00ffff]" size={20} />
            <h3 className="text-sm font-medium text-gray-400">Top Service</h3>
          </div>
        </div>
        {analytics.topService ? (
          <>
            <div className="text-xl font-bold text-white mb-1">
              {analytics.topService.name}
            </div>
            <div className="text-lg text-[#00ffff] font-semibold">
              €{analytics.topService.revenue.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {analytics.topService.count} {analytics.topService.count === 1 ? 'entry' : 'entries'}
            </div>
          </>
        ) : (
          <div className="text-gray-400">No data yet</div>
        )}
      </div>
    </div>
  );
}
