import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Clock, Zap, Home, ShieldCheck, Sparkles } from "lucide-react";

const TrackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [statusChanged, setStatusChanged] = useState(false);
  const previousStatusRef = useRef<string | null>(null);

  const id = searchParams.get("id");
  const email = searchParams.get("email");
  const brand = searchParams.get("brand");
  const model = searchParams.get("model");

  useEffect(() => {
    if (!id || !email) {
      navigate("/");
      return;
    }

    let channel: any = null;
    let orderId: string | null = null;

    const syncOrder = async () => {
      const { data } = await supabase.from("orders").select("*").eq("order_number", id.toUpperCase()).maybeSingle();
      if (data) {
        setOrder(data);
        orderId = data.id;
        previousStatusRef.current = data.status;
        
        // Create Realtime subscription only after we have the order ID
        if (orderId) {
          channel = supabase
            .channel(`order-changes-${orderId}`)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "orders",
                filter: `id=eq.${orderId}`,
              },
              async (payload) => {
                console.log("Realtime update received:", payload);
                
                // Robust update: if payload.new is incomplete, refresh from DB
                if (payload.new && payload.new.id) {
                  // Check if status changed for animation
                  if (previousStatusRef.current && payload.new.status !== previousStatusRef.current) {
                    setStatusChanged(true);
                    setTimeout(() => setStatusChanged(false), 2000); // Reset after 2s
                  }
                  previousStatusRef.current = payload.new.status;
                  
                  // Verify payload has all necessary fields, otherwise refresh
                  const hasRequiredFields = payload.new.order_number && 
                                           payload.new.status !== undefined &&
                                           (payload.new.car_brand || payload.new.brand);
                  
                  if (hasRequiredFields) {
                    setOrder(payload.new);
                  } else {
                    // Refresh from DB if payload is incomplete
                    console.log("Payload incomplete, refreshing from DB...");
                    const { data: refreshedData } = await supabase
                      .from("orders")
                      .select("*")
                      .eq("id", orderId)
                      .maybeSingle();
                    if (refreshedData) {
                      setOrder(refreshedData);
                    }
                  }
                }
              }
            )
            .subscribe();
        }
      } else {
        // Okamžitý vizuál bez čakania na Webhook
        setOrder({
          order_number: id.toUpperCase(),
          status: "pending", // Defaultný stav po zaplatení (konzistentné s ManagementPortal)
          car_brand: brand || "Vehicle",
          car_model: model || "",
          brand: brand || "Vehicle", // Fallback for compatibility
          model: model || "", // Fallback for compatibility
        });
      }
      setLoading(false);
    };

    syncOrder();

    // Cleanup function
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id, email, brand, model, navigate]);

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00eeee]" size={32} />
      </div>
    );

  // LOGIKA FARIEB: Amber (Paid/Pending) -> Blue (Tuning/Processing) -> Green (Ready/Completed)
  const status = order.status?.toLowerCase();
  let step = 1;
  let accentColor = "#f59e0b"; // AMBER (PAID/PENDING)

  if (status === "processing" || status === "working" || status === "tuning") {
    step = 2;
    accentColor = "#3b82f6"; // BLUE (TUNING/PROCESSING)
  } else if (status === "completed" || status === "ready") {
    step = 3;
    accentColor = "#10b981"; // GREEN (READY/COMPLETED)
  }
  // Note: "pending" and "paid" both map to step 1 (Amber) - consistent with ManagementPortal

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center font-sans tracking-tight">
      {/* THANK YOU SECTION */}
      <div className="w-full max-w-md text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-white/5 mb-6">
          <Sparkles size={14} className="text-[#00eeee]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 italic">
            Payment Verified
          </span>
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-3">Great choice!</h1>
        <p className="text-zinc-500 text-[10px] leading-relaxed max-w-[320px] mx-auto uppercase font-bold tracking-[0.15em]">
          Thank you for your order. Our engineers are now optimizing your vehicle software. Track your progress in
          real-time below.
        </p>
      </div>

      <div className="w-full max-w-md bg-[#050505] border border-zinc-900 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-12">
          <h2 
            className={`font-black italic text-xl uppercase tracking-widest transition-all duration-500 ${
              statusChanged ? 'scale-110' : 'scale-100'
            }`}
            style={{ 
              color: accentColor,
              textShadow: statusChanged ? `0 0 20px ${accentColor}` : 'none',
            }}
          >
            Order Status
          </h2>
          <ShieldCheck 
            style={{ color: accentColor }} 
            className={`w-6 h-6 transition-all duration-500 ${
              statusChanged ? 'animate-bounce scale-125' : 'animate-pulse'
            }`} 
          />
        </div>

        {/* PROGRESS BAR */}
        <div className="relative mb-14 px-2 flex justify-between">
          <div className="absolute top-5 left-10 right-10 h-[1px] bg-zinc-800 z-0" />
          <div
            className="absolute top-5 left-10 h-[1px] z-0 transition-all duration-1000 shadow-lg"
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
          ].map((item) => {
            const isActive = step >= item.s;
            const isCurrentStep = step === item.s;
            const justActivated = isActive && statusChanged && isCurrentStep;
            
            return (
              <div key={item.l} className="flex flex-col items-center gap-3 relative z-10">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-700 ${
                    isActive ? "text-black shadow-lg shadow-white/5" : "bg-zinc-900 text-zinc-700"
                  } ${justActivated ? "animate-pulse scale-110" : ""}`}
                  style={{ 
                    backgroundColor: isActive ? accentColor : "",
                    boxShadow: justActivated ? `0 0 25px ${accentColor}` : undefined,
                  }}
                >
                  <item.i 
                    size={18} 
                    className={`transition-all duration-500 ${
                      isCurrentStep ? (statusChanged ? "animate-spin" : "animate-pulse") : ""
                    }`} 
                  />
                </div>
                <span
                  className={`text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${
                    justActivated ? "scale-110" : ""
                  }`}
                  style={{ 
                    color: isActive ? accentColor : "#3f3f46",
                    textShadow: justActivated ? `0 0 10px ${accentColor}` : 'none',
                  }}
                >
                  {item.l}
                </span>
              </div>
            );
          })}
        </div>

        {/* ORDER & VEHICLE DETAILS */}
        <div className="space-y-4 mb-10">
          <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-3xl text-center hover:bg-zinc-900/50 transition-colors">
            <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-1">Tracking ID</p>
            <p className="text-xl font-black uppercase italic tracking-tight">{order.order_number}</p>
          </div>
        <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-3xl text-center hover:bg-zinc-900/50 transition-colors">
          <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-1">Performance Vehicle</p>
          <p className="text-lg font-black uppercase italic tracking-tight">
            {order.car_brand || order.brand || 'N/A'} {order.car_model || order.model || ''}
          </p>
        </div>
        </div>

        {/* BACK TO HOME BUTTON */}
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
