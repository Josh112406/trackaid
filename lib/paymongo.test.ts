import { afterEach, describe, expect, it, vi } from "vitest";

import { createPayMongoCheckoutSession } from "@/lib/paymongo";

describe("PayMongo checkout creation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PAYMONGO_SECRET_KEY;
  });

  it("uses v2 Hosted Checkout and routes the net amount to an approved recipient", async () => {
    process.env.PAYMONGO_SECRET_KEY = "paymongo-test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "cs_test_123",
            type: "checkout_session",
            attributes: {
              checkout_url: "https://checkout.paymongo.com/cs_test_123",
              status: "active",
              livemode: false,
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const checkout = await createPayMongoCheckoutSession({
      campaignId: "00000000-0000-4000-8000-000000000002",
      campaignSlug: "relief-program",
      campaignTitle: "Relief program",
      amountCentavos: 50000,
      origin: "https://trackaid.vercel.app",
      recipientMerchantId: "org_Recipient123456",
    });

    expect(checkout.routing).toBe("direct_recipient");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.paymongo.com/v2/checkout_sessions",
      expect.any(Object),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.data.attributes.split_payment).toEqual({
      transfer_to: "org_Recipient123456",
    });
    expect(body.data.attributes.metadata.amount_centavos).toBe("50000");
  });
});
