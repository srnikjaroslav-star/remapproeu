import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import WizardSteps from '@/components/WizardSteps';
import VehicleSpecsStep from '@/components/wizard/VehicleSpecsStep';
import ServicesFileStep from '@/components/wizard/ServicesFileStep';
import ContactSubmitStep from '@/components/wizard/ContactSubmitStep';
import { supabase, OrderInsert } from '@/integrations/supabase/client';
import { SERVICES } from '@/data/services';
import { ArrowLeft, Zap, Shield, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const WIZARD_STEPS = ['Vehicle', 'Services & Upload', 'Contact'];

interface FormData {
  customer: { name: string; email: string };
  vehicle: { brand: string; model: string; fuelType: string; year: number; ecuType: string };
  services: string[];
  fileUrl: string;
}

const OrderPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    customer: { name: '', email: '' },
    vehicle: { brand: '', model: '', fuelType: '', year: 0, ecuType: '' },
    services: [],
    fileUrl: '',
  });

  const totalPrice = formData.services.reduce((total, id) => {
    const service = SERVICES.find((s) => s.id === id);
    return total + (service?.price || 0);
  }, 0);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const orderData: OrderInsert = {
        customer_name: formData.customer.name,
        customer_email: formData.customer.email,
        car_brand: formData.vehicle.brand,
        car_model: formData.vehicle.model,
        fuel_type: formData.vehicle.fuelType,
        year: formData.vehicle.year,
        ecu_type: formData.vehicle.ecuType,
        service_type: formData.services,
        total_price: totalPrice,
        status: 'pending',
        file_url: formData.fileUrl,
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Order submitted successfully!');
      navigate(`/track?order=${data.id}`);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit order. Please try again.');
    } finally {
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
