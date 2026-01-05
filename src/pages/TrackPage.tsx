import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Clock, Zap, Home, ShieldCheck, Sparkles } from "lucide-react";

const TrackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  const id = searchParams.get("id");
  const email = searchParams.get("email");
  const brand = searchParams.get("brand") || "Vehicle";
  const model = searchParams.get("model") || "";

  useEffect(() => {
    if (!id || !email) {
      navigate("/");
      return;
    }

    const syncOrder = async () => {
      // Skúsime nájsť objednávku v DB
      const { data } = await supabase.from("orders").select("*").eq("order_number", id.toUpperCase()).maybeSingle();

      if (data) {
        setOrder(data);
      } else {
        // Fallback: Ak DB ešte nestihla zapísať, ukážeme dáta z URL
        setOrder({
          order_number: id.toUpperCase(),
          status: "paid",
          brand: brand,
          model: model,
        });
      }
      setLoading(false);
    };

    syncOrder();

    // Realtime odber zmien - keď admin zmení status v DB, stránka sa sama pohne
    const channel = supabase
      .channel("order_sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `order_number=eq.${id.toUpperCase()}` },
        (payload) => setOrder(payload.new),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, email, brand, model, navigate]);

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00eeee]" size={40} />
      </div>
    );

  const status = order.status?.toLowerCase();
  let step = 1;
  let accentColor = "#f59e0b"; // AMBER pre PAID

  if (status === "working" || status === "processing") {
    step = 2;
    accentColor = "#3b82f6"; // BLUE pre TUNING
  } else if (status === "ready" || status === "completed") {
    step = 3;
    accentColor = "#10b981"; // GREEN pre READY
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center font-sans tracking-tight">
      <div className="w-full max-w-md text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-white/5 mb-6">
          <Sparkles size={14} className="text-[#00eeee]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Order Confirmed</span>
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-4">Great choice!</h1>
        <p className="text-zinc-500 text-[10px] leading-relaxed max-w-[320px] mx-auto uppercase font-bold tracking-[0.15em]">
          Your payment was successful. Our engineers are now optimizing your vehicle software.
        </p>
      </div>

      <div className="w-full max-w-md bg-[#050505] border border-zinc-900 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-12">
          <h2 className="font-black italic text-xl uppercase tracking-widest" style={{ color: accentColor }}>
            Status
          </h2>
          <ShieldCheck style={{ color: accentColor }} className="w-6 h-6 animate-pulse" />
        </div>

        {/* PROGRESS BAR */}
        <div className="relative mb-14 px-2 flex justify-between">
          <div className="absolute top-5 left-10 right-10 h-[1px] bg-zinc-800 z-0" />
          <div
            className="absolute top-5 left-10 h-[1px] z-0 transition-all duration-1000"
            style={{
              width: step === 1 ? "0%" : step === 2 ? "50%" : "100%",
              backgroundColor: accentColor,
              boxShadow: `0 0 20px ${accentColor}`,
            }}
          />

          {[
            { l: "Paid", i: Clock, s: 1 },
            { l: "Tuning", i: Zap, s: 2 },
            { l: "Ready", i: CheckCircle2, s: 3 },
          ].map((item) => (
            <div key={item.l} className="flex flex-col items-center gap-3 relative z-10">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-700 ${step >= item.s ? "text-black shadow-lg shadow-white/5" : "bg-zinc-900 text-zinc-700"}`}
                style={{ backgroundColor: step >= item.s ? accentColor : "" }}
              >
                <item.i size={18} />
              </div>
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: step >= item.s ? accentColor : "#3f3f46" }}
              >
                {item.l}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-4 mb-10">
          <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-3xl text-center">
            <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-1">Tracking ID</p>
            <p className="text-xl font-black uppercase italic tracking-tight">{order.order_number}</p>
          </div>
          <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-3xl text-center">
            <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-1">Performance Vehicle</p>
            <p className="text-lg font-black uppercase italic tracking-tight">
              {order.brand} {order.model}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center justify-center gap-3 bg-zinc-900/80 border border-white/5 p-5 rounded-[24px] hover:bg-zinc-800 transition-all text-[10px] uppercase font-bold tracking-[0.3em] text-zinc-400 group"
        >
          <Home size={14} className="group-hover:text-[#00eeee] transition-colors" /> Back to Homepage
        </button>
      </div>
    </div>
  );
};

export default TrackPage;
