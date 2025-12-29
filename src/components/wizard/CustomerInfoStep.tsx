import { useState } from 'react';
import { User, Mail } from 'lucide-react';

interface CustomerInfoStepProps {
  data: { name: string; email: string };
  onUpdate: (data: { name: string; email: string }) => void;
  onNext: () => void;
}

const CustomerInfoStep = ({ data, onUpdate, onNext }: CustomerInfoStepProps) => {
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const validateAndNext = () => {
    const newErrors: { name?: string; email?: string } = {};
    
    if (!data.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!data.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  return (
    <div className="animate-fadeIn">
      <h2 className="text-2xl font-bold mb-2">Customer Information</h2>
      <p className="text-muted-foreground mb-8">Please provide your contact details</p>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={data.name}
              onChange={(e) => onUpdate({ ...data, name: e.target.value })}
              placeholder="John Doe"
              className={`input-field w-full pl-12 ${errors.name ? 'border-destructive' : ''}`}
            />
          </div>
          {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              value={data.email}
              onChange={(e) => onUpdate({ ...data, email: e.target.value })}
              placeholder="john@example.com"
              className={`input-field w-full pl-12 ${errors.email ? 'border-destructive' : ''}`}
            />
          </div>
          {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
        <button onClick={validateAndNext} className="btn-primary">
          Continue
        </button>
      </div>
    </div>
  );
};

export default CustomerInfoStep;
