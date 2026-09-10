// Layout for the light-mode A.T. Field marks running down the page edges.
//
// Two constraints the design depends on:
//   1. No two marks may share a horizontal line.
//   2. Sides alternate, so the page stays visually balanced.
// Both are properties of the generated list, so they're testable.

export interface ATMark {
  top: number; // % down the document
  side: "left" | "right";
  size: number; // % of viewport width
  bleed: number; // % offset past the edge (negative = hangs off)
}

const SIZES = [30, 22, 26, 19, 33, 24, 28, 21, 25];
const BLEEDS = [-11, -8, -14, -6, -12, -9, -13, -7, -10];

export function atFieldMarks(count = 9, from = 7, to = 93): ATMark[] {
  if (count < 2) throw new Error("atFieldMarks needs at least 2 marks");
  const step = (to - from) / (count - 1);
  return Array.from({ length: count }, (_, i) => ({
    top: from + i * step,
    side: i % 2 === 0 ? ("right" as const) : ("left" as const),
    size: SIZES[i % SIZES.length],
    bleed: BLEEDS[i % BLEEDS.length],
  }));
}

/** Vertical span a mark occupies, approximating its height from its width. */
export function markSpan(m: ATMark, aspect = 1): [number, number] {
  const half = (m.size * aspect) / 2;
  return [m.top - half, m.top + half];
}
