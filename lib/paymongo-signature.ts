import { createHmac, timingSafeEqual } from "node:crypto";

type ParsedSignature = {
  timestamp: number;
  test: string;
  live: string;
};

type PayMongoWebhookList = {
  data?: Array<{
    attributes?: {
      events?: string[];
      livemode?: boolean;
      secret_key?: string;
      status?: string;
      url?: string;
    };
  }>;
};

const webhookSecretCache = new Map<
  string,
  { expiresAt: number; secrets: string[] }
>();

export function parsePayMongoSignature(header: string): ParsedSignature | null {
  const values = Object.fromEntries(
    header.split(",").map((part) => {
      const separator = part.indexOf("=");
      return [
        part.slice(0, separator).trim(),
        part.slice(separator + 1).trim(),
      ];
    }),
  );
  const timestamp = Number(values.t);
  if (!Number.isInteger(timestamp) || timestamp <= 0) return null;

  return {
    timestamp,
    test: values.te ?? "",
    live: values.li ?? "",
  };
}

export function verifyPayMongoSignature(input: {
  rawBody: string;
  header: string;
  webhookSecret: string;
  mode: "test" | "live";
  nowSeconds?: number;
  toleranceSeconds?: number;
}): boolean {
  const parsed = parsePayMongoSignature(input.header);
  if (!parsed) return false;

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = input.toleranceSeconds ?? 300;
  if (Math.abs(now - parsed.timestamp) > tolerance) return false;

  const provided = input.mode === "live" ? parsed.live : parsed.test;
  if (!/^[a-f0-9]{64}$/i.test(provided)) return false;

  const expected = createHmac("sha256", input.webhookSecret)
    .update(`${parsed.timestamp}.${input.rawBody}`)
    .digest("hex");

  return timingSafeEqual(
    Buffer.from(provided, "hex"),
    Buffer.from(expected, "hex"),
  );
}

async function loadPayMongoWebhookSecrets(input: {
  endpointUrl: string;
  merchantSecretKey: string;
  mode: "test" | "live";
}) {
  const cacheKey = `${input.mode}:${input.endpointUrl}`;
  const cached = webhookSecretCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.secrets;

  const response = await fetch("https://api.paymongo.com/v1/webhooks", {
    headers: {
      accept: "application/json",
      authorization: `Basic ${Buffer.from(`${input.merchantSecretKey}:`).toString("base64")}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return [];

  const payload = (await response.json()) as PayMongoWebhookList;
  const expectedLiveMode = input.mode === "live";
  const secrets = (payload.data ?? [])
    .map((webhook) => webhook.attributes)
    .filter(
      (attributes) =>
        attributes?.status === "enabled" &&
        attributes.livemode === expectedLiveMode &&
        attributes.url?.replace(/\/$/, "") ===
          input.endpointUrl.replace(/\/$/, "") &&
        attributes.events?.some((event) =>
          ["checkout_session.payment.paid", "payment.paid"].includes(event),
        ),
    )
    .map((attributes) => attributes?.secret_key)
    .filter((secret): secret is string => Boolean(secret));

  webhookSecretCache.set(cacheKey, {
    expiresAt: Date.now() + 5 * 60 * 1000,
    secrets,
  });
  return secrets;
}

export async function verifyPayMongoWebhookRequest(input: {
  rawBody: string;
  header: string;
  endpointUrl: string;
  mode: "test" | "live";
  configuredSecret?: string;
  merchantSecretKey?: string;
}) {
  if (
    input.configuredSecret &&
    verifyPayMongoSignature({
      rawBody: input.rawBody,
      header: input.header,
      webhookSecret: input.configuredSecret,
      mode: input.mode,
    })
  ) {
    return true;
  }
  if (!input.merchantSecretKey) return false;

  const secrets = await loadPayMongoWebhookSecrets({
    endpointUrl: input.endpointUrl,
    merchantSecretKey: input.merchantSecretKey,
    mode: input.mode,
  }).catch(() => []);
  return secrets.some((secret) =>
    verifyPayMongoSignature({
      rawBody: input.rawBody,
      header: input.header,
      webhookSecret: secret,
      mode: input.mode,
    }),
  );
}
