import { describe, expect, it } from "vitest";

import {
  approvedOrganizationSlug,
  approvedProgramCampaignSlug,
  approvedProgramSourceSlug,
} from "@/lib/program-publication";

describe("approvedProgramSourceSlug", () => {
  it("creates a stable public slug", () => {
    expect(
      approvedProgramSourceSlug(
        "Typhoon Relief: Bicol 2026",
        "59d3772c-1d55-45e5-800f-1f66fb7b0079",
      ),
    ).toBe("typhoon-relief-bicol-2026-59d3772c");
  });

  it("falls back when a name has no slug characters", () => {
    expect(
      approvedProgramSourceSlug("---", "13c8ecfe-54a9-44b4-8c7f-e047111192d5"),
    ).toBe("program-13c8ecfe");
  });

  it("creates deterministic campaign and organization slugs", () => {
    expect(
      approvedProgramCampaignSlug(
        "Bicol Recovery",
        "59d3772c-1d55-45e5-800f-1f66fb7b0079",
      ),
    ).toBe("bicol-recovery-59d3772c");
    expect(
      approvedOrganizationSlug(
        "Relief Foundation",
        "b606d6f1-80f2-45e5-800f-1f66fb7b0079",
      ),
    ).toBe("relief-foundation-b606d6f1");
  });
});
