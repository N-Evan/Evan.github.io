import { describe, it, expect } from "vitest";
import { projectSchema, postSchema, SCHEMAS } from "@/content/schemas";

const validProject = {
  title: "Aetherfall",
  order: 1,
  year: 2025,
  status: "shipped",
  employmentType: "employee",
  platforms: ["PC"],
  teamSize: 8,
  duration: "6 months",
  role: "Gameplay Programmer",
  tagline: "A tagline",
  thumb: "/images/thumbs/aetherfall.png",
  tech: ["Unity", "C#"],
};

describe("projectSchema", () => {
  it("accepts a valid project", () => {
    expect(projectSchema.safeParse(validProject).success).toBe(true);
  });

  it("rejects an unknown status", () => {
    const bad = { ...validProject, status: "cancelled" };
    expect(projectSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an empty platforms array", () => {
    const bad = { ...validProject, platforms: [] };
    expect(projectSchema.safeParse(bad).success).toBe(false);
  });

  it("exposes keys in declaration order for stable YAML output", () => {
    const keys = Object.keys(projectSchema.shape);
    expect(keys.slice(0, 4)).toEqual(["title", "order", "year", "status"]);
    expect(keys).toContain("snippets");
  });
});

describe("postSchema", () => {
  it("coerces a date string", () => {
    const parsed = postSchema.parse({
      title: "Post",
      summary: "A summary",
      date: "2026-01-02",
    });
    expect(parsed.date).toBeInstanceOf(Date);
  });

  it("defaults author and draft", () => {
    const parsed = postSchema.parse({ title: "P", summary: "S", date: "2026-01-02" });
    expect(parsed.author).toBe("Md. Nurusshafi Evan");
    expect(parsed.draft).toBe(false);
  });
});

describe("SCHEMAS", () => {
  it("maps collection names to schemas", () => {
    expect(SCHEMAS.projects).toBe(projectSchema);
    expect(SCHEMAS.posts).toBe(postSchema);
  });
});
