import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getSupabasePublicConfig,
  supabaseAuthCookieOptions,
} from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export async function createServerUserClient() {
  const { url, publishableKey } = getSupabasePublicConfig();

  const cookieStore = await cookies();
  return createServerClient<Database>(url, publishableKey, {
    cookieOptions: supabaseAuthCookieOptions,
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
