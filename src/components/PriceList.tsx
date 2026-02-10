'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAllServices } from '@/lib/supabase/queries';
import { Database } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

type Service = Database['public']['Tables']['services']['Row'];

export default function PriceList() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const loadServices = useCallback(async () => {
    try {
      const data = await getAllServices();
      setServices(data);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Realtime subscription for services table
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('portal_services_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'services',
        },
        () => {
          // Instant update when any change occurs
          loadServices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadServices]);

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const categories = Object.keys(servicesByCategory).sort();

  if (loading) {
    return (
      <div className="text-gray-400 text-center py-8">Načítavam cenník...</div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-gray-400 text-center py-8">Žiadne služby nie sú k dispozícii.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
      {categories.map((category) => (
        <div
          key={category}
          className="flex flex-col rounded-lg p-4 bg-black/40 backdrop-blur-md border border-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.3)]"
        >
          <h3 className="text-sm md:text-base font-semibold text-[#00d2ff] mb-3 neon-glow-text">
            {category}
          </h3>
          <div className="space-y-1.5">
            {servicesByCategory[category].map((service) => {
              // Handle 1% = 1€ rule - extract percentage from name if present
              const percentMatch = service.name.match(/(\d+)%/);
              const calculatedPrice = percentMatch 
                ? parseInt(percentMatch[1]) 
                : Number(service.price);

              return (
                <div
                  key={service.id}
                  className="flex justify-between items-center py-1.5 border-b border-[#00d2ff]/10 last:border-b-0"
                >
                  <span className="text-xs text-gray-300 font-normal flex-1">
                    {service.name}
                  </span>
                  <span className="text-xs text-[#00d2ff] font-semibold text-right whitespace-nowrap ml-2">
                    €{calculatedPrice.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
