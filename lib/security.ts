import "server-only";

import { createHmac } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export function requestClientIdentifier(request: Request) {
  const forwarded = (header: string) =>
    request.headers.get(header)?.split(",")[0]?.trim();
  const candidate =
    forwarded("x-vercel-forwarded-for") ||
    forwarded("x-forwarded-for") ||
    forwarded("x-real-ip") ||
    "unknown";
  return candidate.slice(0, 100);
}

export function scopedRateLimitIdentifier(...parts: string[]) {
  return JSON.stringify(parts.map((part) => part.slice(0, 256)));
}

export function checkoutRateLimitRules(request: Request, campaignId: string) {
  const clientIdentifier = requestClientIdentifier(request);
  return {
    client: {
      scope: "payment-checkout-client",
      identifiers: [clientIdentifier],
      limit: 60,
      windowSeconds: 600,
    },
    campaign: {
      scope: "payment-checkout-campaign",
      identifiers: [scopedRateLimitIdentifier(clientIdentifier, campaignId)],
      limit: 20,
      windowSeconds: 600,
    },
  };
}

export async function consumeRateLimit({
  scope,
  identifiers,
  limit,
  windowSeconds,
}: {
  scope: string;
  identifiers: string[];
  limit: number;
  windowSeconds: number;
}) {
  const pepper =
    process.env.SECURITY_HASH_PEPPER ?? process.env.SUPABASE_SECRET_KEY;
  const admin = createAdminClient();
  if (!pepper || pepper.length < 32 || !admin) {
    return { allowed: false, configured: false } as const;
  }

  for (const identifier of identifiers) {
    const keyHash = createHmac("sha256", pepper)
      .update(`${scope}:${identifier}`)
      .digest("hex");
    const { data, error } = await admin.rpc("consume_security_rate_limit", {
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error || data !== true) {
      return { allowed: false, configured: !error } as const;
    }
  }

  return { allowed: true, configured: true } as const;
}

export function noStoreJson(
  body: Record<string, unknown>,
  init?: ResponseInit,
) {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", "no-store");
  return Response.json(body, {
    ...init,
    headers,
  });
}

export async function readJsonObject(request: Request, maxBytes: number) {
  const body = request.body;
  if (!body) throw new Error("NO_BODY");

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) throw new Error("REQUEST_TOO_LARGE");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged =
    chunks.length === 1
      ? chunks[0]
      : (() => {
          const buf = new Uint8Array(totalBytes);
          let offset = 0;
          for (const c of chunks) {
            buf.set(c, offset);
            offset += c.byteLength;
          }
          return buf;
        })();

  const text = new TextDecoder().decode(merged);
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("INVALID_JSON");
  }
  return parsed as Record<string, unknown>;
}
