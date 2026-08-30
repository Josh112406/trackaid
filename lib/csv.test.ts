import { describe, expect, it } from "vitest";

import { toCsv } from "@/lib/csv";

describe("CSV reports", () => {
  it("escapes commas and quotation marks", () => {
    expect(toCsv([{ name: 'Relief, "North"', amount: 500 }])).toBe(
      '"name","amount"\r\n"Relief, ""North""","500"',
    );
  });

  it("returns an empty file for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("neutralizes spreadsheet formulas in user-controlled cells", () => {
    expect(toCsv([{ name: '=HYPERLINK("https://example.org")' }])).toBe(
      '"name"\r\n"\'=HYPERLINK(""https://example.org"")"',
    );
  });
});
