'use client';

import { useState, useEffect } from 'react';
import { getServicesByCategory } from '@/lib/supabase/queries';
import { Database } from '@/types/database';
import LogEntryModal from './LogEntryModal';

type Service = Database['public']['Tables']['services']['Row'];

interface ServiceGridProps {
  clientId: string;
  monthKey: string;
  readOnly?: boolean;
}

export default function ServiceGrid({ clientId, monthKey, readOnly = false }: ServiceGridProps) {
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, Service[]>>({});
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await getServicesByCategory();
      setServicesByCategory(data);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceClick = (service: Service) => {
    if (readOnly) return;
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
  };

  if (loading) {
    return <div className="text-gray-400">Loading services...</div>;
  }

  const categories = Object.keys(servicesByCategory);

  return (
    <>
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category}>
            <h3 className="text-lg font-medium text-[#00d2ff] mb-3">{category}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {servicesByCategory[category].map((service) => {
                // Handle 1% = 1€ rule - extract percentage from name if present
                const percentMatch = service.name.match(/(\d+)%/);
                const calculatedPrice = percentMatch 
                  ? parseInt(percentMatch[1]) 
                  : Number(service.price);

                return (
                  <button
                    key={service.id}
                    onClick={() => handleServiceClick(service)}
                    disabled={readOnly}
                    className={`glass rounded-lg p-5 text-left transition-all border border-white/10 ${
                      readOnly
                        ? 'cursor-default opacity-75'
                        : 'hover:bg-white/10 hover:border-[#00d2ff]/50 neon-glow cursor-pointer active:scale-95'
                    } min-h-[100px] md:min-h-[120px] flex flex-col justify-between touch-manipulation`}
                  >
                    <div>
                      <div className="font-medium text-white text-sm md:text-base mb-1">
                        {service.name}
                      </div>
                    </div>
                    <div className="text-[#00d2ff] font-semibold text-sm md:text-base mt-2">
                      €{calculatedPrice.toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedService && !readOnly && (
        <LogEntryModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          service={selectedService}
          clientId={clientId}
          monthKey={monthKey}
        />
      )}
    </>
  );
}
