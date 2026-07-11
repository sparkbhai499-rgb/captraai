import { supabase } from "@/integrations/supabase/client";

export const FREE_PROJECT_LIMIT = 5;

/** Returns { allowed, used, hasPlan } */
export const checkUploadQuota = async (userId: string) => {
  const [{ count }, { data: sub }] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("subscriptions").select("id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle(),
  ]);
  const used = count || 0;
  const hasPlan = !!sub;
  return { allowed: hasPlan || used < FREE_PROJECT_LIMIT, used, hasPlan };
};
