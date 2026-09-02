import { createHash, randomBytes } from "node:crypto";

import { getAdminAccess } from "@/lib/admin-auth";
import {
  consumeRateLimit,
  noStoreJson,
  readJsonObject,
  requestClientIdentifier,
} from "@/lib/security";
import { createServerUserClient } from "@/lib/supabase/server";
import { adminInviteRole, emailAddress } from "@/lib/validation";

export async function POST(request: Request) {
  const access = await getAdminAccess();
  if (access.mode === "unauthorized") {
    return noStoreJson(
      { message: "Administrator sign-in required." },
      { status: 401 },
    );
  }
  if (access.role !== "owner") {
    return noStoreJson(
      { message: "Only the owner can invite administrators." },
      { status: 403 },
    );
  }

  const body = await readJsonObject(request, 4096).catch(() => null);
  let email: string;
  let role: "reviewer" | "auditor";
  try {
    email = emailAddress(body?.email);
    role = adminInviteRole(body?.role);
  } catch (error) {
    return noStoreJson(
      { message: (error as Error).message },
      { status: 400 },
    );
  }

  const rateLimit = await consumeRateLimit({
    scope: "admin-invitation",
    identifiers: [requestClientIdentifier(request), access.userId],
    limit: 10,
    windowSeconds: 86_400,
  });
  if (!rateLimit.configured) {
    return noStoreJson(
      { message: "Secure invitations are temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!rateLimit.allowed) {
    return noStoreJson(
      { message: "Invitation limit reached. Try again tomorrow." },
      { status: 429 },
    );
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!origin) {
    return noStoreJson(
      { message: "Secure invitations are temporarily unavailable." },
      { status: 503 },
    );
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const supabase = await createServerUserClient();
  const { error } = await supabase.rpc("create_admin_invitation", {
    p_email: email,
    p_role: role,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
  });
  if (error) {
    return noStoreJson(
      {
        message: error.message.includes("already accepted")
          ? "This email already belongs to an administrator."
          : "The invitation could not be created.",
      },
      { status: 400 },
    );
  }

  const invitationUrl = new URL("/admin/setup", origin);
  invitationUrl.searchParams.set("email", email);
  invitationUrl.searchParams.set("token", token);
  return noStoreJson({
    invitationUrl: invitationUrl.toString(),
    expiresAt,
  });
}
