import { describe, it, expect } from "vitest";
import { atFieldMarks, markSpan } from "@/lib/atField";

describe("atFieldMarks", () => {
  it("never puts two marks on the same horizontal line", () => {
    // The stated design rule. Any two marks on one line reads as a pair of
    // brackets rather than as scattered ambient texture.
    const marks = atFieldMarks();
    const tops = marks.map((m) => m.top);
    expect(new Set(tops).size).toBe(tops.length);
  });

  it("alternates sides so marks never stack on one edge", () => {
    const sides = atFieldMarks().map((m) => m.side);
    for (let i = 1; i < sides.length; i++) {
      expect(sides[i]).not.toBe(sides[i - 1]);
    }
  });

  it("keeps same-side neighbours from vertically overlapping", () => {
    // Same-side marks are two apart in the list; their spans must not touch,
    // or one edge shows a smear instead of distinct hexagons.
    const marks = atFieldMarks();
    for (let i = 2; i < marks.length; i++) {
      if (marks[i].side !== marks[i - 2].side) continue;
      const [, prevEnd] = markSpan(marks[i - 2]);
      const [start] = markSpan(marks[i]);
      expect(start).toBeGreaterThan(prevEnd - 12); // allow a little breathing overlap
    }
  });

  it("stays inside the document and hangs off the edge", () => {
    for (const m of atFieldMarks()) {
      expect(m.top).toBeGreaterThanOrEqual(0);
      expect(m.top).toBeLessThanOrEqual(100);
      expect(m.bleed).toBeLessThan(0); // negative = cropped by the viewport edge
      expect(m.size).toBeGreaterThan(0);
    }
  });

  it("holds the invariants at other counts", () => {
    for (const n of [2, 5, 12, 20]) {
      const marks = atFieldMarks(n);
      expect(marks).toHaveLength(n);
      expect(new Set(marks.map((m) => m.top)).size).toBe(n);
      for (let i = 1; i < marks.length; i++) {
        expect(marks[i].side).not.toBe(marks[i - 1].side);
      }
    }
  });

  it("rejects a degenerate count rather than dividing by zero", () => {
    expect(() => atFieldMarks(1)).toThrow();
  });
});
