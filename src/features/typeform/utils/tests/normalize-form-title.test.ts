import { describe, expect, it } from "vitest";
import { normalizeFormTitle } from "../normalize-form-title";

describe("normalizeFormTitle", () => {
  it.each([
    ["  ENCUESTA  de\tOPINIÓN\n", "encuesta de opinión"],
    ["ＥＮＣＵＥＳＴＡ\u00a0de\u3000OPINIÓN", "encuesta de opinión"],
    ["Opinio\u0301n", "opinión"],
    [" \t\n ", ""],
  ])("normalizes whitespace, NFKC and case: %j", (title, expected) => {
    expect(normalizeFormTitle(title)).toBe(expected);
  });

  it("preserves accents and punctuation differences", () => {
    expect(normalizeFormTitle("Opinión")).not.toBe(normalizeFormTitle("Opinion"));
    expect(normalizeFormTitle("Año")).not.toBe(normalizeFormTitle("Ano"));
    expect(normalizeFormTitle("Encuesta-1")).not.toBe(normalizeFormTitle("Encuesta 1"));
  });
});