# Studio Authoring Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local-only authoring UI at `/studio` that creates, edits, reorders, and deletes projects, devlog posts, and career entries, previewing each through the real site components, and that cannot appear in a production build.

**Architecture:** All filesystem logic lives in plain `.mjs` modules under `src/studio/` that take a repo root as their first argument, so they are unit-testable against temp directories. HTTP is a thin Connect middleware mounted in Vite's `configureServer` hook — a hook with no production counterpart. The UI is an Astro page injected only when `command === "dev"`, and the preview is an `<iframe>` pointed at the running dev server rather than a reimplementation of the site's cards.

**Tech Stack:** Astro 5.18, Vite 6, `yaml` 2.8, `zod` 3.25, `sharp` 0.34, Vitest 2. No new downloads — `yaml` and `zod` already resolve in `node_modules` as transitive dependencies and are promoted to explicit `devDependencies`.

**Spec:** `docs/superpowers/specs/2026-09-11-studio-authoring-tool-design.md`

## Global Constraints

- **Never add a route under `src/pages/`.** The studio UI lives in `src/studio/` and is injected via `injectRoute` guarded on `command === "dev"`. A file under `src/pages/` would be discovered by the router and built into `dist/`.
- **The write API mounts only in `configureServer`,** with `apply: "serve"` on the Vite plugin. No `astro:build:*` hook may reference the studio.
- **`npm run build` output must stay byte-identical to today's** apart from the career refactor, which must produce identical HTML.
- **All filesystem modules take `root` as the first parameter.** No module resolves paths relative to `import.meta.url` except to compute a default root at the call site in `server.mjs`.
- **Every path segment derived from user input is passed through `slugify` server-side** before touching the filesystem. Entry ids and image filenames both.
- **Writes are atomic:** write `<path>.tmp`, then `rename`. A partially written content file crashes the dev server.
- **Frontmatter key order comes from `Object.keys(schema.shape)`.** Zod preserves declaration order, so YAML key order matches the schema and diffs stay stable.
- **Bodies are preserved verbatim.** Only frontmatter is ever rewritten on edit.
- Existing content files in `src/content/projects/` and `src/content/posts/` must not be modified by any task except a reorder that changes `order` values.
- Image targets: `thumb` 1500x750, `gallery` 1600x900, `cover` 1200x630, all PNG, `fit: "cover"`.
- Test style follows `tests/projectNav.test.ts`: `import { describe, it, expect } from "vitest"`, `@/` alias for `src/`.

---

### Task 1: Promote dependencies and extract Zod schemas

Moves the collection schemas out of `src/content.config.ts` into a plain TS module that imports `zod` directly, so the studio server can load it with `ssrLoadModule` without needing Astro's `astro:content` virtual module in its resolution chain.

**Files:**
- Modify: `package.json` (devDependencies)
- Create: `src/content/schemas.ts`
- Modify: `src/content.config.ts` (replace inline schemas with imports)
- Test: `tests/schemas.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `src/content/schemas.ts` exporting `projectSchema`, `postSchema` (both `z.ZodObject`), and `SCHEMAS: Record<"projects" | "posts", z.ZodObject<any>>`. Task 3 adds `careerSchema` to the same file and the same map. Tasks 4, 5 and 7 load this module and read `Object.keys(schema.shape)` for key ordering and `schema.safeParse(data)` for validation.

- [ ] **Step 1: Write the failing test**

Create `tests/schemas.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schemas.test.ts`
Expected: FAIL — cannot resolve `@/content/schemas`.

- [ ] **Step 3: Promote the dependencies**

Run:

```bash
npm install --save-dev yaml@^2.8.4 zod@^3.25.76
```

Both already exist in `node_modules` as transitive dependencies, so this only adds the explicit entries to `package.json` and pins them in `package-lock.json`. Confirm no unrelated package versions changed with `git diff package-lock.json | head -40`.

- [ ] **Step 4: Create the schemas module**

Create `src/content/schemas.ts`. The field order is copied verbatim from the current `src/content.config.ts` so YAML key order is unchanged:

```ts
// Collection schemas, defined against `zod` directly rather than the `z`
// re-exported from `astro:content`, so the studio dev server can load this
// module with Vite's ssrLoadModule without Astro's virtual modules in scope.
import { z } from "zod";

export const postSchema = z.object({
  title: z.string(),
  summary: z.string().max(220),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  cover: z.string().optional(),
  draft: z.boolean().default(false),
  author: z.string().default("Md. Nurusshafi Evan"),
});

export const projectSchema = z.object({
  title: z.string(),
  order: z.number(),
  year: z.number(),
  status: z.enum(["shipped", "in-development", "concept"]),
  studio: z.string().nullable().optional(),
  employmentType: z.enum(["employee", "personal", "freelance"]),
  platforms: z.array(z.string()).min(1),
  teamSize: z.union([z.number(), z.literal("Individual")]),
  duration: z.string(),
  role: z.string(),
  tagline: z.string().max(140),
  thumb: z.string(),
  genres: z.array(z.string()).optional(),
  tech: z.array(z.string()).min(1),
  links: z
    .object({
      steam: z.string().url().optional(),
      itch: z.string().url().optional(),
      github: z.string().url().optional(),
      youtube: z.string().url().optional(),
      website: z.string().url().optional(),
    })
    .partial()
    .optional(),
  keyInsights: z.array(z.string()).max(4).optional(),
  gallery: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  snippets: z
    .array(
      z.object({
        title: z.string(),
        language: z.string(),
        code: z.string(),
        caption: z.string().optional(),
      })
    )
    .optional(),
});

export const SCHEMAS = {
  projects: projectSchema,
  posts: postSchema,
} as const;
```

- [ ] **Step 5: Rewrite content.config.ts to import them**

Replace the whole of `src/content.config.ts` with:

```ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { postSchema, projectSchema } from "./content/schemas";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: postSchema,
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: projectSchema,
});

export const collections = { projects, posts };
```

- [ ] **Step 6: Run the tests and the build**

Run: `npx vitest run tests/schemas.test.ts`
Expected: PASS, all 8 assertions.

Run: `npm run build`
Expected: succeeds, same page count as before. The glob loader still finds 6 projects and 2 posts.

Run: `npx astro check`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/content/schemas.ts src/content.config.ts tests/schemas.test.ts
git commit -m "refactor: extract collection schemas to a zod-only module

Lets the studio dev server validate writes against the same schemas the
build uses. Promotes yaml and zod from transitive to explicit devDeps;
both already resolved in node_modules, so no new download."
```

---

### Task 2: Frontmatter round-trip module

The one piece of logic where a bug silently corrupts content. Multi-line `snippets[].code` values are why this uses a real YAML library instead of the hand-rolled parser currently living in `src/scripts/generate-checklist.mjs`, which is deleted here.

**Files:**
- Create: `src/studio/frontmatter.mjs`
- Modify: `src/scripts/generate-checklist.mjs` (delete its local `parseFrontmatter`, import the shared one)
- Test: `tests/frontmatter.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parseFrontmatter(src: string): { data: object, body: string }`
  - `stringifyFrontmatter(data: object, body: string, keyOrder?: string[]): string`
  Tasks 4 and 5 use both. `keyOrder` is filled from `Object.keys(schema.shape)`.

- [ ] **Step 1: Write the failing test**

Create `tests/frontmatter.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseFrontmatter, stringifyFrontmatter } from "@/studio/frontmatter.mjs";

const SNIPPET_DOC = [
  "---",
  "title: Aetherfall",
  "order: 1",
  "snippets:",
  "  - title: Dash",
  "    language: csharp",
  "    code: |-",
  "      void Dash() {",
  "        if (grounded) {",
  "          velocity += dir * force;",
  "        }",
  "      }",
  "---",
  "",
  "## Role & Responsibilities",
  "",
  "Did the thing.",
  "",
].join("\n");

describe("parseFrontmatter", () => {
  it("splits frontmatter from body", () => {
    const { data, body } = parseFrontmatter(SNIPPET_DOC);
    expect(data.title).toBe("Aetherfall");
    expect(data.order).toBe(1);
    expect(body).toBe("\n## Role & Responsibilities\n\nDid the thing.\n");
  });

  it("preserves multi-line code exactly", () => {
    const { data } = parseFrontmatter(SNIPPET_DOC);
    expect(data.snippets[0].code).toBe(
      "void Dash() {\n  if (grounded) {\n    velocity += dir * force;\n  }\n}"
    );
  });

  it("returns the whole input as body when there is no fence", () => {
    expect(parseFrontmatter("# Just markdown")).toEqual({
      data: {},
      body: "# Just markdown",
    });
  });

  it("handles CRLF line endings", () => {
    const { data, body } = parseFrontmatter("---\r\ntitle: X\r\n---\r\nbody\r\n");
    expect(data.title).toBe("X");
    expect(body).toBe("body\r\n");
  });
});

describe("stringifyFrontmatter", () => {
  it("round-trips a document with multi-line code", () => {
    const { data, body } = parseFrontmatter(SNIPPET_DOC);
    const out = stringifyFrontmatter(data, body, ["title", "order", "snippets"]);
    expect(parseFrontmatter(out).data).toEqual(data);
    expect(parseFrontmatter(out).body).toBe(body);
  });

  it("preserves the body verbatim", () => {
    const body = "\n## Heading\n\n- a\n- b\n\n```csharp\nvar x = 1;\n```\n";
    const out = stringifyFrontmatter({ title: "T" }, body);
    expect(parseFrontmatter(out).body).toBe(body);
  });

  it("emits keys in the requested order", () => {
    const out = stringifyFrontmatter(
      { year: 2025, title: "T", order: 3 },
      "",
      ["title", "order", "year"]
    );
    const keys = out
      .split("\n")
      .filter((l) => /^[a-z]/.test(l))
      .map((l) => l.split(":")[0]);
    expect(keys).toEqual(["title", "order", "year"]);
  });

  it("appends keys missing from keyOrder rather than dropping them", () => {
    const out = stringifyFrontmatter({ title: "T", extra: "kept" }, "", ["title"]);
    expect(parseFrontmatter(out).data).toEqual({ title: "T", extra: "kept" });
  });

  it("omits undefined values so optional fields stay absent", () => {
    const out = stringifyFrontmatter({ title: "T", studio: undefined }, "");
    expect(out).not.toContain("studio");
  });

  it("does not fold long lines", () => {
    const long = "x".repeat(400);
    const out = stringifyFrontmatter({ tagline: long }, "");
    expect(parseFrontmatter(out).data.tagline).toBe(long);
    expect(out.split("\n").some((l) => l.length > 400)).toBe(true);
  });

  it("preserves unicode used by the career timeline", () => {
    const data = { icon: "✦", stamp: "2023 — PRESENT", org: "Studio-23 · BS23" };
    const out = stringifyFrontmatter(data, "");
    expect(parseFrontmatter(out).data).toEqual(data);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/frontmatter.test.ts`
Expected: FAIL — cannot resolve `@/studio/frontmatter.mjs`.

- [ ] **Step 3: Write the implementation**

Create `src/studio/frontmatter.mjs`:

```js
// YAML frontmatter round-trip. Shared by the studio write path and by
// src/scripts/generate-checklist.mjs so there is exactly one parser.
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

// Group 1 is the YAML block, group 2 is everything after the closing fence.
// The optional trailing newline is consumed so the body keeps its own leading
// blank line, which makes the round-trip byte-exact.
const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseFrontmatter(src) {
  const m = String(src).match(FENCE);
  if (!m) return { data: {}, body: String(src) };
  return { data: parseYaml(m[1]) ?? {}, body: m[2] };
}

export function stringifyFrontmatter(data, body, keyOrder = []) {
  const ordered = {};
  for (const key of keyOrder) {
    if (data[key] !== undefined) ordered[key] = data[key];
  }
  for (const key of Object.keys(data)) {
    if (!(key in ordered) && data[key] !== undefined) ordered[key] = data[key];
  }
  // lineWidth: 0 disables folding, so long taglines and URLs stay on one line.
  // blockQuote: "literal" keeps multi-line snippet code readable and diffable.
  const yaml = stringifyYaml(ordered, { lineWidth: 0, blockQuote: "literal" });
  return `---\n${yaml}---\n${body}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/frontmatter.test.ts`
Expected: PASS, all 11 assertions.

- [ ] **Step 5: Delete the duplicate parser in the checklist generator**

In `src/scripts/generate-checklist.mjs`, delete the entire local `parseFrontmatter` function (the ~45-line hand-rolled parser with its `arrayKeys`, `currentArrayKey`, and `inLinks` state) and add the shared import at the top:

```js
import { parseFrontmatter } from "../studio/frontmatter.mjs";
```

Remove `basename` from the `node:path` import only if it becomes unused — it is still used for the project id, so leave it. No other line in `main()` changes: the shared `parseFrontmatter` returns the same `{ data, body }` shape.

- [ ] **Step 6: Verify the checklist output is unchanged**

Run:

```bash
cp CONTENT-CHECKLIST.md /tmp/checklist-before.md 2>/dev/null || node src/scripts/generate-checklist.mjs && cp CONTENT-CHECKLIST.md /tmp/checklist-before.md
node src/scripts/generate-checklist.mjs
diff /tmp/checklist-before.md CONTENT-CHECKLIST.md
```

Expected: no diff. If a checkbox flipped, the old parser was misreading a field — inspect which project and confirm the new reading is the correct one before proceeding.

- [ ] **Step 7: Commit**

```bash
git add src/studio/frontmatter.mjs src/scripts/generate-checklist.mjs tests/frontmatter.test.ts
git commit -m "feat: shared yaml frontmatter round-trip

