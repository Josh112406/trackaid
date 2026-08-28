import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export const trackAidProjectUrl = "https://xjkauffjltonvxgiqgqx.supabase.co";
export const trackAidPublishableKey =
  "sb_publishable_4Zsfl5UGB77LKOV6jV4QGg_0QT7uGGa";

export function createPublicSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? trackAidProjectUrl,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? trackAidPublishableKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
      },
    },
  );
}
