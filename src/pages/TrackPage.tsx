import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Car, ShieldCheck } from "lucide-react";

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
      if (!data) throw new Error("Objednávka sa nenašla.");
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

  if (loading)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-[#00eeee]">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="font-mono tracking-widest uppercase italic">Autentifikácia...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
      {order ? (
        <div className="w-full max-w-md bg-zinc-900 border-2 border-[#00eeee] rounded-3xl p-8 shadow-[0_0_30px_rgba(0,238,238,0.2)]">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[#00eeee] font-black italic text-xl uppercase tracking-tighter">Status</h2>
            <ShieldCheck className="text-green-500" />
          </div>
          <div className="space-y-6">
            <div className="bg-black/50 p-4 rounded-xl border border-zinc-800">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Order ID</p>
              <p className="text-xl font-mono font-bold text-white">{order.order_number}</p>
            </div>
            <div className="bg-black/50 p-4 rounded-xl border border-zinc-800">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Vehicle</p>
              <p className="text-lg font-bold italic">
                {order.brand} {order.model}
              </p>
            </div>
            <div className="text-center pt-6">
              <div className="inline-block px-8 py-2 bg-[#00eeee] text-black font-black rounded-full text-sm uppercase italic tracking-widest">
                {order.status || "PROCESSING"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-8 text-center">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">Track Order</h1>
          <div className="space-y-4 text-left">
            <input
              id="mId"
              placeholder="ORDER ID (RP-XXXXXX)"
              className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl outline-none focus:border-[#00eeee]"
            />
            <input
              id="mEm"
              placeholder="EMAIL ADDRESS"
              className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl outline-none focus:border-[#00eeee]"
            />
            <button
              onClick={() =>
                fetchOrder(
                  (document.getElementById("mId") as HTMLInputElement).value,
                  (document.getElementById("mEm") as HTMLInputElement).value,
                )
              }
              className="w-full bg-[#00eeee] text-black font-black p-4 rounded-xl hover:bg-white transition-all uppercase italic tracking-tighter"
            >
              Find Order →
            </button>
            {error && (
              <p className="text-red-500 text-center font-bold text-sm bg-red-500/10 p-3 rounded-lg">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackPage;
