import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Terms & Conditions</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. General Terms</h2>
            <p>
              By using REMAPPRO services, you agree to these terms and conditions. Our ECU tuning 
              services are provided "as is" and are intended for off-road or competition use only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Service Description</h2>
            <p>
              REMAPPRO provides ECU remapping and tuning file services. We modify vehicle ECU 
              software to optimize performance based on customer specifications. All modifications 
              are performed by qualified engineers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Customer Responsibilities</h2>
            <p>
              Customers are responsible for ensuring that modifications comply with local laws 
              and regulations. Use of our services for road vehicles may void manufacturer 
              warranties and could be illegal in some jurisdictions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Payment & Refunds</h2>
            <p>
              Payment is required before service delivery. Refunds may be provided at our 
              discretion if the service cannot be completed. Once a tuning file has been 
              delivered, refunds are generally not available.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Liability</h2>
            <p>
              REMAPPRO is not liable for any damage, mechanical failure, or legal consequences 
              resulting from the use of our tuning services. By using our services, you accept 
              full responsibility for any modifications made to your vehicle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Intellectual Property</h2>
            <p>
              All tuning files and software provided by REMAPPRO remain our intellectual property. 
              Files are licensed for use on the specified vehicle only and may not be redistributed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Contact</h2>
            <p>
              For questions regarding these terms, please contact us at{' '}
              <a href="mailto:info@remappro.eu" className="text-primary hover:underline">
                info@remappro.eu
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default TermsPage;
