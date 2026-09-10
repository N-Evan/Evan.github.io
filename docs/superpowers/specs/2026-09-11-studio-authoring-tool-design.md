# Studio — Local Authoring Tool

**Date:** 2026-09-11
**Status:** Approved for planning

## Problem

Adding a project, devlog post, or career entry means duplicating an existing
markdown file and hand-editing YAML frontmatter, then guessing whether the
result renders correctly. Career entries are worse: they live in a hardcoded
array inside a component. There is no preview short of running the dev server
and navigating to the page.

## Goal

A local-only authoring UI at `http://localhost:4321/studio` that creates,
edits, reorders, and deletes entries across all three content types, with a
live preview rendered by the real site components, and that is structurally
incapable of shipping to production.

## Non-goals

- No hosted or remote tool, no GitHub token, no auth. The tool never leaves localhost.
- No undo system. `git` is the undo.
- No authoring for the small side panels (`TechLoadout`, `now-playing`, `status`) — flat lists, changed rarely, cheaper to edit by hand.
- No auto-generated form layout from Zod introspection (see "Rejected alternatives").
- No UI framework. Astro page plus vanilla client JS, matching the rest of the site.

## Security model

The threat the tool must not create is a write path reachable by anyone but the
author on their own machine. The design removes it by construction rather than
by configuration:

1. The UI lives in `src/studio/`, **outside** `src/pages/`. Astro's file router
   never discovers it. It is injected at `/studio` by an inline integration
   guarded on `command === "dev"`.
2. The write API is mounted in Vite's `configureServer` hook, which exists only
   in a dev server. There is no production counterpart to disable.

Consequence: `npm run build` produces byte-identical output to today's. A test
asserts that no `studio` artifact appears in `dist/`.

GitHub Pages serves static files with no runtime, so even a hypothetically
shipped UI could not write anything — but "absent" is a better guarantee than
"inert", and here it costs nothing.

## Architecture

```
astro.config.mjs
  |- integration "studio"      astro:config:setup -> if (command === "dev") injectRoute("/studio")
  \- vite.plugins "studio-api" configureServer -> middlewares.use("/__studio", handler)

src/studio/
  index.astro       shell: three-pane layout, imports theme.css
  client.ts         form rendering, dirty tracking, fetches, drag-reorder
  fields.ts         field descriptors per content type (layout only)
  server.mjs        Vite middleware: fs reads/writes, image processing
  frontmatter.mjs   yaml-based parse/stringify, shared with generate-checklist.mjs
  studio.css        studio chrome
```

Dependencies: `yaml` and `zod` promoted from transitive to explicit
`devDependencies` (both already resolve in `node_modules`, so no new download).
`sharp` is already a devDependency.

### Layout

Three panes, styled with the site's own tokens from `src/styles/theme.css`
(`--neon-magenta`, `--neon-cyan`, `--bg-panel`, the pixel and terminal fonts)
so authoring feels continuous with the site.

```
+- STUDIO ------------+--------------------------+-------------------------+
| PROJECTS     [+ NEW]|  AETHERFALL              | [DESKTOP] [MOBILE]      |
|  = aetherfall   2025|  +--------------------+  | +---------------------+ |
|  = silent-scream    |  | title    [        ]|  | |                     | |
|  = high-noon        |  | year     [        ]|  | |  live iframe of     | |
| POSTS        [+ NEW]|  | status   [   v    ]|  | |  /projects/<slug>   | |
|  . welcome-to-...   |  | tech  [Unity][C#]+ |  | |  (real components)  | |
| CAREER       [+ NEW]|  | thumb    [ drop ]  |  | |                     | |
|  = 2025 Unilever    |  +--------------------+  | +---------------------+ |
|  = 2024 Xbox port   |  5/8 checklist           |                         |
+---------------------+--------------------------+-------------------------+
                        [SAVE] [DISCARD] [DELETE]
```

The preview is an `<iframe>` pointed at the running dev server
(`withBase("/projects/" + id)`, `withBase("/devlog/" + id)`, or
`withBase("/#career")`), reloaded after each save. It is not a
reimplementation of the site's cards — it *is* the site, so it cannot drift
from the real design. A desktop/mobile width toggle exercises the responsive
CSS.

Projects additionally show live completeness chips computed by the existing
`evaluateProject` from `src/lib/projectChecklist.ts`.

## Data model changes

### Projects and posts — unchanged

Schemas in `src/content.config.ts` and all existing content files stay as they
are.

The Zod schemas move to a new `src/content/schemas.ts` that imports `z` from
`zod` directly rather than from `astro:content`, so the studio server can load
them with `server.ssrLoadModule()` and validate against the same definitions
the build uses. `content.config.ts` imports from there. Single source of truth
for validation, no behavioural change.

### Career — hardcoded array becomes a `file()` collection

`src/components/sections/CareerLog.astro` currently holds a 70-line `Entry[]`
literal plus local `Entry`, `Tone`, and `Kind` types. These move to
`src/data/career.json`, loaded as a real collection:

```ts
const career = defineCollection({
  loader: file("src/data/career.json"),
  schema: z.object({
    stamp:  z.string(),
    title:  z.string(),
    org:    z.string().optional(),
    detail: z.string(),
    tone:   z.enum(["magenta", "cyan", "yellow"]),
    kind:   z.enum(["role", "milestone", "education"]),
    icon:   z.string().optional(),
  }),
});
```

