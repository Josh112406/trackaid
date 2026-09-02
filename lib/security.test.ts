import { describe, expect, it } from "vitest";

import {
  checkoutRateLimitRules,
  requestClientIdentifier,
  scopedRateLimitIdentifier,
} from "@/lib/security";

function request(headers: Record<string, string>) {
  return new Request("https://trackaid.vercel.app", { headers });
}

describe("request rate-limit identity", () => {
  it("prefers Vercel's protected forwarding header", () => {
    const incoming = request({
      "x-vercel-forwarded-for": "203.0.113.10",
      "x-forwarded-for": "198.51.100.99",
      "x-real-ip": "192.0.2.50",
    });

    expect(requestClientIdentifier(incoming)).toBe("203.0.113.10");
  });

  it("uses the first proxy-provided address", () => {
    const incoming = request({
      "x-forwarded-for": "203.0.113.20, 198.51.100.30",
    });

    expect(requestClientIdentifier(incoming)).toBe("203.0.113.20");
  });

  it("creates unambiguous scoped identifiers", () => {
    expect(scopedRateLimitIdentifier("a:b", "c")).not.toBe(
      scopedRateLimitIdentifier("a", "b:c"),
    );
  });
});

describe("checkout rate-limit isolation", () => {
  const campaignId = "59d3772c-1d55-45e5-800f-1f66fb7b0079";

  it("does not share a campaign bucket across different clients", () => {
    const first = checkoutRateLimitRules(
      request({ "x-vercel-forwarded-for": "203.0.113.1" }),
      campaignId,
    );
    const second = checkoutRateLimitRules(
      request({ "x-vercel-forwarded-for": "203.0.113.2" }),
      campaignId,
    );

    expect(first.campaign.identifiers).not.toEqual(second.campaign.identifiers);
  });

  it("keeps a global client ceiling while isolating campaigns", () => {
    const incoming = request({
      "x-vercel-forwarded-for": "203.0.113.1",
    });
    const first = checkoutRateLimitRules(incoming, campaignId);
    const second = checkoutRateLimitRules(
      incoming,
      "a7ed7afb-5158-4b45-8f25-0af50b8f6e9d",
    );

    expect(first.client).toEqual(second.client);
    expect(first.campaign.identifiers).not.toEqual(second.campaign.identifiers);
    expect(first.client.limit).toBeGreaterThan(first.campaign.limit);
  });
});