Replaces the hand-rolled parser in generate-checklist.mjs with a single
yaml-backed module. Multi-line snippet code and long taglines survive a
parse/stringify cycle byte-exactly."
```

---

### Task 3: Migrate Career Log to a `file()` collection

Turns the hardcoded array into authorable data. Array position is the display order, so a reorder is a splice and a delete is a filter.

**Files:**
- Create: `src/data/career.json`
- Modify: `src/content/schemas.ts` (add `careerSchema`, extend `SCHEMAS`)
- Modify: `src/content.config.ts` (add the `career` collection)
- Modify: `src/components/sections/CareerLog.astro` (remove the inline array and local types)
- Test: `tests/career.test.ts`

**Interfaces:**
- Consumes: `SCHEMAS` from Task 1.
- Produces: `careerSchema` exported from `src/content/schemas.ts`, and `SCHEMAS.career`. `src/data/career.json` is an array of objects each carrying an `id` plus the schema fields. Tasks 4 and 5 treat `career` as the one JSON-backed type.

- [ ] **Step 1: Write the failing test**

Create `tests/career.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/career.test.ts`
Expected: FAIL — `src/data/career.json` does not exist.

- [ ] **Step 3: Capture the current rendered career HTML as a baseline**

Run:

```bash
npm run build
node -e "const s=require('fs').readFileSync('dist/index.html','utf8');const m=s.match(/<section id=\"career\"[\s\S]*?<\/section>/);require('fs').writeFileSync('/tmp/career-before.html',m[0]);console.log(m[0].length,'bytes captured')"
```

This baseline is the acceptance check in Step 8. Do not skip it — it is the only guard that the refactor is visually inert.

- [ ] **Step 4: Add the career schema**

In `src/content/schemas.ts`, add above the `SCHEMAS` export:

```ts
export const careerSchema = z.object({
  stamp: z.string(),
  title: z.string(),
  org: z.string().optional(),
  detail: z.string(),
  tone: z.enum(["magenta", "cyan", "yellow"]),
  kind: z.enum(["role", "milestone", "education"]),
  icon: z.string().optional(),
});
```

and extend the map:

```ts
export const SCHEMAS = {
  projects: projectSchema,
  posts: postSchema,
  career: careerSchema,
} as const;
```

- [ ] **Step 5: Create src/data/career.json**

Transcribed from the current `entries` array in `CareerLog.astro`, in the same order, with `body` renamed to `detail` and an `id` added per entry:

```json
[
  {
    "id": "unilever-marvel-3",
    "stamp": "2025",
    "title": "Unilever Marvel 3",
    "detail": "Led a 8 member team while engineering a full-scale industrial-training-sim.",
    "tone": "magenta",
    "kind": "milestone",
    "icon": "✦"
  },
  {
    "id": "xbox-port-silent-scream",
    "stamp": "2024",
    "title": "XBOX PORT // SILENT SCREAM",
    "detail": "Ported the horror cooking game to XBox; tuned controller feel, performance, and platform-specific UX.",
    "tone": "magenta",
    "kind": "milestone",
    "icon": "✦"
  },
  {
    "id": "gameplay-programmer",
    "stamp": "2023 — PRESENT",
    "title": "Gameplay Programmer",
    "org": "Studio-23 · Brain Station 23",
    "detail": "Built core gameplay systems, tooling, and game-feel polish across Silent Scream, High Noon, and other titles. Co-authored open-source Unity packages used team-wide.",
    "tone": "magenta",
    "kind": "role"
  },
  {
    "id": "shipped-silent-scream",
    "stamp": "2023",
    "title": "SHIPPED // SILENT SCREAM",
    "detail": "Helped launch the studio's flagship horror cooking game on Steam.",
    "tone": "cyan",
    "kind": "milestone",
    "icon": "▲"
  },
  {
    "id": "shipped-high-noon",
    "stamp": "2023",
    "title": "SHIPPED // HIGH NOON",
    "detail": "Released a real-time PvP duel game powered by Photon networking. Owned UI/UX on the PC build.",
    "tone": "cyan",
    "kind": "milestone",
    "icon": "▲"
  },
  {
    "id": "trainee-gameplay-programmer",
    "stamp": "2022 — 2023",
    "title": "Trainee Gameplay Programmer",
    "org": "Studio-23 · Brain Station 23",
    "detail": "Joined the team while finishing undergrad. Worked on VR Football for Meta Quest 2 and started High Noon.",
    "tone": "cyan",
    "kind": "role"
  },
  {
    "id": "first-vr-project",
    "stamp": "2022",
    "title": "FIRST VR PROJECT",
    "detail": "Built a Meta Quest 2 penalty-shootout saver under senior guidance. First time wrangling spatial input.",
    "tone": "yellow",
    "kind": "milestone",
    "icon": "◆"
  },
  {
    "id": "bsc-computer-science",
    "stamp": "2018 — 2022",
    "title": "B.Sc. Computer Science",
    "org": "[ FILL ME IN: school + focus areas ]",
    "detail": "First serious dive into Unity, building text-based adventures, prototypes, and learning the craft.",
    "tone": "yellow",
    "kind": "education"
  },
  {
    "id": "first-game-abyss-crawler",
    "stamp": "2021",
    "title": "FIRST GAME // ABYSS CRAWLER",
    "detail": "Released the first proper game I solo-built — a 2D platformer. Still up on itch.io.",
    "tone": "magenta",
    "kind": "milestone",
    "icon": "▲"
  }
]
```

Note the `[ FILL ME IN: ... ]` string in `bsc-computer-science` is existing site content, not a plan placeholder — transcribe it as-is so the refactor stays inert.

- [ ] **Step 6: Register the collection**

In `src/content.config.ts`, extend the loader import, add the collection, and export it:

```ts
import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { careerSchema, postSchema, projectSchema } from "./content/schemas";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: postSchema,
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: projectSchema,
});

// Array order in career.json is the display order — newest first.
const career = defineCollection({
  loader: file("src/data/career.json"),
  schema: careerSchema,
});

export const collections = { projects, posts, career };
```

- [ ] **Step 7: Refactor CareerLog.astro**

Replace only the frontmatter block of `src/components/sections/CareerLog.astro` — everything from the opening `---` to the closing `---` — with:

```astro
---
import { getCollection } from "astro:content";
import GlitchText from "../chrome/GlitchText.astro";
import RevealOnScroll from "../chrome/RevealOnScroll.astro";

// Newest first — array order in src/data/career.json is the display order.
// getCollection does not guarantee loader order, so re-sort by it explicitly.
const order = (await import("../../data/career.json")).default.map((e: { id: string }) => e.id);
const collection = await getCollection("career");
const entries = order
  .map((id) => collection.find((e) => e.id === id))
  .filter((e): e is NonNullable<typeof e> => Boolean(e))
  .map((e) => e.data);
---
```

Then in the template, change the single body reference:

```astro
<p class="tl-body font-body">{e.detail}</p>
```

Leave every other template line and the entire `<style>` block untouched. The local `Tone`, `Kind`, and `Entry` type declarations and the inline `entries` array are gone — roughly 70 lines removed.

- [ ] **Step 8: Verify the rendered HTML is identical**

Run:

```bash
npm run build
node -e "const s=require('fs').readFileSync('dist/index.html','utf8');const m=s.match(/<section id=\"career\"[\s\S]*?<\/section>/);require('fs').writeFileSync('/tmp/career-after.html',m[0])"
diff /tmp/career-before.html /tmp/career-after.html && echo "IDENTICAL"
```

Expected: `IDENTICAL`. Any diff is a regression — the most likely causes are a transcription typo in `career.json`, a lost unicode glyph, or the sort producing a different order. Fix and re-run before committing.

Run: `npx vitest run`
Expected: PASS, all suites.

Run: `npx astro check`
Expected: no new errors.

- [ ] **Step 9: Commit**

```bash
git add src/data/career.json src/content/schemas.ts src/content.config.ts src/components/sections/CareerLog.astro tests/career.test.ts
git commit -m "refactor: career log becomes a file() collection

Moves the hardcoded 70-line Entry[] out of CareerLog.astro into
src/data/career.json behind a zod schema. Array position is the display
order, so reorder is a splice. Rendered HTML verified byte-identical."
```

---

### Task 4: Store module — read side

All filesystem reads for the studio, parameterised by repo root so they are testable against a temp fixture tree.

**Files:**
- Create: `src/studio/store.mjs`
- Test: `tests/studioStoreRead.test.ts`

**Interfaces:**
- Consumes: `parseFrontmatter` from Task 2.
- Produces:
  - `TYPES` — a frozen map: `projects` and `posts` are `{ kind: "md", dir, route }`, `career` is `{ kind: "json", path, route }`.
  - `listEntries(root, type): Promise<Array<{ id, title, sort, data }>>` — for `md` types, sorted by `order` (projects) or `date` descending (posts); for `career`, JSON array order.
  - `readEntry(root, type, id): Promise<{ id, data, body }>` — `body` is `""` for `career`. Throws `Error` with `.code = "ENOENT"` when missing.
  - `slugify(text): string`
  Task 5 adds the write functions to the same module. Task 7 calls all of them.

- [ ] **Step 1: Write the failing test**

Create `tests/studioStoreRead.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TYPES, listEntries, readEntry, slugify } from "@/studio/store.mjs";

