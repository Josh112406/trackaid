import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  parsePayMongoSignature,
  verifyPayMongoSignature,
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
});
