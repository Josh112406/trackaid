import { describe, expect, it } from "vitest";

import {
  getPayMongoEventType,
  normalizePaidDonationEvent,
} from "@/lib/webhook-processing";

const checkoutPaid = {
  data: {
    type: "checkout_session.payment.paid",
    livemode: false,
    updated_at: "2026-08-29T08:00:00Z",
    data: {
      id: "cs_test_123",
      attributes: {
        reference_number: "00000000-0000-4000-8000-000000000001",
        metadata: {
          campaign_id: "00000000-0000-4000-8000-000000000002",
          donation_id: "00000000-0000-4000-8000-000000000001",
          amount_centavos: "50000",
        },
        payment_intent: { id: "pi_test_123" },
        payments: [
          {
            id: "pay_test_123",
            attributes: {
              amount: 50000,
              fee: 1250,
              net_amount: 48750,
              status: "paid",
              paid_at: 1787990400,
              source: { type: "card" },
            },
          },
        ],
      },
    },
  },
};

describe("PayMongo paid-event normalization", () => {
  it("normalizes the current checkout-session webhook", () => {
    expect(getPayMongoEventType(checkoutPaid)).toBe(
      "checkout_session.payment.paid",
    );
    expect(normalizePaidDonationEvent(checkoutPaid)).toMatchObject({
      checkoutSessionId: "cs_test_123",
      paymentId: "pay_test_123",
      paymentIntentId: "pi_test_123",
      amountCentavos: 50000,
      feeCentavos: 1250,
      netAmountCentavos: 48750,
      paymentMethodType: "card",
      livemode: false,
    });
  });

  it("rejects a signed payload whose charged amount differs from checkout metadata", () => {
    const changed = structuredClone(checkoutPaid);
    changed.data.data.attributes.payments[0].attributes.amount = 60000;
    expect(normalizePaidDonationEvent(changed)).toBeNull();
  });

  it("normalizes the legacy payment.paid webhook during migration", () => {
    const legacy = {
      data: {
        id: "evt_test_123",
        attributes: {
          type: "payment.paid",
          livemode: false,
          data: {
            id: "pay_legacy_123",
            attributes: {
              amount: 10000,
              fee: 250,
              net_amount: 9750,
              paid_at: 1787990400,
              payment_intent_id: "pi_legacy_123",
              metadata: {
                campaign_id: "00000000-0000-4000-8000-000000000002",
                donation_id: "00000000-0000-4000-8000-000000000003",
                amount_centavos: "10000",
              },
              source: { type: "gcash" },
            },
          },
        },
      },
    };
    expect(normalizePaidDonationEvent(legacy)).toMatchObject({
      eventType: "payment.paid",
      amountCentavos: 10000,
      feeCentavos: 250,
      netAmountCentavos: 9750,
      paymentMethodType: "gcash",
    });
  });
});
