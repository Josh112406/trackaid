import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";
import {
  trackAidProjectUrl,
  trackAidPublishableKey,
} from "@/lib/supabase/public";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? trackAidProjectUrl;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? trackAidPublishableKey;
  return createBrowserClient<Database>(url, publishableKey);
}