let root: string;

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
    expect(list.map((e) => e.id)).toEqual(["alpha", "beta"]);
    expect(list[0].title).toBe("Alpha");
  });

  it("sorts posts newest first", async () => {
    const list = await listEntries(root, "posts");
    expect(list.map((e) => e.id)).toEqual(["newer", "older"]);
  });

  it("returns career entries in JSON array order", async () => {
    const list = await listEntries(root, "career");
    expect(list.map((e) => e.id)).toEqual(["b", "a"]);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/studioStoreRead.test.ts`
Expected: FAIL — cannot resolve `@/studio/store.mjs`.

- [ ] **Step 3: Write the implementation**

Create `src/studio/store.mjs`:

```js
// Filesystem access for the studio. Every function takes the repo root as its
// first argument so the whole module is testable against temp directories.
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseFrontmatter } from "./frontmatter.mjs";

export const TYPES = Object.freeze({
  projects: { kind: "md", dir: "src/content/projects", route: "/projects/" },
  posts: { kind: "md", dir: "src/content/posts", route: "/devlog/" },
  career: { kind: "json", path: "src/data/career.json", route: "/#career" },
});

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

export function typeConfig(type) {
  const config = TYPES[type];
  if (!config) throw new Error(`unknown type: ${type}`);
  return config;
}

export function assertId(id) {
  if (typeof id !== "string" || !ID_RE.test(id)) {
    throw new Error(`invalid id: ${id}`);
  }
  return id;
}

export function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export function mdPath(root, type, id) {
  return join(root, typeConfig(type).dir, `${assertId(id)}.md`);
}

export function jsonPath(root, type) {
  return join(root, typeConfig(type).path);
}

export async function readCareerFile(root) {
  try {
    return JSON.parse(await readFile(jsonPath(root, "career"), "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function listEntries(root, type) {
  const config = typeConfig(type);

  if (config.kind === "json") {
    const items = await readCareerFile(root);
    return items.map((item, index) => {
      const { id, ...data } = item;
      return { id, title: data.title ?? id, sort: index, data };
    });
  }

  let files;
  try {
    files = (await readdir(join(root, config.dir))).filter((f) => f.endsWith(".md"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }

  const entries = [];
  for (const file of files) {
    const src = await readFile(join(root, config.dir, file), "utf8");
    const { data } = parseFrontmatter(src);
    const id = basename(file, ".md");
    entries.push({
      id,
      title: data.title ?? id,
      sort: type === "posts" ? -new Date(data.date ?? 0).getTime() : Number(data.order ?? 0),
      data,
    });
  }
  return entries.sort((a, b) => a.sort - b.sort);
}

export async function readEntry(root, type, id) {
  const config = typeConfig(type);
  assertId(id);

  if (config.kind === "json") {
    const items = await readCareerFile(root);
    const found = items.find((item) => item.id === id);
    if (!found) {
      const err = new Error(`no such entry: ${type}/${id}`);
      err.code = "ENOENT";
      throw err;
    }
    const { id: _omit, ...data } = found;
    return { id, data, body: "" };
  }

  const src = await readFile(mdPath(root, type, id), "utf8");
  const { data, body } = parseFrontmatter(src);
  return { id, data, body };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/studioStoreRead.test.ts`
Expected: PASS, all 18 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/studio/store.mjs tests/studioStoreRead.test.ts
git commit -m "feat: studio store read side

Lists and reads projects, posts, and career entries. Root-parameterised
so it tests against temp trees; ids are validated against a strict
pattern before any path is built."
```

---

### Task 5: Store module — write side

Create, update, delete, and reorder. Every write is atomic, and deletes are recoverable even for files git has never seen.

**Files:**
- Modify: `src/studio/store.mjs` (append the write functions)
- Modify: `.gitignore` (add `.studio-trash/`)
- Test: `tests/studioStoreWrite.test.ts`

**Interfaces:**
- Consumes: `TYPES`, `typeConfig`, `assertId`, `slugify`, `mdPath`, `jsonPath`, `readCareerFile`, `listEntries`, `readEntry` from Task 4; `stringifyFrontmatter` from Task 2.
- Produces:
  - `createEntry(root, type, data, body, keyOrder): Promise<{ id }>` — id from `slugify(data.title)`; throws with `.code = "EEXIST"` on collision.
  - `writeEntry(root, type, id, data, body, keyOrder): Promise<{ id }>`
  - `deleteEntry(root, type, id): Promise<{ id, trashed: string }>`
  - `reorderEntries(root, type, ids): Promise<{ ids }>`
  Task 7 calls all four.

- [ ] **Step 1: Write the failing test**

Create `tests/studioStoreWrite.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createEntry, writeEntry, deleteEntry, reorderEntries, listEntries, readEntry,
} from "@/studio/store.mjs";

let root: string;
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
    expect(list.map((e) => e.id)).toEqual(["b", "a", "new-role"]);
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
    expect(list.map((e) => e.id)).toEqual(["b", "a"]);
    expect(list[1].data.title).toBe("A renamed");
    expect(list[1].data.tone).toBe("yellow");
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
    expect(list.map((e) => e.id)).toEqual(["a"]);
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
    expect(list.map((e) => e.id)).toEqual(["beta", "alpha"]);
    expect(list.map((e) => e.data.order)).toEqual([1, 2]);
  });

  it("preserves project bodies while reordering", async () => {
    await reorderEntries(root, "projects", ["beta", "alpha"]);
    expect((await readEntry(root, "projects", "alpha")).body).toBe(
      "\n## Role\n\nKeep me.\n"
    );
  });

  it("splices the career array", async () => {
    await reorderEntries(root, "career", ["a", "b"]);
    expect((await listEntries(root, "career")).map((e) => e.id)).toEqual(["a", "b"]);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/studioStoreWrite.test.ts`
Expected: FAIL — `createEntry` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/studio/store.mjs`, and extend the existing `node:fs/promises` import at the top of the file to `import { copyFile, mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";`, plus add `import { stringifyFrontmatter } from "./frontmatter.mjs";` alongside the existing `parseFrontmatter` import:

```js
const TRASH_DIR = ".studio-trash";

async function writeAtomic(path, contents) {
  const tmp = `${path}.tmp`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

function enoent(message) {
  const err = new Error(message);
  err.code = "ENOENT";
  return err;
}

async function writeCareerFile(root, items) {
  await writeAtomic(jsonPath(root, "career"), `${JSON.stringify(items, null, 2)}\n`);
}

async function toTrash(root, name, contents) {
  const dir = join(root, TRASH_DIR);
  await mkdir(dir, { recursive: true });
  const stamped = `${Date.now()}-${name}`;
  const path = join(dir, stamped);
  await writeFile(path, contents, "utf8");
  return path;
}

export async function createEntry(root, type, data, body, keyOrder = []) {
  const config = typeConfig(type);
  const id = slugify(data.title ?? "");
  if (!id) throw new Error("title must contain at least one letter or digit");

  if (config.kind === "json") {
    const items = await readCareerFile(root);
    if (items.some((item) => item.id === id)) {
      const err = new Error(`entry already exists: ${type}/${id}`);
      err.code = "EEXIST";
      throw err;
    }
    items.push({ id, ...data });
    await writeCareerFile(root, items);
    return { id };
  }

  const path = mdPath(root, type, id);
  try {
    await readFile(path, "utf8");
    const err = new Error(`entry already exists: ${type}/${id}`);
    err.code = "EEXIST";
    throw err;
  } catch (readErr) {
    if (readErr.code !== "ENOENT") throw readErr;
  }

  await mkdir(join(root, config.dir), { recursive: true });
  await writeAtomic(path, stringifyFrontmatter(data, body, keyOrder));
  return { id };
}

export async function writeEntry(root, type, id, data, body, keyOrder = []) {
  const config = typeConfig(type);
  assertId(id);

  if (config.kind === "json") {
    const items = await readCareerFile(root);
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) throw enoent(`no such entry: ${type}/${id}`);
    items[index] = { id, ...data };
    await writeCareerFile(root, items);
    return { id };
  }

  const path = mdPath(root, type, id);
  try {
    await readFile(path, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") throw enoent(`no such entry: ${type}/${id}`);
    throw err;
  }
  await writeAtomic(path, stringifyFrontmatter(data, body, keyOrder));
  return { id };
}

export async function deleteEntry(root, type, id) {
  const config = typeConfig(type);
  assertId(id);

  if (config.kind === "json") {
    const items = await readCareerFile(root);
    const found = items.find((item) => item.id === id);
    if (!found) throw enoent(`no such entry: ${type}/${id}`);
    const trashed = await toTrash(root, `career-${id}.json`, JSON.stringify(found, null, 2));
    await writeCareerFile(root, items.filter((item) => item.id !== id));
    return { id, trashed };
  }

  const path = mdPath(root, type, id);
  let contents;
  try {
    contents = await readFile(path, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") throw enoent(`no such entry: ${type}/${id}`);
    throw err;
  }
  // Trash first: git cannot restore a file it has never tracked.
  const trashed = await toTrash(root, `${type}-${id}.md`, contents);
  await unlink(path);
  return { id, trashed };
}

export async function reorderEntries(root, type, ids) {
  const config = typeConfig(type);
  if (type === "posts") throw new Error("posts are not reorderable — they sort by date");

  const existing = (await listEntries(root, type)).map((e) => e.id);
  const same =
    ids.length === existing.length && [...ids].sort().join() === [...existing].sort().join();
  if (!same) throw new Error("ids must match the existing entries exactly");

  if (config.kind === "json") {
    const items = await readCareerFile(root);
    const byId = new Map(items.map((item) => [item.id, item]));
    await writeCareerFile(root, ids.map((id) => byId.get(id)));
    return { ids };
  }

  const keyOrder = Object.keys((await readEntry(root, type, ids[0])).data);
  for (const [index, id] of ids.entries()) {
    const { data, body } = await readEntry(root, type, id);
    await writeAtomic(
      mdPath(root, type, id),
      stringifyFrontmatter({ ...data, order: index + 1 }, body, keyOrder)
    );
  }
  return { ids };
}
```

Note `copyFile` is imported for symmetry with future use but `toTrash` writes the already-read contents instead, avoiding a second read — if the linter flags `copyFile` as unused, drop it from the import.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/studioStoreWrite.test.ts`
Expected: PASS, all 18 assertions.

- [ ] **Step 5: Ignore the trash directory**

Add to `.gitignore`, under the `# Generated` block:

```
# Studio deletes land here before unlink (recoverable, never committed)
.studio-trash/
```

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS. Confirm `git status` is clean apart from the intended files — in particular that no test left a `.studio-trash/` or `.tmp` file in the repo.

- [ ] **Step 7: Commit**

```bash
git add src/studio/store.mjs tests/studioStoreWrite.test.ts .gitignore
git commit -m "feat: studio store write side

Atomic create/update/delete/reorder for all three collections. Deletes
copy to a gitignored .studio-trash/ first, since git cannot restore an
untracked file. Reorder rejects any id list that does not match."
```

---

### Task 6: Image ingest pipeline

**Files:**
- Create: `src/studio/images.mjs`
- Test: `tests/studioImages.test.ts`

**Interfaces:**
- Consumes: `slugify` from Task 4.
- Produces:
  - `IMAGE_KINDS` — frozen map of `thumb` / `gallery` / `cover` to `{ dir, width, height, web }`.
  - `saveImage(root, kind, name, buffer): Promise<{ path: string }>` where `path` is the site-relative path to store in frontmatter.
  - `MAX_IMAGE_BYTES` — `20 * 1024 * 1024`.
  Task 7 calls `saveImage`.

- [ ] **Step 1: Write the failing test**

Create `tests/studioImages.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { IMAGE_KINDS, MAX_IMAGE_BYTES, saveImage } from "@/studio/images.mjs";

let root: string;

const png = (w: number, h: number) =>
  sharp({
    create: { width: w, height: h, channels: 3, background: { r: 20, g: 5, b: 40 } },
  })
    .png()
    .toBuffer();

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "studio-img-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("IMAGE_KINDS", () => {
  it("matches the dimensions the site already uses", () => {
    expect(IMAGE_KINDS.thumb).toMatchObject({ width: 1500, height: 750 });
    expect(IMAGE_KINDS.gallery).toMatchObject({ width: 1600, height: 900 });
    expect(IMAGE_KINDS.cover).toMatchObject({ width: 1200, height: 630 });
  });
});

describe("saveImage", () => {
  it("writes a thumb at 1500x750 and returns its site path", async () => {
    const { path } = await saveImage(root, "thumb", "Aetherfall II", await png(800, 800));
    expect(path).toBe("/images/thumbs/aetherfall-ii.png");
    const meta = await sharp(join(root, "public/images/thumbs/aetherfall-ii.png")).metadata();
    expect([meta.width, meta.height]).toEqual([1500, 750]);
    expect(meta.format).toBe("png");
  });

  it("writes gallery images at 1600x900", async () => {
    const { path } = await saveImage(root, "gallery", "shot-01", await png(400, 300));
    const meta = await sharp(join(root, "public", path)).metadata();
    expect([meta.width, meta.height]).toEqual([1600, 900]);
  });

  it("slugifies the name so it cannot escape the target directory", async () => {
    const { path } = await saveImage(root, "thumb", "../../evil name", await png(10, 10));
    expect(path).toBe("/images/thumbs/evil-name.png");
    const files = await readdir(join(root, "public/images/thumbs"));
    expect(files).toEqual(["evil-name.png"]);
  });

  it("rejects an unknown kind", async () => {
    await expect(saveImage(root, "banner", "x", await png(10, 10))).rejects.toThrow(
      /unknown image kind/i
    );
  });

  it("rejects a name that slugifies to nothing", async () => {
    await expect(saveImage(root, "thumb", "!!!", await png(10, 10))).rejects.toThrow(
      /name/i
    );
  });

  it("rejects a buffer that is not an image", async () => {
    await expect(
      saveImage(root, "thumb", "notanimage", Buffer.from("hello world"))
    ).rejects.toThrow(/not a supported image/i);
  });

  it("rejects a buffer over the size cap", async () => {
    const huge = Buffer.alloc(MAX_IMAGE_BYTES + 1);
    await expect(saveImage(root, "thumb", "huge", huge)).rejects.toThrow(/too large/i);
  });

  it("leaves no .tmp file behind", async () => {
    await saveImage(root, "thumb", "clean", await png(10, 10));
    const files = await readdir(join(root, "public/images/thumbs"));
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/studioImages.test.ts`
Expected: FAIL — cannot resolve `@/studio/images.mjs`.

- [ ] **Step 3: Write the implementation**

Create `src/studio/images.mjs`:

```js
// Normalises dropped images to the dimensions the site's components expect,
// so authored content cannot introduce an off-aspect thumb or a 4MB PNG.
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { slugify } from "./store.mjs";

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export const IMAGE_KINDS = Object.freeze({
  // 2:1, matching public/images/thumbs/*.png
  thumb: { dir: "public/images/thumbs", width: 1500, height: 750, web: "/images/thumbs" },
  // 16:9, matching GalleryGrid's aspect-video container
  gallery: { dir: "public/images/gallery", width: 1600, height: 900, web: "/images/gallery" },
  // Post covers double as OG images
  cover: { dir: "public/images", width: 1200, height: 630, web: "/images" },
});

export async function saveImage(root, kind, name, buffer) {
  const target = IMAGE_KINDS[kind];
  if (!target) throw new Error(`unknown image kind: ${kind}`);
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`image too large: ${buffer.length} bytes (max ${MAX_IMAGE_BYTES})`);
  }

  const slug = slugify(name);
  if (!slug) throw new Error("name must contain at least one letter or digit");

  let normalised;
  try {
    normalised = await sharp(buffer)
      .resize(target.width, target.height, { fit: "cover" })
      .png()
      .toBuffer();
  } catch {
    throw new Error("not a supported image format");
  }

  await mkdir(join(root, target.dir), { recursive: true });
  const filename = `${slug}.png`;
  const path = join(root, target.dir, filename);
  const tmp = `${path}.tmp`;
  await writeFile(tmp, normalised);
  await rename(tmp, path);

  return { path: `${target.web}/${filename}` };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/studioImages.test.ts`
Expected: PASS, all 10 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/studio/images.mjs tests/studioImages.test.ts
git commit -m "feat: studio image ingest via sharp

Normalises dropped files to the aspect ratios the components already
assume (2:1 thumbs, 16:9 gallery, 1200x630 covers) and slugifies the
filename server-side so it cannot escape the target directory."
```

---

### Task 7: Dev-only wiring — plugin, HTTP handler, and the build-isolation test

The task that makes `/studio` reachable, and the task that proves it is unreachable in a build.

**Files:**
- Create: `src/studio/plugin.mjs`
- Create: `src/studio/server.mjs`
- Modify: `astro.config.mjs`
- Test: `tests/studioIsolation.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 4, 5, 6, plus `SCHEMAS` from Tasks 1 and 3.
- Produces:
  - `studioIntegration(): AstroIntegration` — injects `/studio` only when `command === "dev"`.
  - `studioApiPlugin(): VitePlugin` — `apply: "serve"`, mounts the handler at `/__studio`.
  - `createHandler(server, root): (req, res, next) => void`.
  The API contract the client in Tasks 10 and 11 codes against:

  | Method | Path | Request | Response |
  |---|---|---|---|
  | GET | `/entries` | — | `{ types: {...TYPES}, entries: { projects: [...], posts: [...], career: [...] } }` |
  | GET | `/entry/:type/:id` | — | `{ id, data, body }` |
  | POST | `/entry/:type` | `{ data, body }` | `201 { id }`, or `409` on collision |
  | PUT | `/entry/:type/:id` | `{ data, body }` | `{ id }`, or `422 { errors: [{ path, message }] }` |
  | DELETE | `/entry/:type/:id` | — | `{ id, trashed }` |
  | POST | `/reorder/:type` | `{ ids: [...] }` | `{ ids }` |
  | POST | `/image?kind=&name=` | raw bytes | `{ path }` |

- [ ] **Step 1: Write the failing test**

Create `tests/studioIsolation.test.ts`. These are the tests that guard the security property, so they assert on the hooks directly rather than on a build artifact:

```ts
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { studioApiPlugin, studioIntegration } from "@/studio/plugin.mjs";

function runSetup(command: string) {
  const injected: unknown[] = [];
  const integration = studioIntegration();
  integration.hooks["astro:config:setup"]({
    command,
    injectRoute: (route: unknown) => injected.push(route),
    config: { base: "/Evan.github.io" },
    logger: { info: () => {}, warn: () => {} },
  });
  return injected;
}

describe("studioIntegration", () => {
  it("injects the studio route in dev", () => {
    const injected = runSetup("dev");
    expect(injected).toHaveLength(1);
    expect(injected[0]).toMatchObject({ pattern: "/studio" });
  });

  it("injects nothing during a build", () => {
    expect(runSetup("build")).toHaveLength(0);
  });

  it("injects nothing during preview", () => {
    expect(runSetup("preview")).toHaveLength(0);
  });

  it("declares only the config:setup hook, never a build hook", () => {
    const hooks = Object.keys(studioIntegration().hooks);
    expect(hooks).toEqual(["astro:config:setup"]);
  });
});

describe("studioApiPlugin", () => {
  it("applies only to the dev server", () => {
    expect(studioApiPlugin().apply).toBe("serve");
  });

  it("exposes configureServer and no build hooks", () => {
    const plugin = studioApiPlugin() as Record<string, unknown>;
    expect(typeof plugin.configureServer).toBe("function");
    expect(plugin.generateBundle).toBeUndefined();
    expect(plugin.buildStart).toBeUndefined();
  });
});

describe("no studio artifact in a production build", () => {
  it("has no studio route and no __studio reference in dist", () => {
    if (!existsSync("dist")) {
      throw new Error("run `npm run build` before this test");
    }
    expect(existsSync(join("dist", "studio"))).toBe(false);

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.(html|js|css)$/.test(entry.name)) {
          if (readFileSync(path, "utf8").includes("__studio")) offenders.push(path);
        }
      }
    };
    walk("dist");
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && npx vitest run tests/studioIsolation.test.ts`
Expected: FAIL — cannot resolve `@/studio/plugin.mjs`.

- [ ] **Step 3: Write the HTTP handler**

Create `src/studio/server.mjs`:

```js
// Connect middleware for the studio API. Mounted only from configureServer,
// so it has no production counterpart. Thin glue: parse, delegate to the
// store, serialise.
import { fileURLToPath } from "node:url";
import {
  TYPES, createEntry, deleteEntry, listEntries, readEntry, reorderEntries, typeConfig, writeEntry,
} from "./store.mjs";
import { saveImage, MAX_IMAGE_BYTES } from "./images.mjs";

const DEFAULT_ROOT = fileURLToPath(new URL("../../", import.meta.url));

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > limit) {
        reject(new Error(`request body too large (max ${limit})`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const statusFor = (err) =>
  err.code === "ENOENT" ? 404 : err.code === "EEXIST" ? 409 : 400;

export function createHandler(server, root = DEFAULT_ROOT) {
  // Loaded lazily and cached: the schemas module is plain TS over `zod`, so
  // ssrLoadModule resolves it without Astro's virtual modules in scope.
  let schemasPromise;
  const schemas = () => {
    schemasPromise ??= server.ssrLoadModule("/src/content/schemas.ts");
    return schemasPromise;
  };

  async function validate(type, data) {
    const { SCHEMAS } = await schemas();
    const schema = SCHEMAS[type];
    const result = schema.safeParse(data);
    if (result.success) {
      return { data: result.data, keyOrder: Object.keys(schema.shape) };
    }
    return {
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  return async function studioHandler(req, res, next) {
    const url = new URL(req.url, "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);
    const method = req.method ?? "GET";

    try {
      // GET /entries
      if (method === "GET" && segments[0] === "entries" && segments.length === 1) {
        const entries = {};
        for (const type of Object.keys(TYPES)) {
          entries[type] = await listEntries(root, type);
        }
        return send(res, 200, { types: TYPES, entries });
      }

      // /entry/:type[/:id]
      if (segments[0] === "entry") {
        const [, type, id] = segments;
        typeConfig(type);

        if (method === "GET" && id) {
          return send(res, 200, await readEntry(root, type, id));
        }

        if (method === "POST" && !id) {
          const { data, body = "" } = JSON.parse(await readBody(req, 2e6));
          const checked = await validate(type, data);
          if (checked.errors) return send(res, 422, { errors: checked.errors });
          return send(res, 201, await createEntry(root, type, data, body, checked.keyOrder));
        }

        if (method === "PUT" && id) {
          const { data, body = "" } = JSON.parse(await readBody(req, 2e6));
          const checked = await validate(type, data);
          if (checked.errors) return send(res, 422, { errors: checked.errors });
          return send(res, 200, await writeEntry(root, type, id, data, body, checked.keyOrder));
        }

        if (method === "DELETE" && id) {
          return send(res, 200, await deleteEntry(root, type, id));
        }
      }

      // POST /reorder/:type
      if (method === "POST" && segments[0] === "reorder" && segments[1]) {
        const { ids } = JSON.parse(await readBody(req, 1e5));
        return send(res, 200, await reorderEntries(root, segments[1], ids));
      }

      // POST /image?kind=&name=
      if (method === "POST" && segments[0] === "image") {
        const buffer = await readBody(req, MAX_IMAGE_BYTES);
        const kind = url.searchParams.get("kind");
        const name = url.searchParams.get("name");
        return send(res, 200, await saveImage(root, kind, name, buffer));
      }

      return next();
    } catch (err) {
      server.config.logger.error(`[studio] ${method} ${req.url}: ${err.message}`);
      return send(res, statusFor(err), { error: err.message });
    }
  };
}
```

Note the validation happens *before* any write is attempted, and a `422` response touches no file — the invariant from the spec.

- [ ] **Step 4: Write the plugin module**

Create `src/studio/plugin.mjs`:

```js
// Dev-only wiring for the studio.
//
// The UI lives outside src/pages/ so Astro's router never discovers it, and is
// injected here only when `command === "dev"`. The write API mounts in Vite's
// configureServer hook, which has no production counterpart. Neither the route
// nor the API can therefore appear in `dist/`. Do not add an astro:build:*
// hook or a Rollup hook to this file.
import { createHandler } from "./server.mjs";

export function studioIntegration() {
  return {
    name: "studio",
    hooks: {
      "astro:config:setup": ({ command, injectRoute, config, logger }) => {
        if (command !== "dev") return;
        injectRoute({ pattern: "/studio", entrypoint: "./src/studio/index.astro" });
        const base = String(config?.base ?? "/").replace(/\/+$/, "");
        logger.info(`authoring studio at http://localhost:4321${base}/studio`);
      },
    },
  };
}

export function studioApiPlugin() {
  return {
    name: "studio-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__studio", createHandler(server));
    },
  };
}
```

- [ ] **Step 5: Wire both into astro.config.mjs**

Modify `astro.config.mjs` — add the import and register both, leaving `site`, `base`, `trailingSlash`, and the existing integrations untouched:

```js
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import { studioApiPlugin, studioIntegration } from "./src/studio/plugin.mjs";

// GitHub Pages project-site URL: https://<user>.github.io/<repo>/
// Override with SITE / BASE env vars when deploying elsewhere
// (e.g. Cloudflare Pages or a custom domain).
export default defineConfig({
  site: process.env.SITE ?? "https://n-evan.github.io",
  base: process.env.BASE ?? "/Evan.github.io",
  trailingSlash: "ignore",
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap(),
    // Dev-only: injects /studio and mounts the /__studio write API.
    studioIntegration(),
  ],
  vite: {
    ssr: { noExternal: ["gsap"] },
    plugins: [studioApiPlugin()],
  },
});
```

- [ ] **Step 6: Create a placeholder studio page so the injected route resolves**

The route entrypoint must exist for `astro dev` to start. Create `src/studio/index.astro` with a minimal shell; Task 9 replaces it entirely:

```astro
---
// Replaced in Task 9 with the real three-pane shell.
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Studio</title></head>
  <body>
    <h1>Studio</h1>
    <pre id="probe">loading…</pre>
    <script>
      fetch("/__studio/entries")
        .then((r) => r.json())
        .then((d) => {
          document.getElementById("probe").textContent = JSON.stringify(
            Object.fromEntries(
              Object.entries(d.entries).map(([k, v]) => [k, v.length])
            ),
            null, 2
          );
        });
    </script>
  </body>
</html>
```

- [ ] **Step 7: Verify the API end to end**

Start the dev server in one terminal:

```bash
npm run dev
```

Confirm the log line `authoring studio at http://localhost:4321/Evan.github.io/studio` appears. Then in another terminal:

```bash
curl -s http://localhost:4321/__studio/entries | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(Object.entries(d.entries).map(([k,v])=>k+'='+v.length).join(' '))"
```

Expected: `projects=6 posts=2 career=9`.

```bash
curl -s http://localhost:4321/__studio/entry/projects/aetherfall | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.data.title, '| body chars:', d.body.length)"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/__studio/entry/projects/ghost
curl -s -X PUT -H 'Content-Type: application/json' -d '{"data":{"title":"X"},"body":""}' http://localhost:4321/__studio/entry/projects/aetherfall
```

Expected: the project title and a non-zero body length; `404` for the missing entry; a `422` with an `errors` array for the invalid PUT. Confirm `git status` shows `src/content/projects/aetherfall.md` unmodified — the rejected write must not have touched it.

Open `http://localhost:4321/Evan.github.io/studio` and confirm the probe page prints the three counts. Stop the dev server.

- [ ] **Step 8: Verify the build stays clean and run the isolation tests**

Run:

```bash
rm -rf dist && npm run build
npx vitest run tests/studioIsolation.test.ts
```

Expected: build succeeds; all 8 isolation assertions PASS; no `dist/studio` directory and no `__studio` string anywhere in `dist/`.

Run: `npx vitest run`
Expected: PASS, all suites.

- [ ] **Step 9: Commit**

```bash
git add src/studio/plugin.mjs src/studio/server.mjs src/studio/index.astro astro.config.mjs tests/studioIsolation.test.ts
git commit -m "feat: dev-only studio route and write API

Route is injected only when command === 'dev'; the API mounts in Vite's
configureServer with apply: 'serve'. Tests assert the build hooks inject
nothing and that dist/ contains no studio artifact."
```

---

### Task 8: Field descriptors

Layout only. Validation stays derived from the Zod schemas, so this file never repeats a constraint.

**Files:**
- Create: `src/studio/fields.ts`
- Test: `tests/studioFields.test.ts`

**Interfaces:**
- Consumes: `SCHEMAS` from Tasks 1 and 3.
- Produces:
  - `type Widget = "text" | "textarea" | "number" | "select" | "tags" | "url" | "bool" | "date" | "image" | "gallery" | "repeater" | "markdown"`
  - `interface Field { key: string; label: string; widget: Widget; options?: string[]; help?: string; imageKind?: "thumb" | "gallery" | "cover"; subFields?: Field[]; group?: string }`
  - `FIELDS: Record<"projects" | "posts" | "career", Field[]>`
  - `blankEntry(type): Record<string, unknown>`
  Tasks 10 and 11 render from `FIELDS` and start new entries from `blankEntry`.

- [ ] **Step 1: Write the failing test**

Create `tests/studioFields.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { FIELDS, blankEntry } from "@/studio/fields";
import { SCHEMAS } from "@/content/schemas";

describe("FIELDS", () => {
  it("covers the three authorable types", () => {
    expect(Object.keys(FIELDS)).toEqual(["projects", "posts", "career"]);
  });

  it("only names keys that exist in the matching schema", () => {
    for (const [type, fields] of Object.entries(FIELDS)) {
      const shape = Object.keys(SCHEMAS[type as keyof typeof SCHEMAS].shape);
      for (const field of fields) {
        expect(shape, `${type}.${field.key}`).toContain(field.key);
      }
    }
  });

  it("covers every required schema key so a new entry can be completed", () => {
    for (const [type, fields] of Object.entries(FIELDS)) {
      const schema = SCHEMAS[type as keyof typeof SCHEMAS];
      const declared = new Set(fields.map((f) => f.key));
      for (const [key, value] of Object.entries(schema.shape)) {
        if (!value.isOptional()) {
          expect(declared, `${type}.${key} is required but has no field`).toContain(key);
        }
      }
    }
  });

  it("gives every select widget its options", () => {
    for (const fields of Object.values(FIELDS)) {
      for (const field of fields.filter((f) => f.widget === "select")) {
        expect(field.options?.length, field.key).toBeGreaterThan(0);
      }
    }
  });

  it("gives every image and gallery widget an imageKind", () => {
    for (const fields of Object.values(FIELDS)) {
      for (const field of fields.filter((f) => f.widget === "image" || f.widget === "gallery")) {
        expect(field.imageKind, field.key).toBeTruthy();
      }
    }
  });

  it("gives the snippets repeater its sub-fields", () => {
    const snippets = FIELDS.projects.find((f) => f.key === "snippets");
    expect(snippets?.widget).toBe("repeater");
    expect(snippets?.subFields?.map((f) => f.key)).toEqual([
      "title", "language", "code", "caption",
    ]);
  });

  it("mirrors the status enum from the schema", () => {
    const status = FIELDS.projects.find((f) => f.key === "status");
    expect(status?.options).toEqual(SCHEMAS.projects.shape.status.options);
  });
});

describe("blankEntry", () => {
  it("produces a project stub that only fails on genuinely empty fields", () => {
    const stub = blankEntry("projects");
    expect(stub.status).toBe("in-development");
    expect(stub.platforms).toEqual([]);
    expect(stub.order).toBe(0);
  });

  it("produces a career stub with valid enum defaults", () => {
    const stub = blankEntry("career");
    expect(SCHEMAS.career.safeParse({ ...stub, title: "T", detail: "D", stamp: "2026" }).success)
      .toBe(true);
  });

  it("produces a post stub with today's date", () => {
    const stub = blankEntry("posts") as { date: string };
    expect(stub.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/studioFields.test.ts`
Expected: FAIL — cannot resolve `@/studio/fields`.

- [ ] **Step 3: Write the implementation**

Create `src/studio/fields.ts`:

```ts
// Form layout for the studio. Deliberately hand-written rather than derived
// from the Zod schemas: usable widget choices need hints (which string is a
// URL, which array is a tag list, which is a gallery) that would otherwise
// have to live in the build's schema. Validation stays schema-derived, so no
// constraint is repeated here.
import { SCHEMAS } from "../content/schemas";

export type Widget =
  | "text" | "textarea" | "number" | "select" | "tags" | "url"
  | "bool" | "date" | "image" | "gallery" | "repeater" | "markdown";

export interface Field {
  key: string;
  label: string;
  widget: Widget;
  options?: string[];
  help?: string;
  imageKind?: "thumb" | "gallery" | "cover";
  subFields?: Field[];
  group?: string;
}

const projectFields: Field[] = [
  { key: "title", label: "Title", widget: "text", group: "Identity" },
  { key: "tagline", label: "Tagline", widget: "text", group: "Identity", help: "Max 140 chars — shown under the title." },
  { key: "order", label: "Order", widget: "number", group: "Identity", help: "Lower shows first in the Mission Log." },
  { key: "year", label: "Year", widget: "number", group: "Identity" },
  { key: "status", label: "Status", widget: "select", options: [...SCHEMAS.projects.shape.status.options], group: "Identity" },
  { key: "featured", label: "Featured", widget: "bool", group: "Identity", help: "Pins this to the Featured Project panel." },

  { key: "employmentType", label: "Employment", widget: "select", options: [...SCHEMAS.projects.shape.employmentType.options], group: "Production" },
  { key: "studio", label: "Studio", widget: "text", group: "Production", help: "Leave blank for personal projects." },
  { key: "role", label: "Role", widget: "text", group: "Production" },
  { key: "teamSize", label: "Team size", widget: "text", group: "Production", help: "A number, or the word Individual." },
  { key: "duration", label: "Duration", widget: "text", group: "Production", help: "Free text, e.g. 6 months." },
  { key: "platforms", label: "Platforms", widget: "tags", group: "Production" },
  { key: "genres", label: "Genres", widget: "tags", group: "Production" },
  { key: "tech", label: "Tech", widget: "tags", group: "Production" },

  { key: "thumb", label: "Hero art", widget: "image", imageKind: "thumb", group: "Media", help: "Normalised to 1500x750." },
  { key: "gallery", label: "Gallery", widget: "gallery", imageKind: "gallery", group: "Media", help: "Checklist wants 4 or more." },

  { key: "keyInsights", label: "Key insights", widget: "tags", group: "Detail", help: "Up to 4. Checklist wants 3 or more." },
  { key: "links", label: "Links", widget: "repeater", group: "Detail", subFields: [
    { key: "platform", label: "Platform", widget: "select", options: ["steam", "itch", "github", "youtube", "website"] },
    { key: "url", label: "URL", widget: "url" },
  ] },
  { key: "snippets", label: "Code snippets", widget: "repeater", group: "Detail", subFields: [
    { key: "title", label: "Title", widget: "text" },
    { key: "language", label: "Language", widget: "text" },
    { key: "code", label: "Code", widget: "textarea" },
    { key: "caption", label: "Caption", widget: "text" },
  ] },
];

const postFields: Field[] = [
  { key: "title", label: "Title", widget: "text", group: "Identity" },
  { key: "summary", label: "Summary", widget: "textarea", group: "Identity", help: "Max 220 chars — used in listings and meta description." },
  { key: "date", label: "Date", widget: "date", group: "Identity" },
  { key: "updated", label: "Updated", widget: "date", group: "Identity" },
  { key: "author", label: "Author", widget: "text", group: "Identity" },
  { key: "draft", label: "Draft", widget: "bool", group: "Identity", help: "Drafts stay out of the listing." },
  { key: "tags", label: "Tags", widget: "tags", group: "Identity" },
  { key: "cover", label: "Cover", widget: "image", imageKind: "cover", group: "Media", help: "Doubles as the OG image. Normalised to 1200x630." },
];

const careerFields: Field[] = [
  { key: "stamp", label: "Stamp", widget: "text", group: "Entry", help: "Displayed date, e.g. 2023 or 2023 — PRESENT." },
  { key: "title", label: "Title", widget: "text", group: "Entry" },
  { key: "org", label: "Organisation", widget: "text", group: "Entry", help: "Shown for roles and education." },
  { key: "detail", label: "Detail", widget: "textarea", group: "Entry" },
  { key: "kind", label: "Kind", widget: "select", options: [...SCHEMAS.career.shape.kind.options], group: "Style" },
  { key: "tone", label: "Tone", widget: "select", options: [...SCHEMAS.career.shape.tone.options], group: "Style" },
  { key: "icon", label: "Icon", widget: "select", options: ["✦", "▲", "◆"], group: "Style", help: "Milestones only." },
];

export const FIELDS: Record<"projects" | "posts" | "career", Field[]> = {
  projects: projectFields,
  posts: postFields,
  career: careerFields,
};

const today = () => new Date().toISOString().slice(0, 10);

export function blankEntry(type: keyof typeof FIELDS): Record<string, unknown> {
  if (type === "projects") {
    return {
      title: "", tagline: "", order: 0, year: new Date().getFullYear(),
      status: "in-development", employmentType: "personal", studio: null,
      role: "", teamSize: "Individual", duration: "", platforms: [], genres: [],
      tech: [], thumb: "", gallery: [], keyInsights: [], links: {}, snippets: [],
    };
  }
  if (type === "posts") {
    return {
      title: "", summary: "", date: today(), tags: [],
      author: "Md. Nurusshafi Evan", draft: true,
    };
  }
  return { stamp: "", title: "", org: "", detail: "", kind: "milestone", tone: "cyan", icon: "✦" };
}
```

Note the `links` field is a repeater over `{ platform, url }` pairs for editing convenience; Task 10 converts that shape to and from the schema's keyed object.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/studioFields.test.ts`
Expected: PASS, all 11 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/studio/fields.ts tests/studioFields.test.ts
git commit -m "feat: studio field descriptors

Hand-written layout per content type, with enum options pulled from the
zod schemas so they cannot drift. Tests assert every required schema key
has a field and every field key exists in its schema."
```

---

### Task 9: Studio shell and chrome

The three-pane layout, styled from the site's own tokens so authoring feels continuous with the site.

**Files:**
- Modify: `src/studio/index.astro` (replace the Task 7 probe page)
- Create: `src/studio/studio.css`

**Interfaces:**
- Consumes: `src/styles/theme.css`, `src/styles/fonts.css`.
- Produces the DOM contract the client in Tasks 10 and 11 binds to:
  - `#sidebar` with one `<section class="rail-group" data-type="...">` per type, each containing `<button class="rail-new">` and `<ul class="rail-list">`
  - `#form-title`, `#form-fields`, `#form-checklist`
  - `#btn-save`, `#btn-discard`, `#btn-delete`, `#dirty-flag`
  - `#preview-frame`, `#preview-desktop`, `#preview-mobile`
  - `#toast`

- [ ] **Step 1: Write the stylesheet**

Create `src/studio/studio.css`:

```css
/* Studio chrome. Reuses the site's tokens so authoring looks like the site. */
@import "../styles/theme.css";

:root {
  --rail-w: 260px;
  --preview-w: 46%;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-void);
  color: var(--text-soft);
  font-family: "VT323", ui-monospace, monospace;
  font-size: 17px;
}

.studio {
  display: grid;
  grid-template-columns: var(--rail-w) 1fr var(--preview-w);
  height: 100vh;
}

.pane { overflow-y: auto; border-right: 1px solid color-mix(in srgb, var(--neon-cyan) 25%, transparent); }
.pane:last-child { border-right: none; }

.pane__head {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.7rem 0.9rem;
  background: var(--bg-deep);
  border-bottom: 1px solid color-mix(in srgb, var(--neon-cyan) 30%, transparent);
  font-family: "Press Start 2P", monospace;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: var(--neon-cyan);
  text-shadow: 0 0 6px var(--neon-cyan);
}

/* Sidebar */
.rail-group { border-bottom: 1px dashed color-mix(in srgb, var(--text-muted) 40%, transparent); }
.rail-list { list-style: none; margin: 0; padding: 0.3rem 0 0.6rem; }
.rail-item {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.35rem 0.9rem; cursor: pointer;
  border-left: 3px solid transparent;
}
.rail-item:hover { background: color-mix(in srgb, var(--bg-panel) 70%, transparent); }
.rail-item[aria-current="true"] {
  border-left-color: var(--neon-magenta);
  background: var(--bg-panel);
  color: var(--neon-magenta);
  text-shadow: 0 0 6px var(--neon-magenta);
}
.rail-item__grip { color: var(--text-muted); cursor: grab; user-select: none; }
.rail-item__meta { margin-left: auto; color: var(--text-muted); font-size: 0.85em; }
.rail-item.is-dragover { border-top: 2px solid var(--neon-yellow); }

/* Form */
.field { padding: 0.55rem 1rem; }
.field__label {
  display: block; margin-bottom: 0.25rem;
  font-family: "Press Start 2P", monospace; font-size: 0.55rem;
  letter-spacing: 0.06em; color: var(--neon-yellow);
}
.field__help { margin: 0.25rem 0 0; color: var(--text-muted); font-size: 0.85em; }
.field__error { margin: 0.25rem 0 0; color: var(--neon-magenta); font-size: 0.9em; }

input[type="text"], input[type="number"], input[type="url"], input[type="date"], select, textarea {
  width: 100%;
  padding: 0.4rem 0.55rem;
  background: var(--bg-void);
  color: var(--text-soft);
  border: 1px solid color-mix(in srgb, var(--neon-cyan) 45%, transparent);
  font-family: inherit; font-size: 1rem;
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--neon-magenta);
  box-shadow: 0 0 8px color-mix(in srgb, var(--neon-magenta) 50%, transparent);
}
textarea { min-height: 6rem; resize: vertical; }
textarea.is-code { font-size: 0.9rem; min-height: 10rem; white-space: pre; }

.group-head {
  margin: 1rem 0 0; padding: 0.4rem 1rem;
  background: color-mix(in srgb, var(--bg-panel) 60%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--neon-magenta) 35%, transparent);
  font-family: "Press Start 2P", monospace; font-size: 0.55rem;
  color: var(--neon-magenta); letter-spacing: 0.08em;
}

/* Tag chips */
.tags { display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: center; }
.chip {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.1rem 0.45rem;
  border: 1px solid var(--neon-cyan); color: var(--neon-cyan);
  background: color-mix(in srgb, var(--neon-cyan) 12%, transparent);
}
.chip button { background: none; border: none; color: inherit; cursor: pointer; padding: 0; font: inherit; }
.tags input { flex: 1 1 8rem; width: auto; }

/* Drop zones */
.drop {
  display: grid; place-items: center; gap: 0.4rem;
  min-height: 5.5rem; padding: 0.6rem; text-align: center;
  border: 2px dashed color-mix(in srgb, var(--neon-cyan) 50%, transparent);
  color: var(--text-muted); cursor: pointer;
}
.drop.is-over { border-color: var(--neon-yellow); color: var(--neon-yellow); }
.drop img { max-height: 6rem; }
.drop--busy { opacity: 0.5; pointer-events: none; }
.gallery-strip { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.4rem 0 0; }
.gallery-strip figure { position: relative; margin: 0; }
.gallery-strip img { height: 3.6rem; border: 1px solid var(--text-muted); display: block; }
.gallery-strip button {
  position: absolute; top: -0.4rem; right: -0.4rem;
  background: var(--neon-magenta); color: var(--bg-void);
  border: none; cursor: pointer; width: 1.2rem; height: 1.2rem; font: inherit; line-height: 1;
}

/* Repeater */
.repeat-row {
  border: 1px solid color-mix(in srgb, var(--text-muted) 45%, transparent);
  padding: 0.4rem; margin-bottom: 0.5rem;
}
.repeat-row__head { display: flex; justify-content: space-between; align-items: center; }

/* Buttons */
.btn {
  padding: 0.4rem 0.8rem; cursor: pointer;
  background: transparent; border: 1px solid var(--neon-cyan); color: var(--neon-cyan);
  font-family: "Press Start 2P", monospace; font-size: 0.55rem; letter-spacing: 0.06em;
}
.btn:hover { background: color-mix(in srgb, var(--neon-cyan) 18%, transparent); }
.btn--primary { border-color: var(--neon-magenta); color: var(--neon-magenta); }
.btn--primary:hover { background: color-mix(in srgb, var(--neon-magenta) 18%, transparent); }
.btn--danger { border-color: var(--neon-magenta); color: var(--neon-magenta); }
.btn[aria-pressed="true"] { background: color-mix(in srgb, var(--neon-cyan) 25%, transparent); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.actionbar {
  position: sticky; bottom: 0;
  display: flex; gap: 0.5rem; align-items: center;
  padding: 0.7rem 1rem;
  background: var(--bg-deep);
  border-top: 1px solid color-mix(in srgb, var(--neon-magenta) 35%, transparent);
}
#dirty-flag { margin-left: auto; color: var(--neon-yellow); font-size: 0.9em; }

/* Checklist chips */
.checklist { display: flex; flex-wrap: wrap; gap: 0.3rem; padding: 0.6rem 1rem; }
.checklist span { padding: 0.1rem 0.4rem; border: 1px solid currentColor; font-size: 0.85em; }
.checklist .ok { color: var(--terminal-grn); }
.checklist .no { color: var(--text-muted); }

/* Preview */
.preview-body { padding: 0.6rem; height: calc(100vh - 3rem); }
#preview-frame {
  width: 100%; height: 100%;
  border: 1px solid color-mix(in srgb, var(--neon-cyan) 35%, transparent);
  background: var(--bg-void);
  transition: width 200ms ease;
}
#preview-frame.is-mobile { width: 400px; max-width: 100%; margin: 0 auto; display: block; }

/* Toast */
#toast {
  position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%);
  padding: 0.5rem 1rem; background: var(--bg-panel);
  border: 1px solid var(--neon-cyan); color: var(--neon-cyan);
  opacity: 0; transition: opacity 200ms ease; pointer-events: none; z-index: 9;
}
#toast.is-visible { opacity: 1; }
#toast.is-error { border-color: var(--neon-magenta); color: var(--neon-magenta); }

.empty { padding: 2rem 1rem; color: var(--text-muted); text-align: center; }
```

- [ ] **Step 2: Replace the studio page**

Replace the whole of `src/studio/index.astro`:

```astro
---
// Local authoring tool. Injected at /studio by src/studio/plugin.mjs, and only
// when `command === "dev"` — this file is never built into dist/.
import "@fontsource/press-start-2p";
import "@fontsource/vt323";
import "./studio.css";
import { withBase } from "../lib/url";

const previewHome = withBase("/");
---
<html lang="en" data-preview-home={previewHome}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>STUDIO // Evan Portfolio</title>
  </head>
  <body>
    <div class="studio">
      <div class="pane" id="sidebar">
        <div class="pane__head"><span>STUDIO</span></div>
        <section class="rail-group" data-type="projects">
          <div class="pane__head"><span>PROJECTS</span><button class="btn rail-new" type="button">+ NEW</button></div>
          <ul class="rail-list"></ul>
        </section>
        <section class="rail-group" data-type="posts">
          <div class="pane__head"><span>POSTS</span><button class="btn rail-new" type="button">+ NEW</button></div>
          <ul class="rail-list"></ul>
        </section>
        <section class="rail-group" data-type="career">
          <div class="pane__head"><span>CAREER</span><button class="btn rail-new" type="button">+ NEW</button></div>
          <ul class="rail-list"></ul>
        </section>
      </div>

      <div class="pane" id="editor">
        <div class="pane__head"><span id="form-title">NOTHING SELECTED</span></div>
        <div class="checklist" id="form-checklist"></div>
        <form id="form-fields" autocomplete="off">
          <p class="empty">Pick an entry on the left, or start a new one.</p>
        </form>
        <div class="actionbar">
          <button class="btn btn--primary" id="btn-save" type="button" disabled>SAVE</button>
          <button class="btn" id="btn-discard" type="button" disabled>DISCARD</button>
          <button class="btn btn--danger" id="btn-delete" type="button" disabled>DELETE</button>
          <span id="dirty-flag"></span>
        </div>
      </div>

      <div class="pane" id="preview">
        <div class="pane__head">
          <span>PREVIEW</span>
          <span>
            <button class="btn" id="preview-desktop" type="button" aria-pressed="true">DESKTOP</button>
            <button class="btn" id="preview-mobile" type="button" aria-pressed="false">MOBILE</button>
          </span>
        </div>
        <div class="preview-body">
          <iframe id="preview-frame" title="Live site preview" src={previewHome}></iframe>
        </div>
      </div>
    </div>

    <div id="toast" role="status" aria-live="polite"></div>
    <script>
      import "./client";
    </script>
  </body>
</html>
```

- [ ] **Step 3: Verify the shell renders**

Run `npm run dev` and open `http://localhost:4321/Evan.github.io/studio`.

Expected: three panes fill the viewport; the sidebar shows three empty groups with `+ NEW` buttons; the preview iframe renders the actual site home page; fonts are Press Start 2P for labels and VT323 for body text; the browser console shows only the expected "cannot resolve ./client" error, which Task 10 fixes.

- [ ] **Step 4: Confirm the build is still clean**

Run: `rm -rf dist && npm run build && npx vitest run tests/studioIsolation.test.ts`
Expected: build succeeds; isolation tests PASS; `studio.css` does not appear in `dist/`.

- [ ] **Step 5: Commit**

```bash
git add src/studio/index.astro src/studio/studio.css
git commit -m "feat: studio three-pane shell

Layout and chrome built from the site's own theme tokens and fonts, with
a preview iframe pointed at the running dev server rather than a
reimplementation of the site's cards."
```

---

### Task 10: Form rendering and widgets

**Files:**
- Create: `src/studio/widgets.ts`
- Create: `src/studio/client.ts`
- Test: `tests/studioWidgets.test.ts`

**Interfaces:**
- Consumes: `FIELDS`, `blankEntry`, `Field` from Task 8; the API contract from Task 7.
- Produces:
  - From `widgets.ts` (pure, unit-tested): `parseTagInput(raw: string): string[]`, `linksToRows(links): Array<{platform,url}>`, `rowsToLinks(rows): Record<string,string>`, `coerceValue(field: Field, raw: string): unknown`.
  - From `widgets.ts` (DOM): `renderField(field: Field, value: unknown, onChange: (key: string, value: unknown) => void): HTMLElement`.
  - From `client.ts`: nothing exported — it is the page entry point.
  Task 11 adds preview, dirty tracking, and drag-reorder to `client.ts`.

- [ ] **Step 1: Write the failing test**

Vitest runs in a `node` environment, so the tests cover the pure value logic; DOM rendering is verified manually in Step 5. Create `tests/studioWidgets.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/studioWidgets.test.ts`
Expected: FAIL — cannot resolve `@/studio/widgets`.

- [ ] **Step 3: Write widgets.ts**

Create `src/studio/widgets.ts`:

```ts
import type { Field } from "./fields";

export function parseTagInput(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

export function linksToRows(
  links: Record<string, string | undefined> | undefined
): Array<{ platform: string; url: string }> {
  if (!links) return [];
  return Object.entries(links)
    .filter(([, url]) => typeof url === "string")
    .map(([platform, url]) => ({ platform, url: url as string }));
}

export function rowsToLinks(
  rows: Array<{ platform: string; url: string }>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (row.platform && row.url.trim()) out[row.platform] = row.url.trim();
  }
  return out;
}

export function coerceValue(field: Field, raw: string): unknown {
  if (field.widget === "number") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (field.widget === "bool") return raw === "true";
  if (field.key === "teamSize") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    return trimmed;
  }
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : raw;
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = []
): HTMLElementTagNameMap[K] => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
};

async function uploadImage(kind: string, name: string, file: File): Promise<string> {
  const res = await fetch(
    `/__studio/image?kind=${encodeURIComponent(kind)}&name=${encodeURIComponent(name)}`,
    { method: "POST", body: file }
  );
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error ?? "upload failed");
  return payload.path as string;
}

function dropZone(
  field: Field,
  nameHint: () => string,
  onPath: (path: string) => void
): HTMLElement {
  const zone = el("div", { className: "drop", tabIndex: 0 }, ["drop image or click to browse"]);
  const picker = el("input", { type: "file", accept: "image/*", hidden: true });

  const ingest = async (file: File | undefined) => {
    if (!file) return;
    zone.classList.add("drop--busy");
    zone.textContent = "processing…";
    try {
      onPath(await uploadImage(field.imageKind ?? "thumb", nameHint(), file));
    } catch (err) {
      zone.textContent = (err as Error).message;
    } finally {
      zone.classList.remove("drop--busy");
    }
  };

  zone.addEventListener("click", () => picker.click());
  picker.addEventListener("change", () => ingest(picker.files?.[0]));
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("is-over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("is-over");
    ingest(e.dataTransfer?.files?.[0]);
  });

  return el("div", {}, [zone, picker]);
}

export function renderField(
  field: Field,
  value: unknown,
  onChange: (key: string, value: unknown) => void,
  nameHint: () => string = () => field.key
): HTMLElement {
  const wrap = el("div", { className: "field" });
  wrap.append(el("label", { className: "field__label" }, [field.label]));

  const emit = (next: unknown) => onChange(field.key, next);

  switch (field.widget) {
    case "select": {
      const select = el("select");
      if (!field.options?.includes(String(value))) select.append(el("option", { value: "" }, ["—"]));
      for (const option of field.options ?? []) {
        select.append(el("option", { value: option, selected: option === value }, [option]));
      }
      select.addEventListener("change", () => emit(select.value || undefined));
      wrap.append(select);
      break;
    }
    case "bool": {
      const box = el("input", { type: "checkbox", checked: Boolean(value) });
      box.addEventListener("change", () => emit(box.checked));
      wrap.append(box);
      break;
    }
    case "number":
    case "date":
    case "url":
    case "text": {
      const input = el("input", {
        type: field.widget === "number" ? "number" : field.widget === "date" ? "date" : field.widget === "url" ? "url" : "text",
        value: value == null ? "" : String(value).slice(0, field.widget === "date" ? 10 : undefined),
      });
      input.addEventListener("input", () => emit(coerceValue(field, input.value)));
      wrap.append(input);
      break;
    }
    case "textarea":
    case "markdown": {
      const area = el("textarea", {
        value: value == null ? "" : String(value),
        className: field.key === "code" ? "is-code" : "",
      });
      area.addEventListener("input", () => emit(area.value === "" ? undefined : area.value));
      wrap.append(area);
      break;
    }
    case "tags": {
      const list = Array.isArray(value) ? [...(value as string[])] : [];
      const box = el("div", { className: "tags" });
      const input = el("input", { type: "text", placeholder: "add, comma, separated" });

      const paint = () => {
        box.replaceChildren();
        list.forEach((tag, index) => {
          const remove = el("button", { type: "button", title: `Remove ${tag}` }, ["×"]);
          remove.addEventListener("click", () => {
            list.splice(index, 1);
            paint();
            emit([...list]);
          });
          box.append(el("span", { className: "chip" }, [tag, remove]));
        });
        box.append(input);
        input.focus();
      };

      const commit = () => {
        const added = parseTagInput(input.value).filter((tag) => !list.includes(tag));
        if (!added.length) return;
        list.push(...added);
        input.value = "";
        paint();
        emit([...list]);
      };

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === ",") {
          e.preventDefault();
          commit();
        }
      });
      input.addEventListener("blur", commit);
      paint();
      wrap.append(box);
      break;
    }
    case "image": {
      const preview = el("div");
      const paint = (path: unknown) => {
        preview.replaceChildren();
        if (typeof path === "string" && path) {
          preview.append(el("img", { src: path, alt: "" }), el("code", {}, [path]));
        }
      };
      paint(value);
      wrap.append(
        preview,
        dropZone(field, nameHint, (path) => {
          paint(path);
          emit(path);
        })
      );
      break;
    }
    case "gallery": {
      const list = Array.isArray(value) ? [...(value as string[])] : [];
      const strip = el("div", { className: "gallery-strip" });
      const paint = () => {
        strip.replaceChildren();
        list.forEach((path, index) => {
          const remove = el("button", { type: "button", title: "Remove" }, ["×"]);
          remove.addEventListener("click", () => {
            list.splice(index, 1);
            paint();
            emit([...list]);
          });
          strip.append(el("figure", {}, [el("img", { src: path, alt: "" }), remove]));
        });
      };
      paint();
      wrap.append(
        strip,
        dropZone(field, () => `${nameHint()}-${list.length + 1}`, (path) => {
          list.push(path);
          paint();
          emit([...list]);
        })
      );
      break;
    }
    case "repeater": {
      const rows: Array<Record<string, unknown>> =
        field.key === "links"
          ? linksToRows(value as Record<string, string>)
          : Array.isArray(value)
            ? (value as Array<Record<string, unknown>>).map((row) => ({ ...row }))
            : [];

      const host = el("div");
      const publish = () =>
        emit(
          field.key === "links"
            ? rowsToLinks(rows as Array<{ platform: string; url: string }>)
            : rows.length
              ? rows.map((row) => ({ ...row }))
              : undefined
        );

      const paint = () => {
        host.replaceChildren();
        rows.forEach((row, index) => {
          const remove = el("button", { className: "btn btn--danger", type: "button" }, ["REMOVE"]);
          remove.addEventListener("click", () => {
            rows.splice(index, 1);
            paint();
            publish();
          });
          const block = el("div", { className: "repeat-row" }, [
            el("div", { className: "repeat-row__head" }, [
              el("strong", {}, [`#${index + 1}`]),
              remove,
            ]),
          ]);
          for (const sub of field.subFields ?? []) {
            block.append(
              renderField(sub, row[sub.key], (key, next) => {
                row[key] = next;
                publish();
              })
            );
          }
          host.append(block);
        });
        const add = el("button", { className: "btn", type: "button" }, ["+ ADD"]);
        add.addEventListener("click", () => {
          rows.push({});
          paint();
        });
        host.append(add);
      };
      paint();
      wrap.append(host);
      break;
    }
  }

  if (field.help) wrap.append(el("p", { className: "field__help" }, [field.help]));
  wrap.append(el("p", { className: "field__error", id: `err-${field.key}`, hidden: true }));
  return wrap;
}
```

- [ ] **Step 4: Write client.ts**

Create `src/studio/client.ts`. Task 11 extends the marked sections:

```ts
import { FIELDS, blankEntry, type Field } from "./fields";
import { renderField } from "./widgets";

