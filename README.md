# Evan — Pixel Portfolio

Personal game-dev portfolio for Md. Nurusshafi Evan, built as a static
Astro site with a cyberpunk pixel-art aesthetic.

## Local development

```bash
npm install
npm run dev          # opens http://localhost:4321
```

Other commands:

- `npm run build` — production build into `dist/`
- `npm run preview` — preview the production build locally
- `npm run check` — Astro type checking
- `npm test` — run unit tests (Vitest)

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
- Saving rewrites the whole frontmatter block, so inline YAML arrays (`tech: [Unity, "C#"]`) come back as block lists. Same data, larger diff — expected on the first studio save of a file.

## Content authoring guide

All hand-edited content lives under `src/content/` and `src/data/`. None
of these require code changes — frontmatter and typed config drive the
site.

### Projects (Mission Log)

Each project is a single markdown file at
[src/content/projects/](src/content/projects/)`<slug>.md`. The file
**name** becomes the URL slug (e.g. `silent-scream.md` →
`/projects/silent-scream/`).

**To add a new project:**
1. Copy any existing file in [src/content/projects/](src/content/projects/) (e.g. [silent-scream.md](src/content/projects/silent-scream.md)) as a template.
2. Rename it `<your-slug>.md` (lowercase, hyphen-separated).
3. Fill in the frontmatter — the schema in [src/content.config.ts](src/content.config.ts) is authoritative; the build fails loudly if anything is missing or wrong.
4. Drop the hero thumb at `public/images/thumbs/<your-slug>.png` and reference it as `/images/thumbs/<your-slug>.png` in the `thumb:` field.
5. Drop gallery images at `public/images/gallery/<your-slug>/` and list them in the `gallery:` array.
6. Replace the three `[ FILL ME IN ]` sections in the body (Role, Learnings, Behind the Scenes).

**Frontmatter fields:**

| Field | Required | Notes |
|---|---|---|
| `title`, `order`, `year`, `status`, `role`, `duration` | ✓ | `status` is `shipped` \| `in-development` \| `concept`. Lower `order` shows first. |
| `studio` | optional | Set to `null` for personal projects |
| `employmentType` | ✓ | `employee` \| `personal` \| `freelance` |
| `platforms`, `tech` | ✓ | Arrays of strings (used by Mission Log filter chips) |
| `teamSize` | ✓ | A number, or the literal string `"Individual"` |
| `tagline` | ✓ | ≤ 140 chars — shows on the card |
| `thumb` | ✓ | Path beginning with `/images/...` |
| `genres`, `keyInsights`, `gallery`, `links`, `featured`, `snippets` | optional | `links` supports `steam`, `itch`, `github`, `youtube`, `website`. `featured: true` pins the project to the hero card (only one should be featured). |

**To edit an existing project:** open its file in
[src/content/projects/](src/content/projects/) and edit frontmatter or
body directly. After `npm run dev` runs, [CONTENT-CHECKLIST.md](CONTENT-CHECKLIST.md)
at the repo root is regenerated and shows what's still unfilled per
project.

**Code snippets per project:** Add a `snippets:` array in frontmatter.
Each entry has `title`, `language`, `code`, and optional `caption`. See
[src/content.config.ts](src/content.config.ts) for the schema.

### Tech Loadout (Inventory section)

The four columns and their items are defined inline in
[src/components/sections/TechLoadout.astro:5-10](src/components/sections/TechLoadout.astro#L5-L10).
Edit the `cols` array — each entry takes `label`, `icon` (a single
character), `tone` (`magenta` \| `cyan` \| `yellow`), and `items` (array
of strings).

### Now Playing widget

Edit [src/data/now-playing.ts](src/data/now-playing.ts). Update `game`,
`platform`, optional `hours`, optional one-line `status`, and either a
`cover` URL or leave `undefined` for the placeholder. Set
`enabled: false` to hide the widget entirely.

### Availability badge

Edit [src/data/status.ts](src/data/status.ts) — change `current` between
`available`, `open-to-collabs`, `working`, or `away`, and update the
matching `message`.

### Career Log (timeline)

Career entries live in `src/data/career.json`, loaded as a content collection
and validated by `careerSchema` in `src/content/schemas.ts`. Array order is
display order, newest first.

Each entry takes `stamp` (the displayed date, e.g. `2023 — PRESENT`), `title`,
optional `org`, `detail`, `tone` (`magenta` / `cyan` / `yellow`), `kind`
(`role` / `milestone` / `education`), and an optional `icon` for milestones.

Easiest path: the authoring studio. By hand: edit the JSON directly.

### Devlog posts

Each post lives at `src/content/posts/<slug>.md`. Schema in
[src/content.config.ts](src/content.config.ts) under `posts`. Set
`draft: true` to keep a post out of the published listing and RSS feed.

After any content edit, run `npm run dev` to refresh
[CONTENT-CHECKLIST.md](CONTENT-CHECKLIST.md) (auto-generated at the repo
root) and see what is still unfilled per project.

## Stack

- [Astro 5](https://astro.build/) — static site generator
- [Tailwind CSS](https://tailwindcss.com/) — design system
- [GSAP](https://gsap.com/) — Press Start landing animations
- [Vitest](https://vitest.dev/) — utility tests
- Self-hosted fonts: Press Start 2P, VT323, Inter (via `@fontsource`)
- Authoring: dev-only studio at `/studio` (Vite middleware + `yaml` + `sharp`)

## Deploy

Push to `main`. The GitHub Pages workflow at
`.github/workflows/deploy.yml` builds and publishes to GitHub Pages.

For Cloudflare Pages: connect the repo in the Cloudflare dashboard with
build command `npm run build`, output directory `dist`, framework preset
Astro, and `NODE_VERSION=20`.

## Spec & plan

- Spec: [docs/superpowers/specs/2026-05-09-pixel-portfolio-redesign-design.md](docs/superpowers/specs/2026-05-09-pixel-portfolio-redesign-design.md)
- Plan: [docs/superpowers/plans/2026-05-09-pixel-portfolio-redesign.md](docs/superpowers/plans/2026-05-09-pixel-portfolio-redesign.md)
