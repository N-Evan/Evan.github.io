// Which section owns the viewport's focal line.
//
// The previous approach used IntersectionObserver ratio thresholds, which
// silently fails for any section TALLER than the viewport: its ratio can
// never reach 0.3, so it never activates and a neighbour stays lit instead.
// Position beats ratio here.

export interface SectionBox {
  id: string;
  top: number;
  bottom: number;
}

/**
 * Returns the id of the section containing `line` (a y-offset in viewport
 * coordinates), else the last section scrolled past, else the first.
 * Sections are expected in document order.
 */
export function pickActiveSection(boxes: SectionBox[], line: number): string | null {
  if (boxes.length === 0) return null;

  let current = boxes[0].id;
  for (const b of boxes) {
    if (b.top <= line && b.bottom > line) return b.id;
    if (b.top <= line) current = b.id;
  }
  return current;
}
