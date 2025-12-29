import { useState } from 'react';
import { Car, Fuel, Calendar, Cpu } from 'lucide-react';
import { CAR_BRANDS, ECU_TYPES, FUEL_TYPES, YEARS } from '@/data/services';

interface VehicleData {
  brand: string;
  model: string;
  fuelType: string;
  year: number;
  ecuType: string;
}

interface VehicleSpecsStepProps {
  data: VehicleData;
  onUpdate: (data: VehicleData) => void;
  onNext: () => void;
  onBack: () => void;
}

const VehicleSpecsStep = ({ data, onUpdate, onNext, onBack }: VehicleSpecsStepProps) => {
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleData, string>>>({});

  const validateAndNext = () => {
    const newErrors: Partial<Record<keyof VehicleData, string>> = {};
    
    if (!data.brand) newErrors.brand = 'Brand is required';
    if (!data.model.trim()) newErrors.model = 'Model is required';
    if (!data.fuelType) newErrors.fuelType = 'Fuel type is required';
    if (!data.year) newErrors.year = 'Year is required';
    if (!data.ecuType) newErrors.ecuType = 'ECU type is required';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  return (
    <div className="animate-fadeIn">
      <h2 className="text-2xl font-bold mb-2">Vehicle Specifications</h2>
      <p className="text-muted-foreground mb-8">Enter your vehicle details for accurate tuning</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            <Car className="w-4 h-4 inline mr-2" />
            Brand
          </label>
          <select
            value={data.brand}
            onChange={(e) => onUpdate({ ...data, brand: e.target.value })}
            className={`input-field w-full ${errors.brand ? 'border-destructive' : ''}`}
          >
            <option value="">Select brand</option>
            {CAR_BRANDS.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
          {errors.brand && <p className="text-destructive text-sm mt-1">{errors.brand}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            <Car className="w-4 h-4 inline mr-2" />
            Model
          </label>
          <input
            type="text"
            value={data.model}
            onChange={(e) => onUpdate({ ...data, model: e.target.value })}
            placeholder="e.g., A4 2.0 TDI"
            className={`input-field w-full ${errors.model ? 'border-destructive' : ''}`}
          />
          {errors.model && <p className="text-destructive text-sm mt-1">{errors.model}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            <Fuel className="w-4 h-4 inline mr-2" />
            Fuel Type
          </label>
          <div className="flex gap-4">
            {FUEL_TYPES.map((fuel) => (
              <button
                key={fuel}
                type="button"
                onClick={() => onUpdate({ ...data, fuelType: fuel })}
                className={`
                  flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 border
                  ${data.fuelType === fuel 
                    ? 'bg-primary/20 border-primary text-primary' 
                    : 'bg-secondary border-border text-muted-foreground hover:border-primary/50'
                  }
                `}
              >
                {fuel}
              </button>
            ))}
          </div>
          {errors.fuelType && <p className="text-destructive text-sm mt-1">{errors.fuelType}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            <Calendar className="w-4 h-4 inline mr-2" />
            Year of Manufacture
          </label>
          <select
            value={data.year || ''}
            onChange={(e) => onUpdate({ ...data, year: parseInt(e.target.value) })}
            className={`input-field w-full ${errors.year ? 'border-destructive' : ''}`}
          >
            <option value="">Select year</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          {errors.year && <p className="text-destructive text-sm mt-1">{errors.year}</p>}
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">
            <Cpu className="w-4 h-4 inline mr-2" />
            ECU Type
          </label>
          <select
            value={data.ecuType}
            onChange={(e) => onUpdate({ ...data, ecuType: e.target.value })}
            className={`input-field w-full ${errors.ecuType ? 'border-destructive' : ''}`}
          >
            <option value="">Select ECU type</option>
            {ECU_TYPES.map((ecu) => (
              <option key={ecu} value={ecu}>{ecu}</option>
            ))}
          </select>
          {errors.ecuType && <p className="text-destructive text-sm mt-1">{errors.ecuType}</p>}
        </div>
      </div>
      
      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="btn-secondary">
          Back
        </button>
        <button onClick={validateAndNext} className="btn-primary">
          Continue
        </button>
      </div>
    </div>
  );
};

export default VehicleSpecsStep;
