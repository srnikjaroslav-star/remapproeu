import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Clock, Zap, Home, ShieldCheck } from "lucide-react";

const TrackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  const id = searchParams.get("id");
  const email = searchParams.get("email");

  useEffect(() => {
    // 1. Ak chýba ID alebo email v URL, Richard tu nemá čo robiť
    if (!id || !email) {
      navigate("/");
      return;
    }

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", id.toUpperCase())
        .eq("customer_email", email.toLowerCase())
        .maybeSingle();

      if (data) {
        // Objednávka nájdená - vypíname loading a zobrazujeme proces
        setOrder(data);
        setLoading(false);
      } else {
        // INTELIGENTNÉ ČAKANIE: Ak ju nenájde hneď (Webhook mešká), skúsime to znova 5-krát každú sekundu
        if (retryCount < 5) {
          setTimeout(() => setRetryCount((prev) => prev + 1), 1500);
        } else {
          // Až po 5 pokusoch povieme, že sa nič nenašlo
          setLoading(false);
        }
      }
    };

    fetchOrder();

    // REALTIME: Ak sa v databáze čokoľvek zmení, stránka sa sama prekreslí
    const channel = supabase
      .channel("order_realtime")
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
  }, [id, email, navigate, retryCount]);

  // LOADING STAV: Kým hľadáme objednávku, Richard vidí len animáciu
  if (loading)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#00eeee]" />
        <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-zinc-500 animate-pulse">
          Overujem platbu...
        </p>
      </div>
    );

  // ERROR STAV: Ak ani po 5 pokusoch objednávka neexistuje
  if (!order)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="w-full max-w-md bg-[#050505] border border-zinc-900 rounded-[40px] p-10 text-center">
          <p className="font-black uppercase italic tracking-widest text-zinc-500 mb-8">Objednávka nenájdená</p>
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900/50 border border-white/5 p-5 rounded-[24px] hover:bg-zinc-800 transition-all text-[10px] uppercase font-bold tracking-widest text-zinc-400"
          >
            <Home size={14} /> Back to Home
          </button>
        </div>
      </div>
    );

  // LOGIKA STATUSU
  const status = order.status?.toLowerCase();
  let step = 1;
  let accentColor = "#00eeee"; // Tyrkysová pre PAID

  if (status === "processing" || status === "working") {
    step = 2;
    accentColor = "#3b82f6"; // Modrá pre TUNING
  } else if (status === "completed" || status === "finished") {
    step = 3;
    accentColor = "#10b981"; // Zelená pre READY
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md bg-[#050505] border border-zinc-900 rounded-[40px] p-10 shadow-2xl relative">
        {/* HLAVIČKA */}
        <div className="flex justify-between items-center mb-12">
          <h2 className="font-black italic text-xl uppercase tracking-tighter" style={{ color: accentColor }}>
            Status
          </h2>
          <ShieldCheck style={{ color: accentColor }} className="w-6 h-6" />
        </div>

        {/* PROGRESS BAR */}
        <div className="relative mb-14 px-2 flex justify-between">
          <div className="absolute top-5 left-10 right-10 h-[1px] bg-zinc-800 z-0" />
          <div
            className="absolute top-5 left-10 h-[1px] z-0 transition-all duration-700 shadow-sm"
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
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${step >= item.s ? "text-black shadow-lg" : "bg-zinc-900 text-zinc-700"}`}
                style={{
                  backgroundColor: step >= item.s ? accentColor : "",
                  boxShadow: step === item.s ? `0 0 20px ${accentColor}` : "none",
                }}
              >
                <item.i size={16} className={step === item.s ? "animate-pulse" : ""} />
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

        {/* ÚDAJE O VOZIDLE */}
        <div className="space-y-4 mb-10">
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl text-center transition-all hover:bg-zinc-900/60">
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">Order ID</p>
            <p className="text-xl font-black uppercase italic tracking-tight">{order.order_number}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl text-center transition-all hover:bg-zinc-900/60">
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">Vehicle</p>
            <p className="text-lg font-black uppercase italic tracking-tight">
              {order.brand} {order.model}
            </p>
          </div>
        </div>

        {/* FINÁLNY GOMBIK DOMOV */}
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center justify-center gap-2 bg-zinc-900/50 border border-white/5 p-5 rounded-[24px] hover:bg-zinc-800 transition-all text-[10px] uppercase font-bold tracking-widest text-zinc-400 group"
        >
          <Home size={14} className="group-hover:scale-110 transition-transform" />
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default TrackPage;
