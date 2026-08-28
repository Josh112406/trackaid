import type { Campaign } from "@/lib/types";

export const demoCampaigns: Campaign[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "quezon-typhoon-response-demo",
    title: "Typhoon response demonstration",
    disasterName: "Demonstration disaster event",
    location: "Quezon Province",
    organization: "Verified organization demonstration",
    summary:
      "A sample campaign showing how donations, purchase evidence, and independent confirmations appear in a public audit trail.",
    targetBeneficiaries: "Demonstration households in affected municipalities",
    fundingGoalCentavos: 250000000,
    receivedCentavos: 168420000,
    disbursedCentavos: 94300000,
    status: "published",
    isDemonstration: true,
    events: [
      {
        id: "evt-demo-004",
        type: "beneficiary_confirmation",
        title: "Beneficiary receipt confirmations recorded",
        detail:
          "Anonymized confirmations were submitted through the demonstration SMS flow.",
        occurredAt: "2026-08-25T09:40:00+08:00",
        status: "confirmed",
        evidenceHash:
          "0xc07565513e076f68e4f4e45ba70524a1449ce4ebb0751e5b4ac661c82b218529",
      },
      {
        id: "evt-demo-003",
        type: "supplier_confirmation",
        title: "Supplier confirmed goods release",
        detail:
          "The named demonstration supplier confirmed the purchase reference and quantity.",
        occurredAt: "2026-08-24T16:10:00+08:00",
        status: "confirmed",
        evidenceHash:
          "0x05e1d653d6f9125aecfb9e6865e281f3803e7a3d6b0301118aca9df65588f65f",
      },
      {
        id: "evt-demo-002",
        type: "disbursement",
        title: "Relief-goods disbursement submitted",
        detail:
          "The organization logged a sample purchase with redacted evidence stored privately.",
        amountCentavos: 94300000,
        occurredAt: "2026-08-24T13:15:00+08:00",
        status: "confirmed",
        ledgerTxHash:
          "0x5681a2e1a2f0f2767470ceced36120f97cfbdb8200bed28015f2461787690eda",
        evidenceHash:
          "0x4c6687e4ffe62d2a79e5f11ed576d03e7518bfe20328fe4bcfb4c9afd3af9934",
      },
      {
        id: "evt-demo-001",
        type: "donation",
        title: "Donation total anchored",
        detail:
          "A batch of test-mode PayMongo payments was reconciled and anchored on Polygon Amoy.",
        amountCentavos: 168420000,
        occurredAt: "2026-08-23T11:30:00+08:00",
        status: "confirmed",
        ledgerTxHash:
          "0xab21c3ed53afb936df4a4dd5b692fa45e5ed1d919dcf55ff471d0067e18171d1",
      },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    slug: "metro-manila-flood-response-demo",
    title: "Flood response demonstration",
    disasterName: "Demonstration flood event",
    location: "Metro Manila",
    organization: "Verified LGU office demonstration",
    summary:
      "A second sample showing a campaign before the first disbursement has been fully confirmed.",
    targetBeneficiaries: "Demonstration evacuation centers",
    fundingGoalCentavos: 180000000,
    receivedCentavos: 75650000,
    disbursedCentavos: 21400000,
    status: "published",
    isDemonstration: true,
    events: [
      {
        id: "evt-demo-102",
        type: "disbursement",
        title: "Water and hygiene purchase submitted",
        detail:
          "Evidence was received; supplier and beneficiary confirmations are still pending.",
        amountCentavos: 21400000,
        occurredAt: "2026-08-26T15:20:00+08:00",
        status: "submitted",
        evidenceHash:
          "0xeb596ecae82577fa4eeed86a0dfb922f77d3875a209b9bae2978d31883c7b2ad",
      },
      {
        id: "evt-demo-101",
        type: "donation",
        title: "Donation total anchored",
        detail:
          "Test-mode payment records were reconciled before the public ledger event was written.",
        amountCentavos: 75650000,
        occurredAt: "2026-08-26T10:05:00+08:00",
        status: "confirmed",
        ledgerTxHash:
          "0xcb286517e894f5d2f6dd170830f90fc97a426c39e7c7578c1d10e3ae24f0d9f0",
      },
    ],
  },
];

export function findDemoEvidenceRecord(hash: string) {
  const normalizedHash = hash.toLowerCase();

  for (const campaign of demoCampaigns) {
    const event = campaign.events.find(
      (candidate) => candidate.evidenceHash?.toLowerCase() === normalizedHash,
    );
    if (event) return { campaign, event };
  }

  return null;
}
