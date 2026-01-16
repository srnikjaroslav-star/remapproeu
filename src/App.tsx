import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import OrderPage from "./pages/OrderPage";
// OPRAVENÝ IMPORT: Mieri priamo na súbor v pages
import TrackPage from "./pages/TrackPage";
import ManagementPortal from "./pages/ManagementPortal";
import Login from "./pages/Login";
import PricingPage from "./pages/PricingPage";
import SuccessPage from "./pages/SuccessPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import RefundsPage from "./pages/RefundsPage";
import AboutPage from "./pages/AboutPage";
import ServiceDetail from "./pages/ServiceDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          {/* Domovská stránka */}
          <Route path="/" element={<Index />} />

          {/* Stránka pre novú objednávku */}
          <Route path="/order" element={<OrderPage />} />

          {/* TRACKING: Toto je kľúčová cesta pre tvoj link z emailu */}
          <Route path="/track" element={<TrackPage />} />

          {/* Ostatné systémové stránky */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/sprava-29-vk" element={<ManagementPortal />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/refunds" element={<RefundsPage />} />

          {/* Service Detail Pages - Dynamic Routing */}
          <Route path="/services/:serviceSlug" element={<ServiceDetail />} />
          <Route path="/service/:serviceSlug" element={<Index />} />

          {/* 404 - Stránka nenájdená */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
