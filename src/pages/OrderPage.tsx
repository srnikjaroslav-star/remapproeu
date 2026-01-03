import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import WizardSteps from '@/components/WizardSteps';
import VehicleSpecsStep from '@/components/wizard/VehicleSpecsStep';
import ServicesFileStep from '@/components/wizard/ServicesFileStep';
import ContactSubmitStep from '@/components/wizard/ContactSubmitStep';
import { SERVICES } from '@/data/services';
import { redirectToCheckout, generateOrderId } from '@/lib/stripe';
import { ArrowLeft, Zap, Shield, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import SystemStatus from '@/components/SystemStatus';

const WIZARD_STEPS = ['Vehicle', 'Services & Upload', 'Contact'];

interface FormData {
  customer: { name: string; email: string };
  vehicle: { brand: string; model: string; fuelType: string; year: number; ecuType: string; engineDisplacement?: string; enginePower?: string };
  services: string[];
  fileUrl: string;
  customerNote: string;
}

const OrderPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    customer: { name: '', email: '' },
    vehicle: { brand: '', model: '', fuelType: '', year: 0, ecuType: '', engineDisplacement: '', enginePower: '' },
    services: [],
    fileUrl: '',
    customerNote: '',
  });

  const totalPrice = formData.services.reduce((total, id) => {
    const service = SERVICES.find((s) => s.id === id);
    return total + (service?.price || 0);
  }, 0);

  // Get all selected services with their names and prices (for dynamic Stripe pricing)
  const getSelectedServices = () => {
    return formData.services
      .map(id => {
        const service = SERVICES.find(s => s.id === id);
        if (service) {
          return {
            name: service.name,
            price: service.price
          };
        }
        return null;
      })
      .filter((s): s is { name: string; price: number } => s !== null);
  };

  const handleSubmit = async (legalConsentAgreed: boolean) => {
    setIsSubmitting(true);
    
    try {
      const services = getSelectedServices();
      
      if (services.length === 0) {
        toast.error('Please select at least one service');
        setIsSubmitting(false);
        return;
      }

      // Generate unique order ID
      const orderId = generateOrderId();
      
      // Store form data in sessionStorage for after payment
      sessionStorage.setItem('pendingOrder', JSON.stringify({
        orderId,
        customer: formData.customer,
        vehicle: formData.vehicle,
        services: formData.services,
        fileUrl: formData.fileUrl,
        customerNote: formData.customerNote,
        totalPrice,
        legalConsent: legalConsentAgreed,
      }));

      // Redirect to Stripe checkout with all services
      await redirectToCheckout({
        services,
        orderId,
        customerEmail: formData.customer.email,
        customerNote: formData.customerNote,
      });
      
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Payment initialization failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <VehicleSpecsStep
            data={formData.vehicle}
            onUpdate={(vehicle) => setFormData({ ...formData, vehicle })}
            onNext={() => setCurrentStep(1)}
            onBack={() => navigate('/')}
          />
        );
      case 1:
        return (
          <ServicesFileStep
            selectedServices={formData.services}
            onServicesUpdate={(services) => setFormData({ ...formData, services })}
            onFileUploaded={(url) => setFormData({ ...formData, fileUrl: url })}
            fileUrl={formData.fileUrl}
            customerNote={formData.customerNote}
            onCustomerNoteUpdate={(note) => setFormData({ ...formData, customerNote: note })}
            onNext={() => setCurrentStep(2)}
            onBack={() => setCurrentStep(0)}
          />
        );
      case 2:
        return (
          <ContactSubmitStep
            data={formData.customer}
            onUpdate={(customer) => setFormData({ ...formData, customer })}
            onBack={() => setCurrentStep(1)}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            totalPrice={totalPrice}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            <Logo size="sm" />
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <SystemStatus />
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Fast Delivery
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Secure Process
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              24/7 Support
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <WizardSteps currentStep={currentStep} steps={WIZARD_STEPS} />
        
        <div className="glass-card p-8 md:p-12">
          {renderStep()}
        </div>
      </main>
    </div>
  );
};

export default OrderPage;
