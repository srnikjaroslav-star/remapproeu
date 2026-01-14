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
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Zap, Shield, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import SystemStatus from '@/components/SystemStatus';
import Footer from '@/components/Footer';

const WIZARD_STEPS = ['Vehicle', 'Services & Upload', 'Contact'];

interface FormData {
  customer: { name: string; email: string };
  vehicle: { brand: string; model: string; fuelType: string; year: number; ecuType: string; engineDisplacement?: string; enginePower?: string };
  services: string[];
  selectedFile: File | null;
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
    selectedFile: null,
    customerNote: '',
  });

  const totalPrice = formData.services.reduce((total, id) => {
    const service = SERVICES.find((s) => s.id === id);
    return total + (service?.price || 0);
  }, 0);

  // Get all selected service items for Stripe checkout
  const getSelectedServiceItems = () => {
    return formData.services
      .map((id) => SERVICES.find((s) => s.id === id))
      .filter((service): service is (typeof SERVICES)[number] => Boolean(service))
      .map((service) => ({ name: service.name, price: service.price }));
  };

  const handleSubmit = async (legalConsentAgreed: boolean) => {
    setIsSubmitting(true);
    
    try {
      const items = getSelectedServiceItems();

      if (items.length === 0) {
        toast.error('Please select at least one service');
        setIsSubmitting(false);
        return;
      }

      if (!formData.selectedFile) {
        toast.error('Please select a file to upload');
        setIsSubmitting(false);
        return;
      }

      // STEP 1: Upload file FIRST before creating order
      console.log('[OrderPage] Odosielam dáta:', {
        fuel: formData.vehicle.fuelType,
        year: formData.vehicle.year,
        file: formData.selectedFile?.name,
        vehicle: formData.vehicle,
      });
      
      toast.loading('Uploading file...', { id: 'upload' });
      const fileName = `${Date.now()}-${formData.selectedFile.name}`;
      
      console.log('[OrderPage] Uploading file:', fileName);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tunes')
        .upload(fileName, formData.selectedFile);

      if (uploadError) {
        console.error('[OrderPage] File upload error:', uploadError);
        toast.dismiss('upload');
        toast.error(`File upload failed: ${uploadError.message}`);
        setIsSubmitting(false);
        return;
      }

      // Get the file name from upload response (data.path) - WAIT for result
      if (!uploadData || !uploadData.path) {
        console.error('[OrderPage] Upload data missing:', { uploadData, error: uploadError });
        toast.dismiss('upload');
        toast.error('File upload failed: No data returned');
        setIsSubmitting(false);
        return;
      }

      const uploadedFileName = uploadData.path;
      console.log('[OrderPage] File uploaded successfully:', uploadedFileName);
      toast.dismiss('upload');
      toast.success('File uploaded successfully');

      // Generate unique order ID
      const orderId = generateOrderId();

      // Store form data in sessionStorage for after payment
      sessionStorage.setItem('pendingOrder', JSON.stringify({
        orderId,
        customer: formData.customer,
        vehicle: formData.vehicle,
        services: formData.services,
        fileUrl: uploadedFileName,
        customerNote: formData.customerNote,
        totalPrice,
        legalConsent: legalConsentAgreed,
      }));

      // STEP 2: Redirect to Stripe checkout with file name (not full URL)
      // CRITICAL: Check vehicleData before sending
      console.log('[OrderPage] Dáta pred platbou:', {
        vehicleData: formData.vehicle,
        brand: formData.vehicle.brand,
        model: formData.vehicle.model,
        fuelType: formData.vehicle.fuelType,
        year: formData.vehicle.year,
        fileUrl: uploadedFileName,
      });
      
      // Verify vehicleData is not empty
      if (!formData.vehicle || !formData.vehicle.brand || !formData.vehicle.model) {
        console.error('[OrderPage] ERROR: Vehicle data is incomplete!', formData.vehicle);
        toast.error('Vehicle data is incomplete. Please fill all fields.');
        setIsSubmitting(false);
        return;
      }
      
      // Verify uploadedFileName is not lost
      if (!uploadedFileName) {
        console.error('[OrderPage] ERROR: uploadedFileName is missing!');
        toast.error('File name is missing. Cannot proceed.');
        setIsSubmitting(false);
        return;
      }
      
      // CRITICAL: Verify year value is real, not empty
      console.log('[OrderPage] Redirecting to checkout with:', {
        vehicle: formData.vehicle,
        'vehicle.year (raw)': formData.vehicle.year,
        'vehicle.year (type)': typeof formData.vehicle.year,
        fileUrl: uploadedFileName,
        fuelType: formData.vehicle.fuelType,
        year: formData.vehicle.year,
      });
      
      // Verify year is a real value from form
      if (!formData.vehicle.year || formData.vehicle.year === 0) {
        console.error('[OrderPage] ERROR: Year is missing or zero!', formData.vehicle);
        toast.error('Year is required. Please enter a valid year.');
        setIsSubmitting(false);
        return;
      }
      
      await redirectToCheckout({
        items,
        orderId,
        customerEmail: formData.customer.email,
        customerName: formData.customer.name,
        customerNote: formData.customerNote,
        vehicle: formData.vehicle, // Contains real year value from form
        fileUrl: uploadedFileName, // Send only file name - MUST be preserved
        services: formData.services,
      });
    } catch (error: any) {
      console.error('[OrderPage] Payment error:', error);
      const errorMessage = error?.message || 'Payment initialization failed. Please try again.';
      toast.error(errorMessage);
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
            onFileSelected={(file) => setFormData({ ...formData, selectedFile: file })}
            selectedFile={formData.selectedFile}
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

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default OrderPage;
