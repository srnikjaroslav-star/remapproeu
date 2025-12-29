import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Clock, Car, ChevronRight, Gauge, Settings } from 'lucide-react';
import Logo from '@/components/Logo';

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/track" className="text-muted-foreground hover:text-foreground transition-colors">
              Track Order
            </Link>
            <Link to="/management-portal" className="text-muted-foreground hover:text-foreground transition-colors">
              Admin
            </Link>
            <Link to="/order" className="btn-primary">
              Order Now
            </Link>
          </nav>
          <Link to="/order" className="md:hidden btn-primary py-2 text-sm">
            Order
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-8 animate-fadeIn">
            <Zap className="w-4 h-4" />
            Professional ECU Tuning Services
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            Unlock Your Vehicle's
            <br />
            <span className="neon-text">True Performance</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            Expert ECU remapping and tuning solutions. Increase power, improve fuel efficiency, 
            and optimize your driving experience with our professional services.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <Link to="/order" className="btn-primary flex items-center gap-2 text-lg">
              Start Your Order
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/track" className="btn-secondary flex items-center gap-2">
              Track Existing Order
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card-hover p-8">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Gauge className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Performance Gains</h3>
              <p className="text-muted-foreground">
                Unlock up to 30% more power and torque from your engine with our Stage 1 tuning solutions.
              </p>
            </div>
            
            <div className="glass-card-hover p-8">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Safe & Reliable</h3>
              <p className="text-muted-foreground">
                All tunes are tested and validated to ensure engine safety while maximizing performance.
              </p>
            </div>
            
            <div className="glass-card-hover p-8">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Fast Turnaround</h3>
              <p className="text-muted-foreground">
                Most tuning files are delivered within 2-4 hours. Track your order status in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="relative py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Comprehensive tuning solutions for all vehicle types and requirements
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
            {['Stage 1 Tuning', 'DPF Removal', 'EGR Delete', 'AdBlue Off', 'TCU Tuning', 'Pop & Bang'].map((service, idx) => (
              <div 
                key={service}
                className="glass-card p-4 text-center hover:border-primary/50 transition-all duration-300"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <Settings className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">{service}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/order" className="btn-primary inline-flex items-center gap-2">
              View All Services
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="glass-card p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
            <div className="relative">
              <Car className="w-16 h-16 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Ride?</h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Start your order now and experience the difference professional ECU tuning can make.
              </p>
              <Link to="/order" className="btn-primary inline-flex items-center gap-2 text-lg">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/50 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} REMAPPRO. Professional ECU Tuning Services.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/track" className="hover:text-foreground transition-colors">Track Order</Link>
            <Link to="/management-portal" className="hover:text-foreground transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
