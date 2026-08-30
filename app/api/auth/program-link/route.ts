import {
  consumeRateLimit,
  noStoreJson,
  readJsonObject,
  requestClientIdentifier,
} from "@/lib/security";
import { createServerUserClient } from "@/lib/supabase/server";
import { botSignals, emailAddress } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await readJsonObject(request, 4096).catch(() => null);
  if (!body || !botSignals(body)) {
    return noStoreJson(
      { message: "The sign-in link could not be sent." },
      { status: 400 },
    );
  }

  let email: string;
  try {
    email = emailAddress(body.email);
  } catch {
    return noStoreJson(
      { message: "The sign-in link could not be sent." },
      { status: 400 },
    );
  }

  const rateLimit = await consumeRateLimit({
    scope: "program-link",
    identifiers: [requestClientIdentifier(request), email],
    limit: 3,
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
      { message: "Too many requests. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const supabase = await createServerUserClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin.replace(/\/$/, "")}/auth/callback?next=/submit-program`,
    },
  });
  if (error) {
    return noStoreJson(
      { message: "The sign-in link could not be sent." },
      { status: 400 },
    );
  }
  return noStoreJson({ success: true });
}
