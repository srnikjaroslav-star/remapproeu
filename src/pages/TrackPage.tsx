import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, ArrowLeft, CheckCircle2, Circle, Clock } from "lucide-react";

const TrackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const urlId = searchParams.get("id");
  const urlEmail = searchParams.get("email");

  const fetchOrder = async (id: string, email: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", id.toUpperCase())
        .eq("customer_email", email.toLowerCase())
        .maybeSingle();

      if (dbError) throw dbError;
      if (!data) throw new Error("Objednávka nenájdená.");
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlId && urlEmail) {
      fetchOrder(urlId, urlEmail);
    }
  }, [urlId, urlEmail]);

  // Pomocná funkcia pre vizuálny progres
  const getStatusStep = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'paid' || s === 'pending') return 1;
    if (s === 'processing' || s === 'working') return 2;
    if (s === 'completed' || s === 'finished') return 3;
    return 1;
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-[#00eeee]">
      <Loader2 className="w-12 h-12 animate-spin mb-4" />
      <p className="font-mono tracking-widest uppercase italic">Verifikujem prístup...</p>
    </div>
  );

  const currentStep = order ? getStatusStep(order.status) : 1;

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center font-sans">
      <button onClick={() => navigate('/')} className="absolute top-10 left-10 text-zinc-500 hover:text-white flex items-center gap-2 transition-colors">
        <ArrowLeft size={20} /> <span className="uppercase text-xs font-bold tracking-widest">Domov</span>
      </button>

      {order ? (
        <div className="w-full max-w-md bg-[#0f1115] border-2 border-[#00eeee]/30 rounded-[32px] p-10 shadow-[0_0_60px_rgba(0,238,238,0.1)]">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-[#00eeee] font-black italic text-2xl uppercase tracking-tighter italic">Live Tracking</h2>
            <div className="px-4 py-1 bg-[#00eeee]/10 border border-[#00eeee]/20 rounded-full">
              <span className="text-[#00eeee] text-[10px] font-bold uppercase tracking-widest">{order.order_number}</span>
            </div>
          </div>

          {/* VIZUÁLNA ČASOVÁ OS (PROGRESS) */}
          <div className="relative mb-12 px-2">
            <div className="absolute top-5 left-8 right-8 h-0.5 bg-zinc-800" />
            <div 
              className="absolute top-5 left-8 h-0.5 bg-[#00eeee] transition-all duration-1000" 
              style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
            />
            
            <div className="relative flex justify-between">
              {/* Step 1: Paid */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${currentStep >= 1 ? 'bg-[#00eeee] text-black' : 'bg-zinc-900 text-zinc-600'}`}>
                  {currentStep > 1 ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                </div>
                <p className={`text-[10px] mt-3 font-bold uppercase tracking-widest ${currentStep >= 1 ? 'text-[#00eeee]' : 'text-zinc-600'}`}>Prijaté</p>
              </div>

              {/* Step 2: Processing */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${currentStep >= 2 ? 'bg-[#00eeee] text-black' : 'bg-zinc-900 text-zinc-600'}`}>
                  {currentStep > 2 ? <CheckCircle2 size={20} /> : <Loader2 size={20} className={currentStep === 2 ? "animate-spin" : ""} />}
                </div>
                <p className={`text-[10px] mt-3 font-bold uppercase tracking-widest ${currentStep >= 2 ? 'text-[#00eeee]' : 'text-zinc-600'}`}>Ladenie</p>
              </div>

              {/* Step 3: Completed */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${currentStep === 3 ? 'bg-[#00eeee] text-black' : 'bg-zinc-900 text-zinc-600'}`}>
                  <CheckCircle2 size={20} />
                </div>
                <p className={`text-[10px] mt-3 font-bold uppercase tracking-widest ${currentStep === 3 ? 'text-[#00eeee]' : 'text-zinc-600'}`}>Hotovo</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#16191d] p-5 rounded-2xl border border-white/5">
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1">Vozidlo</p>
              <p className="text-lg font-bold italic text-zinc-