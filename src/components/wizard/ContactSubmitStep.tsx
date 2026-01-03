import { useState } from 'react';
import { User, Mail, Loader2, AlertTriangle } from 'lucide-react';

interface ContactSubmitStepProps {
  data: { name: string; email: string };
  onUpdate: (data: { name: string; email: string }) => void;
  onBack: () => void;
  onSubmit: (legalConsentAgreed: boolean) => void;
  isSubmitting: boolean;
  totalPrice: number;
}

const ContactSubmitStep = ({ 
  data, 
  onUpdate, 
  onBack, 
  onSubmit, 
  isSubmitting,
  totalPrice 
}: ContactSubmitStepProps) => {
  const [errors, setErrors] = useState<{ name?: string; email?: string; consent?: string }>({});
  const [legalConsentAgreed, setLegalConsentAgreed] = useState(false);

  const validateAndSubmit = () => {
    const newErrors: { name?: string; email?: string; consent?: string } = {};
    
    if (!data.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!data.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!legalConsentAgreed) {
      newErrors.consent = 'You must agree to the terms and conditions';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onSubmit(legalConsentAgreed);
    }
  };

  return (
    <div className="animate-fadeIn">
      <h2 className="text-2xl font-bold mb-2">Contact Information</h2>
      <p className="text-muted-foreground mb-8">Enter your details to complete the order</p>
      
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

      {/* Order Summary */}
      <div className="mt-8 glass-card p-6">
        <h3 className="font-semibold mb-4">Order Summary</h3>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total to Pay</span>
          <span className="text-2xl font-bold neon-text">{totalPrice}€</span>
        </div>
      </div>

      {/* Legal Consent */}
      <div className="mt-6 space-y-4">
        {/* Non-refundable notice */}
        <div className="p-4 border border-amber-500/40 bg-amber-500/10 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200">
            <strong>Non-Refundable:</strong> Due to the nature of digital goods, all sales are final. 
            Under EU law (Directive 2011/83/EU), you lose your right of withdrawal once the service 
            has begun with your express consent. See our{' '}
            <a href="/refunds" target="_blank" className="text-amber-400 underline hover:text-amber-300">
              Refund Policy
            </a>.
          </p>
        </div>

        {/* Mandatory consent checkbox */}
        <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
          legalConsentAgreed 
            ? 'border-primary bg-primary/10' 
            : errors.consent 
              ? 'border-destructive bg-destructive/10' 
              : 'border-border/50 hover:border-primary/50'
        }`}>
          <input
            type="checkbox"
            checked={legalConsentAgreed}
            onChange={(e) => {
              setLegalConsentAgreed(e.target.checked);
              if (e.target.checked) {
                setErrors({ ...errors, consent: undefined });
              }
            }}
            className="mt-1 w-5 h-5 accent-primary"
          />
          <span className="text-sm text-muted-foreground leading-relaxed">
            I confirm that I have read and agree to the{' '}
            <a href="/terms" target="_blank" className="text-primary underline hover:text-primary/80">
              Terms &amp; Conditions
            </a>
            ,{' '}
            <a href="/privacy" target="_blank" className="text-primary underline hover:text-primary/80">
              Privacy Policy
            </a>
            , and{' '}
            <a href="/refunds" target="_blank" className="text-primary underline hover:text-primary/80">
              Refund Policy
            </a>
            . I acknowledge that some modifications (e.g., DPF/EGR/AdBlue removal) are strictly for{' '}
            <strong className="text-foreground">motorsport/off-road use only</strong> and I take full 
            responsibility for ensuring compliance with local laws.
          </span>
        </label>
        {errors.consent && <p className="text-destructive text-sm">{errors.consent}</p>}
      </div>
      
      <div className="mt-8 flex flex-col gap-2">
        <div className="flex justify-between">
          <button onClick={onBack} className="btn-secondary">
            Back
          </button>
          <button 
            onClick={validateAndSubmit} 
            disabled={isSubmitting}
            className={`btn-primary flex items-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Submitting...' : 'Submit Order'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-right">
          Zľavový kód môžete zadať v nasledujúcom kroku na stránke platby.
        </p>
      </div>
    </div>
  );
};

export default ContactSubmitStep;
