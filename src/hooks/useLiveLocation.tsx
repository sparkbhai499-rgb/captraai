import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks delivery partner's GPS and writes it to the orders row.
 * Only runs when `enabled` is true (i.e., I'm assigned to this order and it's active).
 */
export const useLiveLocation = (orderId: string | undefined, enabled: boolean) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSentAt = useRef(0);

  useEffect(() => {
    if (!enabled || !orderId) return;
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported on this device");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setError(null);
        // Throttle DB writes to every 10s
        const now = Date.now();
        if (now - lastSentAt.current < 10_000) return;
        lastSentAt.current = now;
        await supabase
          .from("orders")
          .update({
            partner_lat: lat,
            partner_lng: lng,
            partner_location_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [orderId, enabled]);

  return { coords, error };
};
