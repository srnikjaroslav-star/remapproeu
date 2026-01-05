import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Clock, Zap, ShieldCheck } from "lucide-react";

const TrackPage = () => {
  const [searchParams] = useSearchParams();
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
      setError("Incorrect ID or Email.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlId && urlEmail) fetchOrder(urlId, urlEmail);
  }, [urlId, urlEmail]);

  const step = order?.status === "completed" ? 3 : order?.status === "processing" ? 2 : 1;

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center font-sans">
      {order ? (
        <div className="w-full max-w-md bg-[#0a0a0a] border-2 border-[#00eeee]/20 rounded-[40px] p-10 shadow-[0_0_80px_rgba(0,238,238,0.1)]">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-[#00eeee] font-black italic text-2xl uppercase tracking-tighter">Live Status</h2>
            <ShieldCheck className="text-[#00eeee] w-6 h-6" />
          </div>

          <div className="relative mb-12 px-2 flex justify-between">
            <div className="absolute top-5 left-10 right-10 h-[2px] bg-zinc-800 z-0" />
            <div
              className="absolute top-5 left-10 h-[2px] bg-[#00eeee] z-0 transition-all duration-1000"
              style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
            />

            {[
              { l: "Paid", i: Clock, s: 1 },
              { l: "Tuning", i: Zap, s: 2 },
              { l: "Ready", i: CheckCircle2, s: 3 },
            ].map((item) => (
              <div key={item.l} className="relative z-10 flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= item.s ? "bg-[#00eeee] text-black" : "bg-zinc-900 text-zinc-600"}`}
                >
                  <item.i size={18} />
                </div>
                <span
                  className={`text-[9px] font-bold uppercase tracking-widest ${step >= item.s ? "text-[#00eeee]" : "text-zinc-600"}`}
                >
                  {item.l}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white/5 p-6 rounded-2xl text-center">
            <p className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Vehicle</p>
            <p className="text-xl font-black uppercase italic">
              {order.brand} {order.model}
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-8 text-center">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Track Order</h1>
          <div className="space-y-4">
            <input
              id="tId"
              placeholder="ORDER ID (RP-XXXXXX)"
              className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl outline-none focus:border-[#00eeee] text-center font-mono uppercase"
            />
            <input
              id="tEm"
              placeholder="YOUR EMAIL"
              className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl outline-none focus:border-[#00eeee] text-center font-mono uppercase"
            />
            <button
              onClick={() =>
                fetchOrder(
                  (document.getElementById("tId") as HTMLInputElement).value,
                  (document.getElementById("tEm") as HTMLInputElement).value,
                )
              }
              className="w-full bg-[#00eeee] text-black font-black p-4 rounded-xl hover:scale-105 transition-all uppercase italic"
            >
              Check Status
            </button>
            {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackPage;
