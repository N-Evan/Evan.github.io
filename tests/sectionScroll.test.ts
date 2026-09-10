import { describe, it, expect } from "vitest";
import { pickActiveSection, type SectionBox } from "@/lib/sectionScroll";

// Mirrors the real page: #career is a long timeline, taller than the
// viewport. That is the case the old ratio-threshold observer got wrong.
const VIEWPORT = 800;
const LINE = VIEWPORT * 0.38; // 304

const at = (scroll: number): SectionBox[] =>
  [
    { id: "press-start", top: 0, height: 800 },
    { id: "profile", top: 800, height: 900 },
    { id: "missions", top: 1700, height: 1200 },
    { id: "loadout", top: 2900, height: 700 },
    { id: "architecture", top: 3600, height: 600 },
    { id: "career", top: 4200, height: 2400 }, // 3x viewport height
    { id: "comms", top: 6600, height: 900 },
  ].map((s) => ({ id: s.id, top: s.top - scroll, bottom: s.top + s.height - scroll }));

describe("pickActiveSection", () => {
  it("activates a section taller than the viewport", () => {
    // Scrolled to the middle of #career. The old code left #loadout or
    // #comms lit here because career's intersection ratio never hit 0.3.
    for (const scroll of [4000, 4500, 5000, 5500, 6000, 6200]) {
      expect(pickActiveSection(at(scroll), LINE)).toBe("career");
    }
  });

  it("activates the newly added architecture section", () => {
    expect(pickActiveSection(at(3500), LINE)).toBe("architecture");
  });

  it("walks every section in order as the page scrolls", () => {
    const seen: string[] = [];
    for (let scroll = 0; scroll <= 7000; scroll += 50) {
      const id = pickActiveSection(at(scroll), LINE);
      if (id && seen[seen.length - 1] !== id) seen.push(id);
    }
    expect(seen).toEqual([
      "press-start", "profile", "missions", "loadout",
      "architecture", "career", "comms",
    ]);
  });

  it("holds the first section above the fold and the last at the bottom", () => {
    expect(pickActiveSection(at(0), LINE)).toBe("press-start");
    expect(pickActiveSection(at(99999), LINE)).toBe("comms");
  });

  it("returns null for no sections", () => {
    expect(pickActiveSection([], LINE)).toBeNull();
  });
});
