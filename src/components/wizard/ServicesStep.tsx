import { Check } from 'lucide-react';
import { SERVICES, Service } from '@/data/services';

interface ServicesStepProps {
  selectedServices: string[];
  onUpdate: (services: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const ServicesStep = ({ selectedServices, onUpdate, onNext, onBack }: ServicesStepProps) => {
  const toggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      onUpdate(selectedServices.filter((id) => id !== serviceId));
    } else {
      onUpdate([...selectedServices, serviceId]);
    }
  };

  const totalPrice = selectedServices.reduce((total, id) => {
    const service = SERVICES.find((s) => s.id === id);
    return total + (service?.price || 0);
  }, 0);

  const stageServices = SERVICES.filter((s) => s.category === 'stage');
  const removalServices = SERVICES.filter((s) => s.category === 'removal');
  const modificationServices = SERVICES.filter((s) => s.category === 'modification');

  const renderServiceCard = (service: Service) => (
    <button
      key={service.id}
      type="button"
      onClick={() => toggleService(service.id)}
      className={`
        service-card flex items-center justify-between w-full text-left
        ${selectedServices.includes(service.id) ? 'service-card-selected' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-300
            ${selectedServices.includes(service.id) 
              ? 'bg-primary border-primary' 
              : 'border-muted-foreground'
            }
          `}
        >
          {selectedServices.includes(service.id) && (
            <Check className="w-3 h-3 text-primary-foreground" />
          )}
        </div>
        <span className="font-medium">{service.name}</span>
      </div>
      <span className="text-primary font-semibold">{service.price}€</span>
    </button>
  );

  return (
    <div className="animate-fadeIn">
      <h2 className="text-2xl font-bold mb-2">Select Services</h2>
      <p className="text-muted-foreground mb-8">Choose the tuning services you need</p>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-primary">Stage Tuning</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stageServices.map(renderServiceCard)}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4 text-primary">Removal Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {removalServices.map(renderServiceCard)}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4 text-primary">Modifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modificationServices.map(renderServiceCard)}
          </div>
        </div>
      </div>
      
      <div className="mt-8 glass-card p-6 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Total Price</p>
          <p className="text-3xl font-bold neon-text">{totalPrice}€</p>
        </div>
        <div className="text-right text-muted-foreground text-sm">
          {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
        </div>
      </div>
      
      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="btn-secondary">
          Back
        </button>
        <button 
          onClick={onNext} 
          disabled={selectedServices.length === 0}
          className={`btn-primary ${selectedServices.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ServicesStep;
