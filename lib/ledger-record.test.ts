import { describe, expect, it } from "vitest";

import {
  buildLedgerMemo,
  isSolanaLedgerSignature,
  ledgerTransactionUrl,
} from "@/lib/ledger-record";

const payloadHash = `0x${"ab".repeat(32)}`;

describe("Solana ledger records", () => {
  it("creates a deterministic PHP-equivalent record without money or identity data", () => {
    const input = {
      entityType: "donation" as const,
      entityId: "0f84568b-66ea-4bdb-99b2-a319715c65f2",
      scopeId: "1ebec1ae-1883-471c-88e9-8b3b6cf8db58",
      amountCentavos: 125_000,
      payloadHash,
    };

    const first = buildLedgerMemo(input);
    const second = buildLedgerMemo(input);
    const decoded = JSON.parse(first) as Record<string, unknown>;

    expect(first).toBe(second);
    expect(decoded).toMatchObject({
      p: "trackaid-ledger",
      v: 1,
      t: "donation",
      phpCentavos: 125_000,
      currency: "PHP",
      funds: "offchain",
      hash: "ab".repeat(32),
    });
    expect(first).not.toContain("paymongo_payment");
    expect(first).not.toContain("donor");
  });

  it("rejects malformed hashes and fractional amounts", () => {
    expect(() =>
      buildLedgerMemo({
        entityType: "donation",
        entityId: "record",
        scopeId: "campaign",
        amountCentavos: 12.5,
        payloadHash,
      }),
    ).toThrow("integer centavos");

    expect(() =>
      buildLedgerMemo({
        entityType: "donation",
        entityId: "record",
        scopeId: "campaign",
        amountCentavos: 100,
        payloadHash: "not-a-hash",
      }),
    ).toThrow("payload hash");
  });

  it("links Solana signatures to Devnet and preserves legacy transaction links", () => {
    const signature = "5".repeat(88);
    expect(isSolanaLedgerSignature(signature)).toBe(true);
    expect(ledgerTransactionUrl(signature)).toBe(
      `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );

    const legacy = `0x${"12".repeat(32)}`;
    expect(ledgerTransactionUrl(legacy)).toBe(
      `https://amoy.polygonscan.com/tx/${legacy}`,
    );
  });
});
