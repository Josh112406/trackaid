import { botSignals, emailAddress, secretText } from "@/lib/validation";
import {
  consumeRateLimit,
  noStoreJson,
  readJsonObject,
  requestClientIdentifier,
} from "@/lib/security";
import { createServerUserClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await readJsonObject(request, 8192).catch(() => null);
  if (!body || !botSignals(body)) {
    return noStoreJson(
      { message: "The email or password is incorrect." },
      { status: 400 },
    );
  }

  let email: string;
  let password: string;
  try {
    email = emailAddress(body.email);
    password = secretText(body.password, {
      min: 1,
      max: 200,
      name: "Password",
    });
  } catch {
    return noStoreJson(
      { message: "The email or password is incorrect." },
      { status: 400 },
    );
  }

  const rateLimit = await consumeRateLimit({
    scope: "admin-login",
    identifiers: [requestClientIdentifier(request), email],
    limit: 5,
    windowSeconds: 900,
  });
  if (!rateLimit.configured) {
    return noStoreJson(
      { message: "Secure sign-in is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!rateLimit.allowed) {
    return noStoreJson(
      { message: "Too many sign-in attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const supabase = await createServerUserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    return noStoreJson(
      { message: "The email or password is incorrect." },
      { status: 401 },
    );
  }

  const { data: admin } = await supabase
    .from("app_admins")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return noStoreJson(
      { message: "The email or password is incorrect." },
      { status: 401 },
    );
  }

  return noStoreJson({ success: true });
}
