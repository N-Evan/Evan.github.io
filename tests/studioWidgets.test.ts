import { describe, it, expect } from "vitest";
import { parseTagInput, linksToRows, rowsToLinks, coerceValue } from "@/studio/widgets";
import type { Field } from "@/studio/fields";

const field = (widget: Field["widget"]): Field => ({ key: "k", label: "K", widget });

describe("parseTagInput", () => {
  it("splits on commas", () => {
    expect(parseTagInput("Unity, C#, HLSL")).toEqual(["Unity", "C#", "HLSL"]);
  });

  it("drops empties and trims", () => {
    expect(parseTagInput("  PC ,, Xbox ,  ")).toEqual(["PC", "Xbox"]);
  });

  it("dedupes while preserving first-seen order", () => {
    expect(parseTagInput("PC, Xbox, PC")).toEqual(["PC", "Xbox"]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseTagInput("   ")).toEqual([]);
  });
});

describe("links round-trip", () => {
  it("converts the schema object to editable rows", () => {
    expect(linksToRows({ steam: "https://s", github: "https://g" })).toEqual([
      { platform: "steam", url: "https://s" },
      { platform: "github", url: "https://g" },
    ]);
  });

  it("returns an empty array for undefined", () => {
    expect(linksToRows(undefined)).toEqual([]);
  });

  it("converts rows back to the schema object", () => {
    expect(rowsToLinks([{ platform: "itch", url: "https://i" }])).toEqual({
      itch: "https://i",
    });
  });

  it("drops rows with a blank url so optional links stay absent", () => {
    expect(rowsToLinks([
      { platform: "itch", url: "" },
      { platform: "steam", url: "https://s" },
    ])).toEqual({ steam: "https://s" });
  });

  it("survives a full round-trip", () => {
    const links = { steam: "https://s", youtube: "https://y" };
    expect(rowsToLinks(linksToRows(links))).toEqual(links);
  });
});

describe("coerceValue", () => {
  it("parses numbers", () => {
    expect(coerceValue(field("number"), "2026")).toBe(2026);
  });

  it("returns undefined for a blank number rather than NaN", () => {
    expect(coerceValue(field("number"), "")).toBeUndefined();
  });

  it("parses booleans from checkbox strings", () => {
    expect(coerceValue(field("bool"), "true")).toBe(true);
    expect(coerceValue(field("bool"), "")).toBe(false);
  });

  it("maps a blank optional text field to undefined so the key is omitted", () => {
    expect(coerceValue(field("text"), "  ")).toBeUndefined();
  });

  it("keeps teamSize as the literal Individual", () => {
    expect(coerceValue({ key: "teamSize", label: "T", widget: "text" }, "Individual"))
      .toBe("Individual");
  });

  it("coerces a numeric teamSize to a number", () => {
    expect(coerceValue({ key: "teamSize", label: "T", widget: "text" }, "8")).toBe(8);
  });

  it("passes dates through as ISO strings", () => {
    expect(coerceValue(field("date"), "2026-03-04")).toBe("2026-03-04");
  });
});
