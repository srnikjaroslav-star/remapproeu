import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Clock, Zap, Home } from "lucide-react";

const TrackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  const id = searchParams.get("id");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!id || !email) {
      navigate("/"); // Bez údajov automaticky domov
      return;
    }

    const fetchOrder = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", id.toUpperCase())
        .eq("customer_email", email.toLowerCase())
        .maybeSingle();

      if (data) setOrder(data);
      setLoading(false);
    };

    fetchOrder();

    // Realtime update z Admina
    const channel = supabase
      .channel("order_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `order_number=eq.${id.toUpperCase()}`,
        },
        (payload) => setOrder(payload.new),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, email, navigate]);

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00eeee]" />
      </div>
    );

  if (!order)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-6">
        <p className="font-black uppercase italic tracking-widest text-zinc-500 text-center px-4">
          Objednávka nenájdená
        </p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 bg-zinc-900 px-6 py-3 rounded-full hover:bg-zinc-800 transition-all uppercase font-bold text-[10px] tracking-widest border border-zinc-800"
        >
          <Home size={14} /> Späť domov
        </button>
      </div>
    );

  // LOGIKA FARIEB PODĽA ADMINA
  const status = order.status?.toLowerCase();
  let step = 1;
  let accentColor = "#f59e0b"; // PENDING -> ORANŽOVÁ

  if (status === "processing" || status === "working") {
    step = 2;
    accentColor = "#3b82f6"; // PROCESSING -> MODRÁ
  } else if (status === "completed" || status === "finished") {
    step = 3;
    accentColor = "#10b981"; // COMPLETED -> ZELENÁ
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md bg-[#050505] border border-zinc-900 rounded-[40px] p-10 shadow-2xl relative">
        <div className="flex justify-between items-center mb-12">
          <h2 className="font-black italic text-xl uppercase tracking-tighter" style={{ color: accentColor }}>
            Status
          </h2>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
        </div>

        {/* PROGRESS BAR */}
        <div className="relative mb-14 px-2 flex justify-between">
          <div className="absolute top-5 left-10 right-10 h-[1px] bg-zinc-800 z-0" />
          <div
            className="absolute top-5 left-10 h-[1px] z-0 transition-all duration-1000 shadow-sm"
            style={{
              width: step === 1 ? "0%" : step === 2 ? "50%" : "100%",
              backgroundColor: accentColor,
              boxShadow: `0 0 15px ${accentColor}`,
            }}
          />

          {[
            { l: "Paid", i: Clock, s: 1 },
            { l: "Tuning", i: Zap, s: 2 },
            { l: "Ready", i: CheckCircle2, s: 3 },
          ].map((item) => (
            <div key={item.l} className="relative z-10 flex flex-col items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${step >= item.s ? "text-black" : "bg-zinc-900 text-zinc-700"}`}
                style={{ backgroundColor: step >= item.s ? accentColor : "" }}
              >
                <item.i size={16} className={step === item.s && item.s === 2 ? "animate-pulse" : ""} />
              </div>
              <span
                className="text-[8px] font-bold uppercase tracking-[0.2em]"
                style={{ color: step >= item.s ? accentColor : "#3f3f46" }}
              >
                {item.l}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl text-center">
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">Order ID</p>
            <p className="text-xl font-black uppercase italic tracking-tight">{order.order_number}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl text-center">
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">Vehicle</p>
            <p className="text-lg font-black uppercase italic tracking-tight">
              {order.brand} {order.model}
            </p>
          </div>
        </div>

        {/* HOME TLAČIDLO */}
        <button
          onClick={() => navigate("/")}
          className="mt-10 w-full flex items-center justify-center gap-2 bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 transition-all text-[10px] uppercase font-bold tracking-widest text-zinc-400"
        >
          <Home size={14} /> Back to Home
        </button>
      </div>
    </div>
  );
};

export default TrackPage;
