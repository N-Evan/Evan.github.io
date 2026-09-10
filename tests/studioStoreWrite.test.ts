import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createEntry, writeEntry, deleteEntry, reorderEntries, listEntries, readEntry,
} from "@/studio/store.mjs";

let root: string;

type Entry = { id: string; title: string; sort: number; data: any };

const KEYS = ["title", "order", "year", "tagline"];

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "studio-w-"));
  await mkdir(join(root, "src/content/projects"), { recursive: true });
  await mkdir(join(root, "src/data"), { recursive: true });
  await writeFile(
    join(root, "src/content/projects/alpha.md"),
    "---\ntitle: Alpha\norder: 1\nyear: 2024\n---\n\n## Role\n\nKeep me.\n"
  );
  await writeFile(
    join(root, "src/content/projects/beta.md"),
    "---\ntitle: Beta\norder: 2\nyear: 2025\n---\n\nbeta body\n"
  );
  await writeFile(
    join(root, "src/data/career.json"),
    JSON.stringify(
      [
        { id: "b", stamp: "2025", title: "B", detail: "d", tone: "cyan", kind: "role" },
        { id: "a", stamp: "2024", title: "A", detail: "d", tone: "cyan", kind: "role" },
      ],
      null, 2
    ) + "\n"
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("createEntry", () => {
  it("derives the filename from the title", async () => {
    const { id } = await createEntry(
      root, "projects", { title: "Aetherfall II", order: 3 }, "\nbody\n", KEYS
    );
    expect(id).toBe("aetherfall-ii");
    const files = await readdir(join(root, "src/content/projects"));
    expect(files).toContain("aetherfall-ii.md");
  });

  it("refuses to overwrite an existing entry", async () => {
    await expect(
      createEntry(root, "projects", { title: "Alpha" }, "", KEYS)
    ).rejects.toMatchObject({ code: "EEXIST" });
  });

  it("rejects a title that slugifies to nothing", async () => {
    await expect(
      createEntry(root, "projects", { title: "!!!" }, "", KEYS)
    ).rejects.toThrow(/title/i);
  });

  it("appends a new career entry to the JSON array", async () => {
    await createEntry(
      root, "career",
      { title: "New Role", stamp: "2026", detail: "d", tone: "magenta", kind: "role" },
      "", []
    );
    const list = await listEntries(root, "career");
    expect(list.map((e: Entry) => e.id)).toEqual(["b", "a", "new-role"]);
  });

  it("leaves no .tmp files behind", async () => {
    await createEntry(root, "projects", { title: "Gamma" }, "", KEYS);
    const files = await readdir(join(root, "src/content/projects"));
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
  });
});

describe("writeEntry", () => {
  it("updates frontmatter and preserves the body", async () => {
    const before = await readEntry(root, "projects", "alpha");
    await writeEntry(
      root, "projects", "alpha",
      { ...before.data, year: 2030 }, before.body, KEYS
    );
    const after = await readEntry(root, "projects", "alpha");
    expect(after.data.year).toBe(2030);
    expect(after.body).toBe("\n## Role\n\nKeep me.\n");
  });

  it("emits frontmatter keys in the requested order", async () => {
    await writeEntry(
      root, "projects", "alpha",
      { year: 2030, title: "Alpha", order: 1 }, "\nx\n", KEYS
    );
    const raw = await readFile(join(root, "src/content/projects/alpha.md"), "utf8");
    expect(raw.indexOf("title:")).toBeLessThan(raw.indexOf("order:"));
    expect(raw.indexOf("order:")).toBeLessThan(raw.indexOf("year:"));
  });

  it("updates a career entry in place without moving it", async () => {
    await writeEntry(
      root, "career", "a",
      { stamp: "2024", title: "A renamed", detail: "d", tone: "yellow", kind: "role" },
      "", []
    );
    const list = await listEntries(root, "career");
    expect(list.map((e: Entry) => e.id)).toEqual(["b", "a"]);
    expect(list[1].data.title).toBe("A renamed");
    expect(list[1].data.tone).toBe("yellow");
  });

  it("renames the file when the title changes", async () => {
    const before = await readEntry(root, "projects", "alpha");
    const { id } = await writeEntry(
      root, "projects", "alpha",
      { ...before.data, title: "Alpha Reborn" }, before.body, KEYS
    );
    expect(id).toBe("alpha-reborn");
    const files = await readdir(join(root, "src/content/projects"));
    expect(files).toContain("alpha-reborn.md");
    expect(files).not.toContain("alpha.md");
    expect((await readEntry(root, "projects", "alpha-reborn")).body).toBe(
      "\n## Role\n\nKeep me.\n"
    );
  });

  it("refuses a retitle that collides with another entry", async () => {
    const before = await readEntry(root, "projects", "alpha");
    await expect(
      writeEntry(root, "projects", "alpha", { ...before.data, title: "Beta" }, before.body, KEYS)
    ).rejects.toMatchObject({ code: "EEXIST" });
    const files = await readdir(join(root, "src/content/projects"));
    expect(files).toContain("alpha.md");
    expect(await readFile(join(root, "src/content/projects/beta.md"), "utf8")).toContain(
      "beta body"
    );
  });

  it("keeps the filename when the title only changes cosmetically", async () => {
    const before = await readEntry(root, "projects", "alpha");
    const { id } = await writeEntry(
      root, "projects", "alpha",
      { ...before.data, title: "  Alpha!  " }, before.body, KEYS
    );
    expect(id).toBe("alpha");
    expect(await readdir(join(root, "src/content/projects"))).toContain("alpha.md");
  });

  it("leaves no .tmp file behind after a rename", async () => {
    const before = await readEntry(root, "projects", "alpha");
    await writeEntry(
      root, "projects", "alpha", { ...before.data, title: "Alpha Two" }, before.body, KEYS
    );
    const files = await readdir(join(root, "src/content/projects"));
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
  });

  it("throws ENOENT when the entry does not exist", async () => {
    await expect(
      writeEntry(root, "projects", "ghost", { title: "G" }, "", KEYS)
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("deleteEntry", () => {
  it("removes the file and copies it to the trash", async () => {
    const { trashed } = await deleteEntry(root, "projects", "beta");
    const files = await readdir(join(root, "src/content/projects"));
    expect(files).not.toContain("beta.md");
    expect(await readFile(trashed, "utf8")).toContain("title: Beta");
  });

  it("removes a career entry from the array", async () => {
    await deleteEntry(root, "career", "b");
    const list = await listEntries(root, "career");
    expect(list.map((e: Entry) => e.id)).toEqual(["a"]);
  });

  it("trashes a career entry as JSON", async () => {
    const { trashed } = await deleteEntry(root, "career", "b");
    expect(JSON.parse(await readFile(trashed, "utf8")).title).toBe("B");
  });

  it("throws ENOENT for a missing entry", async () => {
    await expect(deleteEntry(root, "projects", "ghost")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});

describe("reorderEntries", () => {
  it("renumbers project order fields to match the given sequence", async () => {
    await reorderEntries(root, "projects", ["beta", "alpha"]);
    const list = await listEntries(root, "projects");
    expect(list.map((e: Entry) => e.id)).toEqual(["beta", "alpha"]);
    expect(list.map((e: Entry) => e.data.order)).toEqual([1, 2]);
  });

  it("preserves project bodies while reordering", async () => {
    await reorderEntries(root, "projects", ["beta", "alpha"]);
    expect((await readEntry(root, "projects", "alpha")).body).toBe(
      "\n## Role\n\nKeep me.\n"
    );
  });

  it("splices the career array", async () => {
    await reorderEntries(root, "career", ["a", "b"]);
    expect((await listEntries(root, "career")).map((e: Entry) => e.id)).toEqual(["a", "b"]);
  });

  it("rejects a list that does not match the existing ids", async () => {
    await expect(reorderEntries(root, "projects", ["alpha"])).rejects.toThrow(/match/i);
    await expect(
      reorderEntries(root, "projects", ["alpha", "ghost"])
    ).rejects.toThrow(/match/i);
  });

  it("rejects reordering posts, which are date-sorted", async () => {
    await expect(reorderEntries(root, "posts", [])).rejects.toThrow(/not reorderable/i);
  });
});
