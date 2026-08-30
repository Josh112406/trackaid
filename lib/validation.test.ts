import { describe, expect, it } from "vitest";

import {
  botSignals,
  emailAddress,
  httpsUrl,
  plainText,
  secretText,
  strongPassword,
  uuid,
} from "@/lib/validation";

describe("security input validation", () => {
  it("normalizes bounded plain text and rejects control characters", () => {
    expect(
      plainText("  Relief program  ", { min: 2, max: 30, name: "Name" }),
    ).toBe("Relief program");
    expect(() =>
      plainText("unsafe\u0000text", { min: 2, max: 30, name: "Name" }),
    ).toThrow();
  });

  it("accepts HTTPS URLs without embedded credentials", () => {
    expect(httpsUrl("https://example.org/help", "Source").hostname).toBe(
      "example.org",
    );
    expect(() => httpsUrl("http://example.org", "Source")).toThrow();
    expect(() => httpsUrl("https://user:pass@example.org", "Source")).toThrow();
  });

  it("does not trim or normalize password input", () => {
    expect(
      secretText(" leading-and-trailing ", {
        min: 1,
        max: 30,
        name: "Password",
      }),
    ).toBe(" leading-and-trailing ");
  });

  it("enforces the configured Supabase password policy", () => {
    expect(strongPassword("TrackAid!2026")).toBe("TrackAid!2026");
    expect(() => strongPassword("alllowercase1!")).toThrow();
    expect(() => strongPassword("NoSymbols1234")).toThrow();
  });

  it("validates email, UUID, and bot timing signals", () => {
    expect(emailAddress("OWNER@EXAMPLE.ORG")).toBe("owner@example.org");
    expect(uuid("59d3772c-1d55-45e5-800f-1f66fb7b0079")).toBeTruthy();
    expect(botSignals({ website: "", startedAt: Date.now() - 2000 })).toBe(
      true,
    );
    expect(
      botSignals({ website: "filled", startedAt: Date.now() - 2000 }),
    ).toBe(false);
  });
});
