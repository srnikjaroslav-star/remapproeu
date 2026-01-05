import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Clock, Zap, Home, ShieldCheck } from "lucide-react";

const TrackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  const id = searchParams.get("id");
  const email = searchParams.get("email");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!id || !email) {
      navigate("/");
      return;
    }

    const initializeTracking = async () => {
      // 1. Skúsime nájsť v DB
      const { data: dbOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", id.toUpperCase())
        .maybeSingle();

      if (dbOrder) {
        setOrder(dbOrder);
        setLoading(false);
      } else if (sessionId) {
        // 2. Ak v DB ešte nie je, ale máme sessionId zo Stripe (čerstvá platba)
        // Simulujeme úspešný stav "Paid", aby Richard hneď videl výsledok
        setOrder({
          order_number: id.toUpperCase(),
          status: "paid",
          brand: "Overujem...", // Dočasný stav kým webhook nedobehne
          model: "vozidlo",
        });
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    initializeTracking();
  }, [id, email, sessionId, navigate]);

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00eeee]" />
      </div>
    );

  // Ak neexistuje ani v DB ani v Stripe session
  if (!order)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="bg-[#050505] border border-zinc-900 rounded-[40px] p-10 text-center w-full max-w-md">
          <p className="font-black uppercase italic tracking-widest text-zinc-500 mb-8">Neautorizovaný prístup</p>
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900/50 border border-white/5 p-5 rounded-[24px] hover:bg-zinc-800 transition-all text-[10px] uppercase font-bold tracking-widest text-zinc-400"
          >
            <Home size={14} /> Back to Home
          </button>
        </div>
      </div>
    );

  const step = order.status === "paid" ? 1 : order.status === "processing" ? 2 : 3;
  const accentColor = "#00eeee"; // REMAPPRO Tyrkysová

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-[#050505] border border-zinc-900 rounded-[40px] p-10 shadow-2xl relative">
        <div className="flex justify-between items-center mb-12">
          <h2 className="font-black italic text-xl uppercase tracking-tighter" style={{ color: accentColor }}>
            Status
          </h2>
          <ShieldCheck style={{ color: accentColor }} className="w-6 h-6" />
        </div>

        {/* PROGRES BAR - Vždy svieti aspoň "Paid" */}
        <div className="relative mb-14 px-2 flex justify-between">
          <div className="absolute top-5 left-10 right-10 h-[1px] bg-zinc-800" />
          <div
            className="absolute top-5 left-10 h-[1px] transition-all duration-1000"
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
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${step >= item.s ? "text-black" : "bg-zinc-900 text-zinc-700"}`}
                style={{ backgroundColor: step >= item.s ? accentColor : "" }}
              >
                <item.i size={16} />
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

        <div className="space-y-4 mb-10">
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

        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center justify-center gap-2 bg-zinc-900/50 border border-white/5 p-5 rounded-[24px] hover:bg-zinc-800 transition-all text-[10px] uppercase font-bold tracking-widest text-zinc-400"
        >
          <Home size={14} /> Back to Home
        </button>
      </div>
    </div>
  );
};

export default TrackPage;
