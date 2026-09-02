import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  createAdminClient: vi.fn(),
  insertAnalytics: vi.fn(),
}));

vi.mock("@/lib/security", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  requestClientIdentifier: () => "203.0.113.10",
  scopedRateLimitIdentifier: (...parts: string[]) => JSON.stringify(parts),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/supabase/public", () => ({
  createPublicSupabaseClient: () => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({
        data: {
          slug: "verified-relief",
          donation_url: "https://example.org/donate",
          source_domain: "example.org",
        },
        error: null,
      }),
    };
    return { from: () => query };
  },
}));

vi.mock("@/lib/official-sources", () => ({
  findOfficialSource: () => undefined,
}));

import { GET } from "@/app/go/[slug]/route";

describe("external redirect analytics throttling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAdminClient.mockReturnValue({
      from: () => ({ insert: mocks.insertAnalytics }),
    });
  });

  it("keeps the redirect available when analytics are rate-limited", async () => {
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: false,
      configured: true,
    });
    const response = await GET(
      new NextRequest("https://trackaid.vercel.app/go/verified-relief"),
      { params: Promise.resolve({ slug: "verified-relief" }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.org/donate");
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.insertAnalytics).not.toHaveBeenCalled();
  });

  it("records an allowed redirect once", async () => {
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      configured: true,
    });
    mocks.insertAnalytics.mockResolvedValue({ error: null });
    const response = await GET(
      new NextRequest("https://trackaid.vercel.app/go/verified-relief"),
      { params: Promise.resolve({ slug: "verified-relief" }) },
    );

    expect(response.status).toBe(307);
    expect(mocks.insertAnalytics).toHaveBeenCalledOnce();
  });
});
