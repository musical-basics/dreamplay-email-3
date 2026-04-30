import { createClient } from "@supabase/supabase-js";
import { requiredEnv, serviceRoleKey } from "./env";

export function createAdminClient() {
  const key = serviceRoleKey();
  if (!key) throw new Error("Missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY");

  return createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
