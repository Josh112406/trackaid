import { createServerUserClient } from "@/lib/supabase/server";

export type AdminAccess =
  | {
      mode: "authenticated";
      role: "owner" | "reviewer" | "auditor";
      email: string;
      userId: string;
    }
  | { mode: "unauthorized" };

export async function getAdminAccess(): Promise<AdminAccess> {
  const supabase = await createServerUserClient();
  if (!supabase) return { mode: "unauthorized" };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { mode: "unauthorized" };

  const { data: admin } = await supabase
    .from("app_admins")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!admin) return { mode: "unauthorized" };

  return {
    mode: "authenticated",
    role: admin.role as "owner" | "reviewer" | "auditor",
    email: userData.user.email ?? "Administrator",
    userId: userData.user.id,
  };
}

export function safeAdminRedirect(value: string | null) {
  if (!value?.startsWith("/admin") || value.startsWith("//")) return "/admin";
  try {
    const parsed = new URL(value, "http://n");
    if (parsed.pathname.startsWith("/admin")) return parsed.pathname;
  } catch {
    /* malformed — fall through */
  }
  return "/admin";
}
