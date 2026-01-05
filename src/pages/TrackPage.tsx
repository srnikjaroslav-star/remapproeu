import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, ArrowLeft, CheckCircle2, Clock, Zap } from "lucide-react";

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
      if (!data) throw new Error("Order not found.");
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
      <p className="font-mono tracking-widest uppercase italic font-bold">Verifying ECU Access...</p>
    </div>
  );

  const currentStep = order ? getStatusStep(order.status) : 1;

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center font-sans">
      <button onClick={() => navigate('/')} className="absolute top-10 left-10 text-zinc-500 hover:text-white flex items-center gap-2 transition-colors">
        <ArrowLeft size={20} /> <span className="uppercase text-[10px] font-bold tracking-widest">Back</span>
      </button>

      {order ? (
        <div className="w-full max-w-md bg-[#0f1115] border-2 border-[#00eeee]/30 rounded-[32px] p-10 shadow-[0_0_60px_rgba(0,238,238,0.2)]">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-[#00eeee] font-black italic text-2xl uppercase tracking-tighter italic">Live Tracking</h2>
            <div className="px-3 py-1 bg-[#00eeee]/10 border border-[#00eeee]/20 rounded-full">
              <span className