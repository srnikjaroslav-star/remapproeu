import Logo from "./Logo";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border/50 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Contact */}
          <div className="space-y-4">
            <Logo />
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">REMAPPRO Digital Solutions</p>
              <a 
                href="mailto:info@remappro.eu" 
                className="block hover:text-primary transition-colors"
              >
                info@remappro.eu
              </a>
              <p>Slovakia, European Union</p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/" className="hover:text-primary transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="/pricing" className="hover:text-primary transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/order" className="hover:text-primary transition-colors">
                  Order
                </a>
              </li>
              <li>
                <a href="/track" className="hover:text-primary transition-colors">
                  Track Order
                </a>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Services</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/pricing" className="hover:text-primary transition-colors">
                  Stage 1 Tuning
                </a>
              </li>
              <li>
                <a href="/pricing" className="hover:text-primary transition-colors">
                  DPF/EGR Removal
                </a>
              </li>
              <li>
                <a href="/pricing" className="hover:text-primary transition-colors">
                  Pop &amp; Bangs
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/terms" className="hover:text-primary transition-colors">
                  Terms &amp; Conditions
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/refunds" className="hover:text-primary transition-colors">
                  Refund Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <p className="text-center text-sm text-muted-foreground">
            Copyright © 2026 REMAPPRO Digital Solutions. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
