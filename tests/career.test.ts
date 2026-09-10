import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { careerSchema, SCHEMAS } from "@/content/schemas";

const entries = JSON.parse(readFileSync("src/data/career.json", "utf8"));

describe("career.json", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBe(9);
  });

  it("gives every entry a unique id for the file() loader", () => {
    const ids = entries.map((e: { id: string }) => e.id);
    expect(ids.every((id: string) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every entry against the schema", () => {
    for (const entry of entries) {
      const result = careerSchema.safeParse(entry);
      if (!result.success) {
        throw new Error(`${entry.id}: ${JSON.stringify(result.error.issues)}`);
      }
    }
  });

  it("preserves the newest-first order from the original component", () => {
    expect(entries[0].title).toBe("Unilever Marvel 3");
    expect(entries[0].stamp).toBe("2025");
    expect(entries.at(-1).title).toBe("FIRST GAME // ABYSS CRAWLER");
  });

  it("keeps the role entry's org", () => {
    const role = entries.find((e: { kind: string }) => e.kind === "role");
    expect(role.org).toBe("Studio-23 · Brain Station 23");
  });
});

describe("careerSchema", () => {
  it("rejects an unknown tone", () => {
    expect(
      careerSchema.safeParse({
        stamp: "2025", title: "T", detail: "D", tone: "green", kind: "role",
      }).success
    ).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(
      careerSchema.safeParse({
        stamp: "2025", title: "T", detail: "D", tone: "cyan", kind: "hobby",
      }).success
    ).toBe(false);
  });

  it("is registered under SCHEMAS.career", () => {
    expect(SCHEMAS.career).toBe(careerSchema);
  });
});
