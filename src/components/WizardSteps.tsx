import { Check } from 'lucide-react';

interface WizardStepsProps {
  currentStep: number;
  steps: string[];
}

const WizardSteps = ({ currentStep, steps }: WizardStepsProps) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`
              flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all duration-300
              ${index < currentStep 
                ? 'bg-primary text-primary-foreground' 
                : index === currentStep 
                  ? 'bg-primary/20 text-primary border-2 border-primary animate-pulse-glow' 
                  : 'bg-secondary text-muted-foreground border border-border'
              }
            `}
          >
            {index < currentStep ? (
              <Check className="w-5 h-5" />
            ) : (
              index + 1
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`
                w-12 md:w-20 h-0.5 mx-2 transition-all duration-500
                ${index < currentStep ? 'bg-primary' : 'bg-border'}
              `}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default WizardSteps;
