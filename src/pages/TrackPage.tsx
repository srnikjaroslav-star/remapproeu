import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Clock, Zap, ShieldCheck } from "lucide-react";

const TrackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  const id = searchParams.get("id");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!id || !email) {
      navigate("/");
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

    // Realtime odber zmien z Admina
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
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-black uppercase italic">
        Objednávka nenájdená.
      </div>
    );

  // --- LOGIKA FARIEB PODĽA ADMINA ---
  const status = order.status?.toLowerCase();

  let step = 1;
  let accentColor = "#f59e0b"; // PENDING -> ORANŽOVÁ
  let statusText = "Čakáme na spracovanie súboru...";

  if (status === "processing" || status === "working") {
    step = 2;
    accentColor = "#3b82f6"; // PROCESSING -> MODRÁ
    statusText = "Naši inžinieri práve ladia tvoj softvér...";
  } else if (status === "completed" || status === "finished") {
    step = 3;
    accentColor = "#10b981"; // COMPLETED -> ZELENÁ
    statusText = "Hotovo! Upravený súbor máš v emaile.";
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md bg-[#050505] border border-zinc-900 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
        {/* Dekoratívne svetlo v pozadí reagujúce na status */}
        <div
          className="absolute -top-20 -left-20 w-40 h-40 blur-[100px] opacity-20"
          style={{ backgroundColor: accentColor }}
        />

        <div className="flex justify-between items-center mb-12">
          <h2 className="font-black italic text-xl uppercase tracking-tighter" style={{ color: accentColor }}>
            Status Objednávky
          </h2>
          <ShieldCheck style={{ color: accentColor }} className="w-6 h-6" />
        </div>

        {/* PROGRESS BAR */}
        <div className="relative mb-14 px-2 flex justify-between">
          {/* Šedá linka v pozadí */}
          <div className="absolute top-5 left-10 right-10 h-[1px] bg-zinc-800 z-0" />

          {/* Farebná linka progresu */}
          <div
            className="absolute top-5 left-10 h-[1px] z-0 transition-all duration-700 shadow-sm"
            style={{
              width: step === 1 ? "0%" : step === 2 ? "50%" : "100%",
              backgroundColor: accentColor,
              boxShadow: `0 0 10px ${accentColor}`,
            }}
          />

          {[
            { label: "Zaplatené", icon: Clock, s: 1 },
            { label: "Tuning", icon: Zap, s: 2 },
            { label: "Hotovo", icon: CheckCircle2, s: 3 },
          ].map((item) => (
            <div key={item.label} className="relative z-10 flex flex-col items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                  step >= item.s ? "text-black" : "bg-zinc-900 text-zinc-700"
                }`}
                style={{
                  backgroundColor: step >= item.s ? accentColor : "",
                  boxShadow: step === item.s ? `0 0 20px ${accentColor}44` : "none",
                }}
              >
                <item.icon size={18} className={step === item.s && item.s === 2 ? "animate-pulse" : ""} />
              </div>
              <span
                className="text-[8px] font-bold uppercase tracking-[0.2em] transition-colors duration-500"
                style={{ color: step >= item.s ? accentColor : "#3f3f46" }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* INFO BOX */}
        <div className="space-y-4">
          <div className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-3xl text-center">
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-2">Vozidlo v procese</p>
            <p className="text-xl font-black uppercase italic tracking-tight">
              {order.brand} {order.model}
            </p>
          </div>

          <p
            className="text-center text-[10px] font-bold uppercase tracking-wide leading-relaxed px-4 opacity-80"
            style={{ color: accentColor }}
          >
            {statusText}
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
          <p className="text-zinc-600 text-[8px] uppercase font-bold tracking-widest">Order ID: {order.order_number}</p>
        </div>
      </div>
    </div>
  );
};

export default TrackPage;
