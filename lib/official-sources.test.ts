import { describe, expect, it } from "vitest";

import {
  findOfficialSource,
  officialCampaignSources,
} from "@/lib/official-sources";

describe("official campaign sources", () => {
  it("uses HTTPS for every source and donation destination", () => {
    for (const source of officialCampaignSources) {
      expect(source.officialSourceUrl).toMatch(/^https:\/\//);
      expect(source.donationUrl).toMatch(/^https:\/\//);
    }
  });

  it("does not redirect an unknown slug", () => {
    expect(findOfficialSource("unknown-program")).toBeUndefined();
  });
});
