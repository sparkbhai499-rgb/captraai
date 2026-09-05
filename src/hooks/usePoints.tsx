import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PointsInfo = {
  balance: number;
  signup_claimed: boolean;
  can_claim_refill: boolean;
  referral_code: string | null;
  video_cost: number;
  signup_bonus: number;
  referral_points: number;
  refill_amount: number;
  refill_period: string;
};

export const usePoints = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState<PointsInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setPoints(null); setLoading(false); return; }
    const { data } = await supabase.rpc("get_my_points" as any);
    const row = Array.isArray(data) ? data[0] : data;
    setPoints((row as PointsInfo) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { points, loading, refresh };
};

/** Deducts points for an action. Admins are unlimited (RPC returns -1). */
export const spendPoints = async (amount: number, reason: string, meta?: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc("spend_points" as any, {
    _amount: amount, _reason: reason, _meta: meta ?? null,
  });
  if (error) throw error;
  return data as number;
};
