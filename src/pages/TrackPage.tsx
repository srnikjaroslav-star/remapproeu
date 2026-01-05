import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Clock, Zap } from "lucide-react";

const TrackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  const id = searchParams.get("id");
  const email = searchParams.get("email");

  useEffect(() => {
    // Ak nemá link parametre, nemá tu čo robiť
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

    // Realtime update: Ak v admine zmeníš status, stránka sa sama zmení
    const channel = supabase
      .channel("order_updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `order_number=eq.${id.toUpperCase()}` },
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
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Order not found.</div>;

  // Logika pre kroky podľa tvojho adminu
  const status = order.status?.toLowerCase();
  const step =
    status === "completed" || status === "finished" ? 3 : status === "processing" || status === "working" ? 2 : 1;

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[32px] p-8 shadow-2xl">
        <h2 className="text-[#00eeee] font-black italic text-xl uppercase mb-8 text-center tracking-widest">
          Order Progress
        </h2>

        {/* VIZUÁLNY INDIKÁTOR */}
        <div className="relative mb-10 flex justify-between">
          <div className="absolute top-5 left-8 right-8 h-[1px] bg-zinc-800" />
          <div
            className="absolute top-5 left-8 h-[1px] bg-[#00eeee] transition-all duration-1000 shadow-[0_0_10px_#00eeee]"
            style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
          />

          {[
            { l: "Paid", i: Clock, s: 1 },
            { l: "Tuning", i: Zap, s: 2 },
            { l: "Ready", i: CheckCircle2, s: 3 },
          ].map((item) => (
            <div key={item.l} className="relative z-10 flex flex-col items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${step >= item.s ? "bg-[#00eeee] text-black shadow-[0_0_15px_#00eeee]" : "bg-zinc-900 text-zinc-700"}`}
              >
                <item.i size={18} className={step === item.s && item.s === 2 ? "animate-pulse" : ""} />
              </div>
              <span
                className={`text-[8px] font-bold uppercase tracking-widest ${step >= item.s ? "text-[#00eeee]" : "text-zinc-700"}`}
              >
                {item.l}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Vehicle</p>
            <p className="text-lg font-black uppercase italic">
              {order.brand} {order.model}
            </p>
          </div>

          <div className="p-4 text-center">
            <p className="text-[#00eeee] text-[10px] font-bold uppercase">
              {step === 1 && "We have received your file. Optimization starting soon."}
              {step === 2 && "Our engineers are working on your ECU maps..."}
              {step === 3 && "Optimization complete! Check your email for the file."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackPage;
