import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/supabase/database.types";
import {
  trackAidProjectUrl,
  trackAidPublishableKey,
} from "@/lib/supabase/public";

export async function createServerUserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? trackAidProjectUrl;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? trackAidPublishableKey;

  const cookieStore = await cookies();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot always write cookies. Middleware or the next request refreshes them.
        }
      },
    },
  });
}
