import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TYPES, listEntries, readEntry, slugify } from "@/studio/store.mjs";

let root: string;

type Entry = { id: string; title: string; sort: number; data: any };


const project = (title: string, order: number) =>
  `---\ntitle: ${title}\norder: ${order}\nyear: 2025\n---\n\n## Role\n\nBody of ${title}.\n`;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "studio-"));
  await mkdir(join(root, "src/content/projects"), { recursive: true });
  await mkdir(join(root, "src/content/posts"), { recursive: true });
  await mkdir(join(root, "src/data"), { recursive: true });
  await writeFile(join(root, "src/content/projects/beta.md"), project("Beta", 2));
  await writeFile(join(root, "src/content/projects/alpha.md"), project("Alpha", 1));
  await writeFile(
    join(root, "src/content/posts/older.md"),
    "---\ntitle: Older\ndate: 2025-01-01\n---\n\nold\n"
  );
  await writeFile(
    join(root, "src/content/posts/newer.md"),
    "---\ntitle: Newer\ndate: 2026-01-01\n---\n\nnew\n"
  );
  await writeFile(
    join(root, "src/data/career.json"),
    JSON.stringify([
      { id: "b", stamp: "2025", title: "B", detail: "d", tone: "cyan", kind: "role" },
      { id: "a", stamp: "2024", title: "A", detail: "d", tone: "cyan", kind: "role" },
    ])
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TYPES", () => {
  it("covers the three authorable collections", () => {
    expect(Object.keys(TYPES)).toEqual(["projects", "posts", "career"]);
    expect(TYPES.projects.kind).toBe("md");
    expect(TYPES.career.kind).toBe("json");
  });
});

describe("listEntries", () => {
  it("sorts projects by order ascending", async () => {
    const list = await listEntries(root, "projects");
    expect(list.map((e: Entry) => e.id)).toEqual(["alpha", "beta"]);
    expect(list[0].title).toBe("Alpha");
  });

  it("sorts posts newest first", async () => {
    const list = await listEntries(root, "posts");
    expect(list.map((e: Entry) => e.id)).toEqual(["newer", "older"]);
  });

  it("returns career entries in JSON array order", async () => {
    const list = await listEntries(root, "career");
    expect(list.map((e: Entry) => e.id)).toEqual(["b", "a"]);
  });

  it("returns an empty array when the directory is missing", async () => {
    const empty = await mkdtemp(join(tmpdir(), "studio-empty-"));
    expect(await listEntries(empty, "projects")).toEqual([]);
    await rm(empty, { recursive: true, force: true });
  });

  it("rejects an unknown type", async () => {
    await expect(listEntries(root, "nope")).rejects.toThrow(/unknown type/i);
  });
});

describe("readEntry", () => {
  it("returns data and body for a markdown entry", async () => {
    const entry = await readEntry(root, "projects", "alpha");
    expect(entry.id).toBe("alpha");
    expect(entry.data.order).toBe(1);
    expect(entry.body).toBe("\n## Role\n\nBody of Alpha.\n");
  });

  it("returns an empty body for a career entry", async () => {
    const entry = await readEntry(root, "career", "a");
    expect(entry.data.title).toBe("A");
    expect(entry.body).toBe("");
  });

  it("throws ENOENT for a missing entry", async () => {
    await expect(readEntry(root, "projects", "ghost")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("refuses an id containing path traversal", async () => {
    await expect(readEntry(root, "projects", "../../secret")).rejects.toThrow(/invalid id/i);
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Aetherfall II")).toBe("aetherfall-ii");
  });

  it("strips punctuation and collapses separators", () => {
    expect(slugify("SHIPPED // Silent Scream!")).toBe("shipped-silent-scream");
  });

  it("strips accents", () => {
    expect(slugify("Café München")).toBe("cafe-munchen");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("-- hello --")).toBe("hello");
  });

  it("returns an empty string for input with no usable characters", () => {
    expect(slugify("!!!")).toBe("");
  });
});
