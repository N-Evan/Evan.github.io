import { describe, it, expect } from "vitest";
import { evaluateProject, renderChecklist, type RawProject } from "@/lib/projectChecklist";

const FULL: RawProject = {
  id: "silent-scream",
  data: {
    title: "Silent Scream",
    tagline: "A horror cooking game.",
    thumb: "/images/thumbs/silent-scream.png",
    keyInsights: ["a", "b", "c"],
    gallery: ["/g/1.png", "/g/2.png", "/g/3.png", "/g/4.png"],
    links: { steam: "https://example.com" },
  },
  body: "## Role & Responsibilities\nReal text.\n## Learnings\nReal text.\n## Behind the Scenes\nReal text.\n",
};

describe("evaluateProject", () => {
  it("flags everything complete on a fully filled project", () => {
    const r = evaluateProject(FULL);
    expect(r.checks.heroArt).toBe(true);
    expect(r.checks.tagline).toBe(true);
    expect(r.checks.keyInsightsAtLeast3).toBe(true);
    expect(r.checks.galleryAtLeast4).toBe(true);
    expect(r.checks.roleSection).toBe(true);
    expect(r.checks.learningsSection).toBe(true);
    expect(r.checks.btsSection).toBe(true);
    expect(r.checks.atLeastOneLink).toBe(true);
  });

  it("fails sections that contain only [ FILL ME IN ]", () => {
    const r = evaluateProject({
      ...FULL,
      body: "## Role & Responsibilities\n[ FILL ME IN ]\n## Learnings\n[ FILL ME IN ]\n## Behind the Scenes\n[ FILL ME IN ]\n",
    });
    expect(r.checks.roleSection).toBe(false);
    expect(r.checks.learningsSection).toBe(false);
    expect(r.checks.btsSection).toBe(false);
  });

  it("fails when fewer than 3 key insights", () => {
    const r = evaluateProject({ ...FULL, data: { ...FULL.data, keyInsights: ["a"] } });
    expect(r.checks.keyInsightsAtLeast3).toBe(false);
  });

  it("fails when fewer than 4 gallery images", () => {
    const r = evaluateProject({ ...FULL, data: { ...FULL.data, gallery: ["only"] } });
    expect(r.checks.galleryAtLeast4).toBe(false);
  });

  it("fails when no links provided", () => {
    const r = evaluateProject({ ...FULL, data: { ...FULL.data, links: undefined } });
    expect(r.checks.atLeastOneLink).toBe(false);
  });
});

describe("renderChecklist", () => {
  it("renders a markdown checklist with one entry per project", () => {
    const md = renderChecklist([FULL]);
    expect(md).toContain("# Content Checklist");
    expect(md).toContain("## Silent Scream");
    expect(md).toContain("- [x] Hero art present");
  });

  it("uses [ ] for incomplete items and [x] for complete", () => {
    const incomplete: RawProject = {
      ...FULL,
      data: { ...FULL.data, keyInsights: [] },
      body: "## Role & Responsibilities\n[ FILL ME IN ]\n",
    };
    const md = renderChecklist([incomplete]);
    expect(md).toContain("- [ ] Key insights ≥ 3");
    expect(md).toContain("- [ ] Role & Responsibilities filled");
  });
});
