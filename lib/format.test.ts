import { describe, expect, it } from "vitest";

import { formatPhp } from "@/lib/format";

describe("PHP currency formatting", () => {
  it("keeps whole-peso totals compact", () => {
    expect(formatPhp(10_000)).toBe("₱100");
  });

  it("shows centavos when fees or net amounts are fractional pesos", () => {
    expect(formatPhp(150)).toBe("₱1.50");
    expect(formatPhp(9_850)).toBe("₱98.50");
  });
});
