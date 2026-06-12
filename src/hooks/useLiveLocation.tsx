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

  const writeCoords = async (lat: number, lng: number, force = false) => {
    setCoords({ lat, lng });
    setError(null);
    const now = Date.now();
    if (!force && now - lastSentAt.current < 10_000) return;
    lastSentAt.current = now;
    if (!orderId) return;
    const { error: dbErr } = await supabase
      .from("orders")
      .update({
        partner_lat: lat,
        partner_lng: lng,
        partner_location_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (dbErr) console.error("[live-location] db write failed", dbErr);
  };

  useEffect(() => {
    if (!enabled || !orderId) return;
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation not supported on this device");
      return;
    }
    if (!window.isSecureContext) {
      setError("Location needs HTTPS. Preview ko new tab me kholo.");
      return;
    }

    // Immediate one-shot so first dot appears fast
    navigator.geolocation.getCurrentPosition(
      (pos) => writeCoords(pos.coords.latitude, pos.coords.longitude, true),
      (err) => {
        console.error("[live-location] getCurrentPosition", err);
        setError(err.message || "Location permission denied");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => writeCoords(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        console.error("[live-location] watchPosition", err);
        setError(err.message || "Location error");
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, enabled]);

  return { coords, error };
};
