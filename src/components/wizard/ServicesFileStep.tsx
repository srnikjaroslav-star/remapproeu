import { useState, useRef } from 'react';
import { Check, Upload, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { SERVICES, Service } from '@/data/services';
import { supabase } from '@/integrations/supabase/client';

interface ServicesFileStepProps {
  selectedServices: string[];
  onServicesUpdate: (services: string[]) => void;
  onFileUploaded: (url: string) => void;
  fileUrl: string;
  onNext: () => void;
  onBack: () => void;
}

const ServicesFileStep = ({ 
  selectedServices, 
  onServicesUpdate, 
  onFileUploaded,
  fileUrl,
  onNext, 
  onBack 
}: ServicesFileStepProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(!!fileUrl);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      onServicesUpdate(selectedServices.filter((id) => id !== serviceId));
    } else {
      onServicesUpdate([...selectedServices, serviceId]);
    }
  };

  const totalPrice = selectedServices.reduce((total, id) => {
    const service = SERVICES.find((s) => s.id === id);
    return total + (service?.price || 0);
  }, 0);

  const stageServices = SERVICES.filter((s) => s.category === 'stage');
  const removalServices = SERVICES.filter((s) => s.category === 'removal');
  const modificationServices = SERVICES.filter((s) => s.category === 'modification');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const fileName = `${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('tunes')
        .upload(fileName, selectedFile);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tunes')
        .getPublicUrl(fileName);

      setUploadProgress(100);
      setUploadComplete(true);
      onFileUploaded(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

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

  const canContinue = selectedServices.length > 0 && uploadComplete;

  return (
    <div className="animate-fadeIn">
      <h2 className="text-2xl font-bold mb-2">Select Services & Upload File</h2>
      <p className="text-muted-foreground mb-8">Choose tuning services and upload your ECU file</p>
      
      {/* Services Selection */}
      <div className="space-y-6 mb-8">
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
          {/* Off-Road Disclaimer */}
          <div className="mt-4 p-4 border border-amber-500/40 bg-amber-500/10 rounded-lg">
            <p className="text-sm text-amber-200">
              <strong>⚠️ Notice:</strong> Modifications like DPF/EGR/AdBlue OFF are intended for off-road use, racing, or export to countries where these systems are not legally required. Use on public roads may be illegal in your jurisdiction.
            </p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4 text-primary">Modifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modificationServices.map(renderServiceCard)}
          </div>
        </div>
      </div>

      {/* Price Summary */}
      <div className="glass-card p-6 flex items-center justify-between mb-8">
        <div>
          <p className="text-muted-foreground text-sm">Total Price</p>
          <p className="text-3xl font-bold neon-text">{totalPrice}€</p>
        </div>
        <div className="text-right text-muted-foreground text-sm">
          {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
        </div>
      </div>

      {/* File Upload */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-primary">Upload ECU File</h3>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`
            p-8 cursor-pointer transition-all duration-300 rounded-xl
            flex flex-col items-center justify-center text-center
            ${uploadComplete 
              ? 'bg-green-500/10 border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
              : 'interactive-idle border-dashed hover:border-primary/60'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".bin,.ori,.mod,.ecu"
          />
          
          {uploading ? (
            <div className="w-full max-w-xs">
              <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
              <p className="font-medium mb-2">Uploading...</p>
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">{uploadProgress}%</p>
            </div>
          ) : uploadComplete ? (
            <>
              <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
              <p className="font-medium text-green-500 mb-2">Upload Complete!</p>
              {file && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <File className="w-4 h-4" />
                  <span className="text-sm">{file.name}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-primary mb-3" />
              <p className="font-medium mb-2">Click to upload your ECU file</p>
              <p className="text-sm text-muted-foreground">
                Supported formats: .bin, .ori, .mod, .ecu
              </p>
            </>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-3 text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>
      
      <div className="flex justify-between">
        <button onClick={onBack} className="btn-secondary">
          Back
        </button>
        <button 
          onClick={onNext} 
          disabled={!canContinue}
          className={`btn-primary ${
            canContinue 
              ? 'shadow-[0_0_30px_hsl(185_100%_50%/0.5)] animate-glow' 
              : 'opacity-50 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ServicesFileStep;