Array position in the JSON is the display order, so reorder is a splice and
delete is a filter — there is no `order` field to renumber. The component keeps
every line of its CSS and its rendering loop; only `e.body` becomes `e.detail`,
and the data arrives via `getCollection("career")`.

**Verification:** the built HTML for the career section must be identical
before and after the refactor. Diff `dist/index.html` across the change.

### Reordering

- **Projects:** rewrites the `order` frontmatter field across affected files.
- **Career:** array position in `career.json`.
- **Posts:** sorted by `date`, so no reorder UI.

## Write path

### API

All under `/__studio`, JSON in and out, dev-only:

| Method | Path | Purpose |
|---|---|---|
| GET | `/entries` | all three collections: id, title, sort key, checklist |
| POST | `/entry/:type` | create; slug derived from title; 409 if it already exists |
| GET | `/entry/:type/:id` | returns `{ data, body }` |
| PUT | `/entry/:type/:id` | validate, then write |
| DELETE | `/entry/:type/:id` | copy to `.studio-trash/`, then unlink |
| POST | `/reorder/:type` | body `{ ids: [...] }` |
| POST | `/image` | raw bytes plus `?name=&kind=thumb\|gallery\|cover`, returns processed path |

Validation runs server-side against the schemas from `src/content/schemas.ts`;
a rejected write returns field-level errors and touches no file. The client
validates too, for immediate feedback, but the server is the gate — bad
frontmatter breaks the build, so it must never reach disk.

### Frontmatter round-trip

`frontmatter.mjs` wraps `yaml`:

- `parse(src)` returns `{ data, body }`, splitting on the `---` fence.
- `stringify(data, body)` emits keys in field-descriptor order for stable,
  reviewable diffs, uses `lineWidth: 0` to prevent line folding, and uses
  literal block scalars for multi-line strings.

The multi-line `snippets[].code` values are the reason this uses a real YAML
library instead of the hand-rolled parser currently in
`generate-checklist.mjs`. That script is repointed at `frontmatter.mjs`,
deleting its duplicated ~45-line parser and removing the drift hazard of two
parsers disagreeing about quoting.

Writes are atomic: write `<file>.tmp`, then rename. A half-written file would
otherwise crash the dev server mid-edit.

Bodies are preserved verbatim on edit. Only frontmatter is rewritten.

### Deletes

Two-step confirm in the UI. The file is copied to `.studio-trash/`
(gitignored) before unlinking, so a brand-new entry that was never committed
is still recoverable — `git` alone cannot restore an untracked file.

### Images

Dropped or browsed files POST raw bytes to `/image`, which pipes them through
`sharp` (already installed for OG generation), writes to
`public/images/thumbs/` or `public/images/gallery/` under a slugified name
derived from the entry, and returns the site-relative path to fill the field.
Output format and dimensions match the existing files in
`public/images/thumbs/`.

## Field widgets

`fields.ts` declares layout only — roughly 30 lines per content type — because
generating usable forms from Zod introspection requires encoding widget hints
in the schema anyway, which would couple the build's validation to the tool's
UI. Validation stays derived from the schema; layout is hand-authored.

Widgets: `text`, `textarea`, `number`, `select` (enum), `tags` (string array),
`url`, `bool`, `date`, `image` (single drop target), `gallery` (multi),
`repeater` (snippets: title, language, code, caption), and `markdown` (a plain
textarea for the body).

## Testing

Vitest is already configured. Tests cover the pure logic and the one security
property:

1. **Frontmatter round-trip** — parse then stringify preserves the body verbatim; multi-line `snippets[].code` survives; unicode glyphs used by the career timeline survive; key order is stable.
2. **Slugify** — title to filename, and collisions are rejected.
3. **Project reorder** — an `ids[]` list produces the correct `order` values.
4. **Schema validation** — a malformed project is rejected and no file is written.
5. **Career JSON** — read and write preserve array order, and the migrated `career.json` validates against the new schema.
6. **Build isolation** — after `astro build`, `dist/` contains no `studio` route and no `__studio` reference.

Manual verification: the career section HTML is identical before and after the
refactor, and a full create, preview, save, delete cycle works for each
content type.

## Rejected alternatives

| Option | Why not |
|---|---|
| Separate private repo with a GitHub token | Two `package.json` files, schemas drift apart, and it introduces the only real credential in the system. Also loses the real-components preview. |
| Astro API endpoints with `prerender = false` | Static output has no server, so a POST endpoint needs an adapter to build, which means fighting the config to keep it dev-only. Vite middleware sidesteps this. |
| Career as nine markdown files | Nine near-empty bodies, and reorder and delete become multi-file rewrites instead of an array splice. |
| Auto-generated forms from Zod | Widget hints would have to live in the build's schema, coupling validation to UI for no gain at this size. |
| Reimplemented preview cards inside the studio | A second rendering of every card, guaranteed to drift from the real design. |

## Risks

- **`ssrLoadModule` on `src/content/schemas.ts`** — mitigated by having that file import `zod` directly rather than the `astro:content` virtual module, so it is plain TS that Vite resolves without Astro's plugin chain.
- **Career refactor changing rendered output** — mitigated by the pre/post HTML diff.
- **Transitive `yaml` and `zod` versions shifting** — mitigated by promoting both to explicit `devDependencies`.
