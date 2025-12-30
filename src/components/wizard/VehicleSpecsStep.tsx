import { useState } from 'react';
import { Car, Fuel, Calendar, Cpu, Gauge, Zap } from 'lucide-react';

interface VehicleData {
  brand: string;
  model: string;
  fuelType: string;
  year: number;
  ecuType: string;
  engineDisplacement?: string;
  enginePower?: string;
}

interface VehicleSpecsStepProps {
  data: VehicleData;
  onUpdate: (data: VehicleData) => void;
  onNext: () => void;
  onBack?: () => void;
}

const VehicleSpecsStep = ({ data, onUpdate, onNext }: VehicleSpecsStepProps) => {
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleData, string>>>({});

  const isFieldFilled = (value: string | number | undefined) => {
    if (typeof value === 'number') return value > 0;
    return value && value.trim().length > 0;
  };

  // Clear error for a specific field when it becomes valid
  const handleFieldChange = (field: keyof VehicleData, value: string | number) => {
    const newData = { ...data, [field]: value };
    onUpdate(newData);
    
    // Real-time validation: clear error immediately when field has content
    if (errors[field]) {
      const fieldValue = field === 'year' ? value : value;
      if (typeof fieldValue === 'number' ? fieldValue > 0 : (fieldValue as string).trim().length > 0) {
        setErrors(prev => {
          const updated = { ...prev };
          delete updated[field];
          return updated;
        });
      }
    }
  };

  const getInputClassName = (fieldValue: string | number | undefined, hasError: boolean) => {
    if (hasError) return 'input-field w-full border-destructive';
    if (isFieldFilled(fieldValue)) return 'input-field-active w-full';
    return 'input-field w-full';
  };

  const isFormComplete = 
    isFieldFilled(data.brand) &&
    isFieldFilled(data.model) &&
    isFieldFilled(data.engineDisplacement) &&
    isFieldFilled(data.enginePower) &&
    isFieldFilled(data.ecuType) &&
    isFieldFilled(data.year) &&
    isFieldFilled(data.fuelType);

  const validateAndNext = () => {
    const newErrors: Partial<Record<keyof VehicleData, string>> = {};
    
    if (!data.brand.trim()) newErrors.brand = 'Brand is required';
    if (!data.model.trim()) newErrors.model = 'Model is required';
    if (!data.engineDisplacement?.trim()) newErrors.engineDisplacement = 'Engine displacement is required';
    if (!data.enginePower?.trim()) newErrors.enginePower = 'Engine power is required';
    if (!data.ecuType.trim()) newErrors.ecuType = 'ECU type is required';
    if (!data.year) newErrors.year = 'Year is required';
    if (!data.fuelType) newErrors.fuelType = 'Fuel type is required';
    
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
        {/* Brand */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Car className="w-4 h-4 inline mr-2" />
            Brand (Značka)
          </label>
          <input
            type="text"
            value={data.brand}
            onChange={(e) => handleFieldChange('brand', e.target.value)}
            placeholder="e.g., Audi, BMW, Mercedes"
            className={getInputClassName(data.brand, !!errors.brand)}
          />
          {errors.brand && <p className="text-destructive text-sm mt-1">{errors.brand}</p>}
        </div>
        
        {/* Model */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Car className="w-4 h-4 inline mr-2" />
            Model (Model)
          </label>
          <input
            type="text"
            value={data.model}
            onChange={(e) => handleFieldChange('model', e.target.value)}
            placeholder="e.g., A4 2.0 TDI"
            className={getInputClassName(data.model, !!errors.model)}
          />
          {errors.model && <p className="text-destructive text-sm mt-1">{errors.model}</p>}
        </div>
        
        {/* Engine Displacement */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Gauge className="w-4 h-4 inline mr-2" />
            Engine Displacement (Obsah motora)
          </label>
          <input
            type="text"
            value={data.engineDisplacement || ''}
            onChange={(e) => handleFieldChange('engineDisplacement', e.target.value)}
            placeholder="e.g., 2.0, 3.0"
            className={getInputClassName(data.engineDisplacement, !!errors.engineDisplacement)}
          />
          {errors.engineDisplacement && <p className="text-destructive text-sm mt-1">{errors.engineDisplacement}</p>}
        </div>
        
        {/* Engine Power */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Zap className="w-4 h-4 inline mr-2" />
            Engine Power in kW (Výkon motora v kW)
          </label>
          <input
            type="text"
            value={data.enginePower || ''}
            onChange={(e) => handleFieldChange('enginePower', e.target.value)}
            placeholder="e.g., 110, 150"
            className={getInputClassName(data.enginePower, !!errors.enginePower)}
          />
          {errors.enginePower && <p className="text-destructive text-sm mt-1">{errors.enginePower}</p>}
        </div>
        
        {/* ECU Type */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Cpu className="w-4 h-4 inline mr-2" />
            ECU Type (Typ riadiacej jednotky)
          </label>
          <input
            type="text"
            value={data.ecuType}
            onChange={(e) => handleFieldChange('ecuType', e.target.value)}
            placeholder="e.g., Bosch EDC17, Siemens PCR2.1"
            className={getInputClassName(data.ecuType, !!errors.ecuType)}
          />
          {errors.ecuType && <p className="text-destructive text-sm mt-1">{errors.ecuType}</p>}
        </div>
        
        {/* Year */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Calendar className="w-4 h-4 inline mr-2" />
            Year of Manufacture (Rok výroby)
          </label>
          <input
            type="text"
            value={data.year || ''}
            onChange={(e) => handleFieldChange('year', parseInt(e.target.value) || 0)}
            placeholder="e.g., 2019"
            className={getInputClassName(data.year, !!errors.year)}
          />
          {errors.year && <p className="text-destructive text-sm mt-1">{errors.year}</p>}
        </div>
        
        {/* Fuel Type Toggle */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">
            <Fuel className="w-4 h-4 inline mr-2" />
            Fuel Type (Typ paliva)
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                handleFieldChange('fuelType', 'Diesel');
              }}
              className={`
                flex-1 py-3 px-6 font-medium transition-all duration-300
                ${data.fuelType === 'Diesel' 
                  ? 'interactive-active text-foreground' 
                  : 'interactive-idle text-muted-foreground hover:border-primary/50'
                }
              `}
            >
              Diesel
            </button>
            <button
              type="button"
              onClick={() => {
                handleFieldChange('fuelType', 'Petrol');
              }}
              className={`
                flex-1 py-3 px-6 font-medium transition-all duration-300
                ${data.fuelType === 'Petrol' 
                  ? 'interactive-active text-foreground' 
                  : 'interactive-idle text-muted-foreground hover:border-primary/50'
                }
              `}
            >
              Petrol
            </button>
          </div>
          {errors.fuelType && <p className="text-destructive text-sm mt-1">{errors.fuelType}</p>}
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
        <button 
          onClick={validateAndNext} 
          className={`btn-primary transition-all duration-300 ${
            isFormComplete 
              ? 'shadow-[0_0_30px_hsl(185_100%_50%/0.5)] animate-glow' 
              : 'opacity-70'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default VehicleSpecsStep;
