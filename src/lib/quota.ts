import { supabase } from "@/integrations/supabase/client";

export const FREE_PROJECT_LIMIT = 1;

/** Returns { allowed, used, hasPlan, isAdmin, freeLimit } — admins have unlimited credits.
 *  Free users get FREE_PROJECT_LIMIT uploads + any extra free videos granted by admin. */
export const checkUploadQuota = async (userId: string) => {
  const [{ count }, { data: sub }, { data: adminRole }, { data: prof }] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("subscriptions").select("id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle(),
    supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").limit(1).maybeSingle(),
    supabase.from("profiles").select("extra_free_videos").eq("user_id", userId).limit(1).maybeSingle(),
  ]);
  const used = count || 0;
  const hasPlan = !!sub;
  const isAdmin = !!adminRole;
  const freeLimit = FREE_PROJECT_LIMIT + ((prof as any)?.extra_free_videos || 0);
  return { allowed: isAdmin || hasPlan || used < freeLimit, used, hasPlan: hasPlan || isAdmin, isAdmin, freeLimit };
};
