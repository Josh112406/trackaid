import { describe, expect, it } from "vitest";

import { findDemoEvidenceRecord } from "@/lib/demo-data";

describe("findDemoEvidenceRecord", () => {
  it("finds a demonstration event by evidence hash", () => {
    const record = findDemoEvidenceRecord(
      "0xeb596ecae82577fa4eeed86a0dfb922f77d3875a209b9bae2978d31883c7b2ad",
    );

    expect(record?.campaign.slug).toBe("metro-manila-flood-response-demo");
    expect(record?.event.id).toBe("evt-demo-102");
    expect(record?.event.ledgerTxHash).toBeUndefined();
  });

  it("matches hashes without relying on letter casing", () => {
    const record = findDemoEvidenceRecord(
      "0X4C6687E4FFE62D2A79E5F11ED576D03E7518BFE20328FE4BCFB4C9AFD3AF9934",
    );

    expect(record?.event.ledgerTxHash).toBe(
      "0x5681a2e1a2f0f2767470ceced36120f97cfbdb8200bed28015f2461787690eda",
    );
  });
});
