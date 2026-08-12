import { supabase } from "@/integrations/supabase/client";

export const FREE_PROJECT_LIMIT = 5;

/** Returns { allowed, used, hasPlan, isAdmin } — admins have unlimited credits */
export const checkUploadQuota = async (userId: string) => {
  const [{ count }, { data: sub }, { data: adminRole }] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("subscriptions").select("id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle(),
    supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").limit(1).maybeSingle(),
  ]);
  const used = count || 0;
  const hasPlan = !!sub;
  const isAdmin = !!adminRole;
  return { allowed: isAdmin || hasPlan || used < FREE_PROJECT_LIMIT, used, hasPlan: hasPlan || isAdmin, isAdmin };
};
