import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function TrackPage() {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const id = searchParams.get("id");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", id.toUpperCase())
        .maybeSingle();

      if (data) setOrder(data);
      setLoading(false);
    };

    fetchOrder();

    // Sledovanie zmien v reálnom čase
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
  }, [id]);

  if (loading) return <div className="min-h-screen bg-black text-white p-20">Loading performance data...</div>;
  if (!order) return <div className="min-h-screen bg-black text-white p-20">Order not found.</div>;

  return (
    <div className="min-h-screen bg-black text-white p-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[30px] p-10 text-center">
        <h1 className="text-2xl font-black italic uppercase text-[#00eeee] mb-6">REMAPPRO STATUS</h1>

        <div className="mb-8">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Vehicle</p>
          <p className="text-xl font-bold uppercase italic">
            {order.brand} {order.model}
          </p>
        </div>

        <div className="mb-8">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Tracking Number</p>
          <p className="text-lg font-mono text-white">{order.order_number}</p>
        </div>

        <div className="pt-6 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Current Stage</p>
          <div className="bg-zinc-800 rounded-full py-3">
            <span className="font-black uppercase italic text-[#00eeee]">{order.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
