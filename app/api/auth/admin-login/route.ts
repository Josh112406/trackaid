import { botSignals, emailAddress, secretText } from "@/lib/validation";
import {
  consumeRateLimit,
  noStoreJson,
  readJsonObject,
  requestClientIdentifier,
} from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
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

  /* ---- Pre-check: verify the email belongs to an admin ---- */
  const adminClient = createAdminClient();
  if (!adminClient) {
    return noStoreJson(
      { message: "Secure sign-in is temporarily unavailable." },
      { status: 503 },
    );
  }
  const { data: userLookup } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const matchedUser = userLookup?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!matchedUser) {
    return noStoreJson(
      { message: "The email or password is incorrect." },
      { status: 401 },
    );
  }
  const { data: adminRow } = await adminClient
    .from("app_admins")
    .select("role")
    .eq("user_id", matchedUser.id)
    .maybeSingle();
  if (!adminRow) {
    return noStoreJson(
      { message: "The email or password is incorrect." },
      { status: 401 },
    );
  }

  /* ---- Only sign in after confirming admin status ---- */
  const supabase = await createServerUserClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return noStoreJson(
      { message: "The email or password is incorrect." },
      { status: 401 },
    );
  }

  return noStoreJson({ success: true });
}
