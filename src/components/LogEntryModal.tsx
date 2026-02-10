'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createWorkLog } from '@/lib/supabase/queries';
import { Database } from '@/types/database';
import { toast } from 'sonner';

type Service = Database['public']['Tables']['services']['Row'];

interface LogEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service;
  clientId: string;
  monthKey: string;
}

export default function LogEntryModal({ 
  isOpen, 
  onClose, 
  service, 
  clientId,
  monthKey 
}: LogEntryModalProps) {
  const [carInfo, setCarInfo] = useState('');
  const [priceOverride, setPriceOverride] = useState<string>('');
  const [enablePriceOverride, setEnablePriceOverride] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Handle 1% = 1€ rule
  const percentMatch = service.name.match(/(\d+)%/);
  const defaultPrice = percentMatch ? parseInt(percentMatch[1]) : Number(service.price);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!carInfo.trim()) {
      toast.error('Prosím zadajte údaje o aute');
      return;
    }

    setIsSubmitting(true);

    try {
      const serviceItems = [{
        service_id: service.id,
        service_name: service.name,
        price: enablePriceOverride && priceOverride ? parseFloat(priceOverride) : defaultPrice,
      }];

      const totalPrice = serviceItems.reduce((sum, item) => sum + item.price, 0);

      await createWorkLog({
        client_id: clientId,
        car_info: carInfo.trim(),
        service_items: serviceItems,
        total_price: totalPrice,
        month_key: monthKey,
      });

      toast.success('Úkon bol úspešne zapísaný');
      
      // Reset form
      setCarInfo('');
      setPriceOverride('');
      setEnablePriceOverride(false);
      
      // Close modal and refresh
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error creating work log:', error);
      toast.error('Nepodarilo sa zapísať úkon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayPrice = enablePriceOverride && priceOverride 
    ? parseFloat(priceOverride) 
    : defaultPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Zapísať úkon</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 -mr-2"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-sm text-gray-400 mb-1">Service</div>
          <div className="text-lg font-semibold text-white">{service.name}</div>
          <div className="text-sm text-[#00d2ff] mt-1">Category: {service.category}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label htmlFor="carInfo" className="block text-sm font-medium text-gray-300 mb-2">
              Údaje o aute <span className="text-red-400">*</span>
            </label>
            <input
              id="carInfo"
              type="text"
              value={carInfo}
              onChange={(e) => setCarInfo(e.target.value)}
              placeholder="Napríklad: BMW X5 VIN..."
              required
              autoComplete="off"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d2ff]/50 focus:ring-2 focus:ring-[#00d2ff]/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="priceOverrideToggle" className="block text-sm font-medium text-gray-300">
                Price Override
              </label>
              <button
                type="button"
                onClick={() => {
                  setEnablePriceOverride(!enablePriceOverride);
                  if (enablePriceOverride) {
                    setPriceOverride('');
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enablePriceOverride ? 'bg-[#00d2ff]' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enablePriceOverride ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {enablePriceOverride && (
              <div className="space-y-2">
                <input
                  id="priceOverride"
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceOverride}
                  onChange={(e) => setPriceOverride(e.target.value)}
                  placeholder={`Default: €${defaultPrice}`}
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d2ff]/50 focus:ring-2 focus:ring-[#00d2ff]/20"
                />
                <div className="text-sm text-gray-400">
                  Default price: <span className="text-[#00d2ff]">€{defaultPrice.toFixed(2)}</span>
                  {priceOverride && (
                    <span className="ml-2">
                      → Override: <span className="text-[#00d2ff]">€{displayPrice.toFixed(2)}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {!enablePriceOverride && (
              <div className="text-sm text-gray-400 p-3 bg-white/5 rounded-lg border border-white/10">
                Default price: <span className="text-[#00d2ff] font-semibold">€{defaultPrice.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-all min-h-[48px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 border border-[#00d2ff]/50 rounded-lg text-[#00d2ff] font-medium transition-all neon-glow disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
            >
              {isSubmitting ? 'Ukladám...' : 'Zapísať úkon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