type Type = keyof typeof FIELDS;

interface RailEntry {
  id: string;
  title: string;
  data: Record<string, unknown>;
}

const api = async (path: string, init?: RequestInit) => {
  const res = await fetch(`/__studio${path}`, init);
  const payload = res.status === 204 ? {} : await res.json();
  if (!res.ok) throw Object.assign(new Error(payload.error ?? res.statusText), payload);
  return payload;
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const state = {
  lists: {} as Record<Type, RailEntry[]>,
  type: null as Type | null,
  id: null as string | null,
  data: {} as Record<string, unknown>,
  body: "",
  pristine: "",
  isNew: false,
};

function toast(message: string, isError = false) {
  const node = $("toast");
  node.textContent = message;
  node.classList.toggle("is-error", isError);
  node.classList.add("is-visible");
  window.setTimeout(() => node.classList.remove("is-visible"), 2600);
}

const snapshot = () => JSON.stringify({ data: state.data, body: state.body });

// Extended in Task 11 with the dirty flag and preview refresh.
function onFormChanged() {
  const dirty = snapshot() !== state.pristine;
  $<HTMLButtonElement>("btn-save").disabled = !dirty;
  $<HTMLButtonElement>("btn-discard").disabled = !dirty;
  $<HTMLButtonElement>("btn-delete").disabled = state.isNew || !state.id;
  $("dirty-flag").textContent = dirty ? "● UNSAVED" : "";
}

function renderChecklist() {
  const host = $("form-checklist");
  host.replaceChildren();
  if (state.type !== "projects") return;
  const data = state.data as Record<string, unknown>;
  const links = (data.links ?? {}) as Record<string, string>;
  const checks: Array<[string, boolean]> = [
    ["hero art", Boolean(data.thumb)],
    ["tagline", Boolean(String(data.tagline ?? "").trim())],
    ["insights ≥ 3", ((data.keyInsights as string[]) ?? []).length >= 3],
    ["gallery ≥ 4", ((data.gallery as string[]) ?? []).length >= 4],
    ["a link", Object.values(links).some(Boolean)],
    ["role section", /##\s+Role & Responsibilities\s*\n\s*\S/.test(state.body)],
    ["learnings", /##\s+Learnings\s*\n\s*\S/.test(state.body)],
    ["behind the scenes", /##\s+Behind the Scenes\s*\n\s*\S/.test(state.body)],
  ];
  for (const [label, ok] of checks) {
    const chip = document.createElement("span");
    chip.className = ok ? "ok" : "no";
    chip.textContent = `${ok ? "✓" : "·"} ${label}`;
    host.append(chip);
  }
}

function renderForm() {
  const form = $("form-fields");
  form.replaceChildren();
  if (!state.type) {
    form.innerHTML = '<p class="empty">Pick an entry on the left, or start a new one.</p>';
    return;
  }

  const onChange = (key: string, value: unknown) => {
    if (value === undefined) delete state.data[key];
    else state.data[key] = value;
    renderChecklist();
    onFormChanged();
  };

  const nameHint = () => String(state.data.title ?? state.id ?? "untitled");

  let group = "";
  for (const field of FIELDS[state.type]) {
    if (field.group && field.group !== group) {
      group = field.group;
      const head = document.createElement("p");
      head.className = "group-head";
      head.textContent = group;
      form.append(head);
    }
    form.append(renderField(field, state.data[field.key], onChange, nameHint));
  }

  if (state.type !== "career") {
    const head = document.createElement("p");
    head.className = "group-head";
    head.textContent = "Body (markdown)";
    form.append(head);
    const bodyField: Field = { key: "__body", label: "Markdown", widget: "markdown" };
    form.append(
      renderField(bodyField, state.body, (_key, value) => {
        state.body = value == null ? "" : String(value);
        renderChecklist();
        onFormChanged();
      })
    );
  }

  renderChecklist();
  onFormChanged();
}

function showErrors(errors: Array<{ path: string; message: string }> = []) {
  for (const node of document.querySelectorAll<HTMLElement>(".field__error")) {
    node.hidden = true;
    node.textContent = "";
  }
  for (const issue of errors) {
    const node = document.getElementById(`err-${issue.path.split(".")[0]}`);
    if (node) {
      node.textContent = issue.message;
      node.hidden = false;
    }
  }
}

// Extended in Task 11 with drag-reorder.
function renderRails() {
  for (const section of document.querySelectorAll<HTMLElement>(".rail-group")) {
    const type = section.dataset.type as Type;
    const list = section.querySelector<HTMLUListElement>(".rail-list")!;
    list.replaceChildren();
    for (const entry of state.lists[type] ?? []) {
      const item = document.createElement("li");
      item.className = "rail-item";
      item.dataset.id = entry.id;
      item.dataset.type = type;
      if (state.type === type && state.id === entry.id) item.setAttribute("aria-current", "true");
      if (type !== "posts") {
        const grip = document.createElement("span");
        grip.className = "rail-item__grip";
        grip.textContent = "∷";
        item.append(grip);
      }
      const label = document.createElement("span");
      label.textContent = entry.title;
      const meta = document.createElement("span");
      meta.className = "rail-item__meta";
      meta.textContent = String(entry.data.year ?? entry.data.stamp ?? "");
      item.append(label, meta);
      item.addEventListener("click", () => void select(type, entry.id));
      list.append(item);
    }
  }
}

async function refreshLists() {
  const { entries } = await api("/entries");
  state.lists = entries;
  renderRails();
}

// Extended in Task 11 to point the preview iframe at the entry.
async function select(type: Type, id: string) {
  if (snapshot() !== state.pristine && !confirm("Discard unsaved changes?")) return;
  const entry = await api(`/entry/${type}/${id}`);
  state.type = type;
  state.id = id;
  state.data = entry.data;
  state.body = entry.body ?? "";
  state.isNew = false;
  state.pristine = snapshot();
  $("form-title").textContent = `${type.toUpperCase()} // ${id}`;
  showErrors();
  renderForm();
  renderRails();
}

function startNew(type: Type) {
  if (snapshot() !== state.pristine && !confirm("Discard unsaved changes?")) return;
  state.type = type;
  state.id = null;
  state.data = blankEntry(type);
  state.body =
    type === "projects"
      ? "\n## Role & Responsibilities\n\n\n## Learnings\n\n\n## Behind the Scenes\n\n"
      : type === "posts"
        ? "\n\n"
        : "";
  state.isNew = true;
  state.pristine = "";
  $("form-title").textContent = `${type.toUpperCase()} // NEW`;
  showErrors();
  renderForm();
  renderRails();
}

// Extended in Task 11 to reload the preview after a successful save.
async function save() {
  if (!state.type) return;
  const payload = JSON.stringify({ data: state.data, body: state.body });
  try {
    const result = state.isNew
      ? await api(`/entry/${state.type}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        })
      : await api(`/entry/${state.type}/${state.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
    showErrors();
    state.id = result.id;
    state.isNew = false;
    state.pristine = snapshot();
    await refreshLists();
    onFormChanged();
    toast(`saved ${state.type}/${result.id}`);
  } catch (err) {
    const issues = (err as { errors?: Array<{ path: string; message: string }> }).errors;
    if (issues) {
      showErrors(issues);
      toast(`${issues.length} field${issues.length > 1 ? "s" : ""} need attention`, true);
    } else {
      toast((err as Error).message, true);
    }
  }
}

async function remove() {
  if (!state.type || !state.id) return;
  const button = $<HTMLButtonElement>("btn-delete");
  if (button.dataset.armed !== "true") {
    button.dataset.armed = "true";
    button.textContent = "CONFIRM DELETE";
    window.setTimeout(() => {
      button.dataset.armed = "false";
      button.textContent = "DELETE";
    }, 4000);
    return;
  }
  const { trashed } = await api(`/entry/${state.type}/${state.id}`, { method: "DELETE" });
  button.dataset.armed = "false";
  button.textContent = "DELETE";
  toast(`deleted — copy kept at ${trashed}`);
  state.type = null;
  state.id = null;
  state.data = {};
  state.body = "";
  state.pristine = snapshot();
  await refreshLists();
  renderForm();
}

$("btn-save").addEventListener("click", () => void save());
$("btn-delete").addEventListener("click", () => void remove());
$("btn-discard").addEventListener("click", () => {
  if (state.isNew && state.type) startNew(state.type);
  else if (state.type && state.id) void select(state.type, state.id);
});
for (const button of document.querySelectorAll<HTMLElement>(".rail-new")) {
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    startNew((button.closest(".rail-group") as HTMLElement).dataset.type as Type);
  });
}
window.addEventListener("beforeunload", (e) => {
  if (snapshot() !== state.pristine) e.preventDefault();
});

void refreshLists();
```

- [ ] **Step 5: Run tests and verify the form manually**

Run: `npx vitest run tests/studioWidgets.test.ts`
Expected: PASS, all 15 assertions.

Run `npm run dev`, open the studio, and verify:
- The sidebar lists 6 projects, 2 posts, 9 career entries.
- Clicking `aetherfall` fills the form; tags render as chips; `snippets` renders as repeater rows with the code in a monospace textarea; the checklist chips show green ticks.
- Editing the title enables SAVE and shows `● UNSAVED`; DISCARD reverts it and disables both.
- SAVE writes the file — confirm with `git diff src/content/projects/aetherfall.md` that only the intended frontmatter key changed and the body is untouched. Then `git checkout src/content/projects/aetherfall.md`.
- Clearing `tagline` and saving returns a 422 and shows the message under that field; `git status` confirms the file was not modified.
- `+ NEW` under CAREER gives a blank form with valid enum defaults; saving it appends to `src/data/career.json`; DELETE requires a second click and reports the trash path. Then `git checkout src/data/career.json` and `rm -rf .studio-trash`.
- Dropping a PNG on the hero art zone writes `public/images/thumbs/<slug>.png` at 1500x750 and fills the field. Delete the test file afterwards.

- [ ] **Step 6: Commit**

```bash
git add src/studio/widgets.ts src/studio/client.ts tests/studioWidgets.test.ts
git commit -m "feat: studio form rendering and widgets

Renders each content type from its field descriptors, with tag chips,
image drop zones, repeaters for snippets and links, and a live
completeness checklist. Server 422s surface as per-field errors."
```

---

### Task 11: Live preview, viewport toggle, and drag-reorder

**Files:**
- Modify: `src/studio/client.ts` (the sections Task 10 marked for extension)
- Test: `tests/studioReorder.test.ts`

**Interfaces:**
- Consumes: `state`, `select`, `save`, `renderRails`, `api` from Task 10; `TYPES[type].route` from Task 4.
- Produces: `previewUrlFor(type, id, base): string`, exported from `src/studio/preview.ts` so it can be unit-tested; and `moveInList(ids, from, to): string[]`, exported from the same module.

- [ ] **Step 1: Write the failing test**

Create `tests/studioReorder.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { moveInList, previewUrlFor } from "@/studio/preview";

describe("moveInList", () => {
  it("moves an item later", () => {
    expect(moveInList(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an item earlier", () => {
    expect(moveInList(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("is a no-op when the index does not change", () => {
    expect(moveInList(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input", () => {
    const ids = ["a", "b"];
    moveInList(ids, 0, 1);
    expect(ids).toEqual(["a", "b"]);
  });

  it("clamps an out-of-range target", () => {
    expect(moveInList(["a", "b"], 0, 9)).toEqual(["b", "a"]);
  });
});

describe("previewUrlFor", () => {
  it("points at the project detail page under the configured base", () => {
    expect(previewUrlFor("projects", "aetherfall", "/Evan.github.io/")).toBe(
      "/Evan.github.io/projects/aetherfall"
    );
  });

  it("points at the devlog post page", () => {
    expect(previewUrlFor("posts", "welcome-to-the-devlog", "/Evan.github.io/")).toBe(
      "/Evan.github.io/devlog/welcome-to-the-devlog"
    );
  });

  it("points career entries at the home page anchor", () => {
    expect(previewUrlFor("career", "gameplay-programmer", "/Evan.github.io/")).toBe(
      "/Evan.github.io/#career"
    );
  });

  it("falls back to the base when there is no id yet", () => {
    expect(previewUrlFor("projects", null, "/Evan.github.io/")).toBe("/Evan.github.io/");
  });

  it("works with a root base", () => {
    expect(previewUrlFor("projects", "alpha", "/")).toBe("/projects/alpha");
  });

  it("adds a cache-busting parameter when asked", () => {
    const url = previewUrlFor("projects", "alpha", "/", 1234);
    expect(url).toBe("/projects/alpha?studio=1234");
  });

  it("appends the cache-buster before a hash", () => {
    expect(previewUrlFor("career", "x", "/", 99)).toBe("/?studio=99#career");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/studioReorder.test.ts`
Expected: FAIL — cannot resolve `@/studio/preview`.

- [ ] **Step 3: Write preview.ts**

Create `src/studio/preview.ts`:

```ts
// Route mapping and list-move maths, split out so both are unit-testable
// without a DOM.
const ROUTES = {
  projects: "projects/",
  posts: "devlog/",
  career: "#career",
} as const;

export function previewUrlFor(
  type: keyof typeof ROUTES,
  id: string | null,
  base: string,
  bust?: number
): string {
  const home = base.endsWith("/") ? base : `${base}/`;
  const query = bust ? `?studio=${bust}` : "";

  if (type === "career") return `${home}${query}#career`;
  if (!id) return `${home}${query}`;
  return `${home}${ROUTES[type]}${id}${query}`;
}

export function moveInList(ids: string[], from: number, to: number): string[] {
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  const target = Math.max(0, Math.min(to, next.length));
  next.splice(target, 0, moved);
  return next;
}
```

- [ ] **Step 4: Wire preview and reorder into client.ts**

Add to the imports at the top of `src/studio/client.ts`:

```ts
import { moveInList, previewUrlFor } from "./preview";
```

Add the base and the refresh helper after the `state` declaration:

```ts
const BASE = document.documentElement.dataset.previewHome ?? "/";

function refreshPreview(bust = false) {
  if (!state.type) return;
  const frame = $<HTMLIFrameElement>("preview-frame");
  const next = previewUrlFor(state.type, state.id, BASE, bust ? Date.now() : undefined);
  if (frame.getAttribute("src") !== next) frame.setAttribute("src", next);
  else if (bust) frame.contentWindow?.location.reload();
}
```

Add the viewport toggle next to the other listeners at the bottom:

```ts
const setViewport = (mobile: boolean) => {
  $("preview-frame").classList.toggle("is-mobile", mobile);
  $("preview-desktop").setAttribute("aria-pressed", String(!mobile));
  $("preview-mobile").setAttribute("aria-pressed", String(mobile));
};
$("preview-desktop").addEventListener("click", () => setViewport(false));
$("preview-mobile").addEventListener("click", () => setViewport(true));
```

In `select`, after `renderRails()`, add:

```ts
  refreshPreview();
```

In `save`, replace the `toast(\`saved ${state.type}/${result.id}\`);` line with:

```ts
    refreshPreview(true);
    toast(`saved ${state.type}/${result.id}`);
```

In `remove`, after `renderForm();`, add:

```ts
  $<HTMLIFrameElement>("preview-frame").setAttribute("src", BASE);
```

Then replace `renderRails` with the drag-enabled version:

```ts
function renderRails() {
  for (const section of document.querySelectorAll<HTMLElement>(".rail-group")) {
    const type = section.dataset.type as Type;
    const list = section.querySelector<HTMLUListElement>(".rail-list")!;
    const reorderable = type !== "posts";
    list.replaceChildren();

    for (const entry of state.lists[type] ?? []) {
      const item = document.createElement("li");
      item.className = "rail-item";
      item.dataset.id = entry.id;
      item.dataset.type = type;
      item.draggable = reorderable;
      if (state.type === type && state.id === entry.id) item.setAttribute("aria-current", "true");

      if (reorderable) {
        const grip = document.createElement("span");
        grip.className = "rail-item__grip";
        grip.textContent = "∷";
        item.append(grip);
      }
      const label = document.createElement("span");
      label.textContent = entry.title;
      const meta = document.createElement("span");
      meta.className = "rail-item__meta";
      meta.textContent = String(entry.data.year ?? entry.data.stamp ?? "");
      item.append(label, meta);
      item.addEventListener("click", () => void select(type, entry.id));

      if (reorderable) {
        item.addEventListener("dragstart", (e) => {
          e.dataTransfer?.setData("text/plain", `${type}:${entry.id}`);
        });
        item.addEventListener("dragover", (e) => {
          e.preventDefault();
          item.classList.add("is-dragover");
        });
        item.addEventListener("dragleave", () => item.classList.remove("is-dragover"));
        item.addEventListener("drop", (e) => {
          e.preventDefault();
          item.classList.remove("is-dragover");
          const [dragType, dragId] = (e.dataTransfer?.getData("text/plain") ?? "").split(":");
          if (dragType !== type || !dragId || dragId === entry.id) return;
          void commitReorder(type, dragId, entry.id);
        });
      }
      list.append(item);
    }
  }
}

async function commitReorder(type: Type, dragId: string, dropId: string) {
  const ids = (state.lists[type] ?? []).map((entry) => entry.id);
  const next = moveInList(ids, ids.indexOf(dragId), ids.indexOf(dropId));
  try {
    await api(`/reorder/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next }),
    });
    await refreshLists();
    refreshPreview(true);
    toast(`reordered ${type}`);
  } catch (err) {
    toast((err as Error).message, true);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/studioReorder.test.ts`
Expected: PASS, all 12 assertions.

- [ ] **Step 6: Verify the preview and reorder manually**

Run `npm run dev`, open the studio, and verify:
- Selecting a project loads `/Evan.github.io/projects/<slug>` in the iframe, rendered by the real `ProjectLayout` and components.
- Selecting a post loads its devlog page; selecting a career entry loads the home page scrolled to the timeline.
- Editing the tagline and saving updates the iframe to show the new text.
- MOBILE narrows the iframe to 400px and the site's responsive rules take over; DESKTOP restores it.
- Dragging `high-noon` above `aetherfall` reorders the sidebar, and `git diff src/content/projects/` shows only `order` values changed with all bodies intact. Then `git checkout src/content/projects/`.
- Dragging a career entry reorders `src/data/career.json`, and the iframe timeline reflects the new order. Then `git checkout src/data/career.json`.
- Post entries have no grip and cannot be dragged.
- Editing with unsaved changes and then clicking another entry prompts before discarding.

- [ ] **Step 7: Run the full suite and confirm the build**

Run:

```bash
npx vitest run
rm -rf dist && npm run build
npx vitest run tests/studioIsolation.test.ts
npx astro check
git status
```

Expected: all suites PASS; the build succeeds; isolation tests PASS; `astro check` reports no new errors; `git status` clean apart from the intended new files.

- [ ] **Step 8: Commit**

```bash
git add src/studio/preview.ts src/studio/client.ts tests/studioReorder.test.ts
git commit -m "feat: studio live preview and drag-reorder

Preview iframe follows the selected entry and reloads on save, with a
mobile width toggle. Drag-reorder rewrites project order fields and
splices career.json; posts stay date-sorted and undraggable."
```

---

### Task 12: Document the workflow

**Files:**
- Modify: `README.md` (extend "Local development" and "Content authoring guide")

**Interfaces:**
- Consumes: everything above.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the studio section to the README**

In `README.md`, immediately after the `## Local development` section, insert:

```markdown
## Authoring studio

Run the dev server and open the studio:

```bash
npm run dev
# then http://localhost:4321/Evan.github.io/studio
```

The studio creates, edits, reorders, and deletes projects, devlog posts, and
career entries, writing straight to `src/content/` and `src/data/career.json`.
The right-hand pane is an iframe of the running dev server, so the preview is
the real site rendered by the real components.

**It is dev-only by construction.** The route is injected by
`src/studio/plugin.mjs` only when `command === "dev"`, and the write API mounts
in Vite's `configureServer` hook, which has no production counterpart. Neither
appears in `dist/`, and `tests/studioIsolation.test.ts` asserts that.

Notes:

- Changes are written to your working tree. Review with `git diff` and commit as usual — nothing deploys until you push.
- Deleted entries are copied to `.studio-trash/` (gitignored) before removal, so a never-committed entry is still recoverable.
- Dropped images are normalised by `sharp`: hero art to 1500x750, gallery to 1600x900, post covers to 1200x630, all PNG.
- Invalid frontmatter is rejected before anything is written, with the error shown under the offending field.
- Projects and career entries reorder by dragging in the sidebar. Posts sort by `date`, so they have no drag handle.
```

- [ ] **Step 2: Update the Career Log authoring section**

Replace the body of the `### Career Log (timeline)` section, which currently
describes editing the array inside the component, with:

```markdown
Career entries live in `src/data/career.json`, loaded as a content collection
and validated by `careerSchema` in `src/content/schemas.ts`. Array order is
display order, newest first.

Each entry takes `stamp` (the displayed date, e.g. `2023 — PRESENT`), `title`,
optional `org`, `detail`, `tone` (`magenta` / `cyan` / `yellow`), `kind`
(`role` / `milestone` / `education`), and an optional `icon` for milestones.

Easiest path: the authoring studio. By hand: edit the JSON directly.
```

- [ ] **Step 3: Note the studio in the Stack section**

Add to the `## Stack` list:

```markdown
- Authoring: dev-only studio at `/studio` (Vite middleware + `yaml` + `sharp`)
```

- [ ] **Step 4: Verify the documented commands work**

Run each command block in the new README sections verbatim and confirm the
described behaviour. In particular confirm the studio URL is correct for the
configured `base`.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: authoring studio workflow

Documents the dev-only studio, why it cannot ship, and the career log's
move from a hardcoded array to src/data/career.json."
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Security model — dev-only route | 7 (implementation + tests) |
| Security model — dev-only write API | 7 |
| Build output unchanged | 3 (HTML diff), 7 (isolation test), 9 |
| Architecture — file layout | 2, 4, 5, 6, 7, 8, 9, 10, 11 |
| Layout — three panes, site tokens | 9 |
| Layout — iframe preview, viewport toggle | 11 |
| Layout — completeness chips | 10 |
| Projects and posts unchanged | 1 |
| Schemas extracted to `schemas.ts` | 1 |
| Career becomes a `file()` collection | 3 |
| Reordering (projects, career, posts excluded) | 5, 11 |
| API surface | 7 |
| Frontmatter round-trip | 2 |
| `generate-checklist.mjs` repointed | 2 |
| Atomic writes | 5, 6 |
| Deletes to `.studio-trash/` | 5 |
| Images via `sharp` | 6 |
| Field widgets | 8, 10 |
| Tests 1–6 from the spec | 2, 10 (1), 4 (2), 5 (3), 1+7 (4), 3 (5), 7 (6) |
| Dependencies promoted | 1 |

No gaps.

**Placeholder scan:** No `TBD`, `TODO`, "implement later", "handle edge cases",
or "similar to Task N". The one `[ FILL ME IN: ... ]` string in Task 3 is
existing site content being transcribed and is annotated as such. Every code
step carries the actual code.

**Type consistency checked:**
- `parseFrontmatter` / `stringifyFrontmatter` — same names in Tasks 2, 4, 5.
- `slugify`, `assertId`, `typeConfig`, `mdPath`, `jsonPath`, `readCareerFile` — defined in Task 4, used in Tasks 5 and 6.
- `listEntries`, `readEntry`, `createEntry`, `writeEntry`, `deleteEntry`, `reorderEntries` — defined in Tasks 4 and 5, called in Task 7.
- `saveImage`, `IMAGE_KINDS`, `MAX_IMAGE_BYTES` — defined in Task 6, used in Task 7.
- `SCHEMAS` — created in Task 1, extended in Task 3, consumed in Tasks 7 and 8.
- `FIELDS`, `blankEntry`, `Field`, `Widget` — defined in Task 8, consumed in Tasks 10 and 11.
- `renderField`, `parseTagInput`, `linksToRows`, `rowsToLinks`, `coerceValue` — defined in Task 10, used there.
- `previewUrlFor`, `moveInList` — defined in Task 11, used there.
- `studioIntegration`, `studioApiPlugin`, `createHandler` — defined in Task 7, used in `astro.config.mjs` and asserted in `tests/studioIsolation.test.ts`.
- DOM ids in Task 9's shell match every `$("...")` lookup in Tasks 10 and 11: `sidebar`, `form-title`, `form-fields`, `form-checklist`, `btn-save`, `btn-discard`, `btn-delete`, `dirty-flag`, `preview-frame`, `preview-desktop`, `preview-mobile`, `toast`.
- `data-preview-home` is set on `<html>` in Task 9 and read as `document.documentElement.dataset.previewHome` in Task 11.
