import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import {
  parsePayMongoSignature,
  verifyPayMongoSignature,
  verifyPayMongoWebhookRequest,
} from "@/lib/paymongo-signature";

describe("PayMongo signature verification", () => {
  const rawBody = '{"data":{"id":"evt_test"}}';
  const secret = "webhook-test-secret";
  const timestamp = 1_777_777_777;
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  it("parses test and live signature fields", () => {
    expect(
      parsePayMongoSignature(`t=${timestamp},te=${signature},li=`),
    ).toEqual({
      timestamp,
      test: signature,
      live: "",
    });
  });

  it("accepts a current, matching test signature", () => {
    expect(
      verifyPayMongoSignature({
        rawBody,
        header: `t=${timestamp},te=${signature},li=`,
        webhookSecret: secret,
        mode: "test",
        nowSeconds: timestamp + 15,
      }),
    ).toBe(true);
  });

  it("rejects a modified body", () => {
    expect(
      verifyPayMongoSignature({
        rawBody: `${rawBody} `,
        header: `t=${timestamp},te=${signature},li=`,
        webhookSecret: secret,
        mode: "test",
        nowSeconds: timestamp,
      }),
    ).toBe(false);
  });

  it("rejects an event outside the replay window", () => {
    expect(
      verifyPayMongoSignature({
        rawBody,
        header: `t=${timestamp},te=${signature},li=`,
        webhookSecret: secret,
        mode: "test",
        nowSeconds: timestamp + 301,
      }),
    ).toBe(false);
  });

  it("falls back to the enabled PayMongo webhook secret for this endpoint", async () => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const fallbackSecret = "paymongo-managed-webhook-secret";
    const currentSignature = createHmac("sha256", fallbackSecret)
      .update(`${currentTimestamp}.${rawBody}`)
      .digest("hex");
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () =>
      Response.json({
        data: [
          {
            attributes: {
              events: ["checkout_session.payment.paid"],
              livemode: false,
              secret_key: fallbackSecret,
              status: "enabled",
              url: "https://trackaid.vercel.app/api/webhooks/paymongo",
            },
          },
        ],
      }),
    );

    try {
      await expect(
        verifyPayMongoWebhookRequest({
          rawBody,
          header: `t=${currentTimestamp},te=${currentSignature},li=`,
          endpointUrl: "https://trackaid.vercel.app/api/webhooks/paymongo",
          mode: "test",
          configuredSecret: "stale-secret",
          merchantSecretKey: "sk_test_example",
        }),
      ).resolves.toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
