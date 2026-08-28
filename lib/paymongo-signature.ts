import { createHmac, timingSafeEqual } from "node:crypto";

type ParsedSignature = {
  timestamp: number;
  test: string;
  live: string;
};

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
