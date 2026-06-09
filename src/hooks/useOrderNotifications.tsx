import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Plays a short beep using WebAudio (no asset needed)
const beep = () => {
  try {
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.5);
    setTimeout(() => ctx.close(), 600);
  } catch {}
};

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return "unsupported" as const;
  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }
  return Notification.permission;
};

interface NewOrder {
  id: string;
  customer_name: string;
  address: string;
  payout: number;
}

export const useOrderNotifications = (enabled: boolean) => {
  const seen = useRef<Set<string>>(new Set());
  const mounted = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    // Skip flooding on first mount
    const t = setTimeout(() => { mounted.current = true; }, 1500);

    const ch = supabase
      .channel("new-order-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const o = payload.new as NewOrder & { status: string };
          if (!mounted.current) return;
          if (o.status !== "pending") return;
          if (seen.current.has(o.id)) return;
          seen.current.add(o.id);

          beep();
          toast.success(`Naya order — ₹${o.payout}`, {
            description: `${o.customer_name} · ${o.address}`,
            duration: 8000,
          });

          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("New delivery order!", {
                body: `${o.customer_name} · ₹${o.payout}\n${o.address}`,
                icon: "/placeholder.svg",
                tag: o.id,
              });
            } catch {}
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(t);
      supabase.removeChannel(ch);
    };
  }, [enabled]);
};
