# Pixel Portfolio Redesign — Design Spec

**Date:** 2026-05-09
**Owner:** Evan
**Status:** Approved for planning

## Goal

Replace the current Bootstrap-based personal portfolio (`Evan.github.io`) with a fully redesigned, cyberpunk pixel-art static site that:

- Looks visually stunning and unmistakably handcrafted
- Showcases 6 game projects today, with content authoring that scales freely up or down
- Provides per-project detail pages aimed at recruiters (insights, gallery, role, learnings, behind-the-scenes)
- Uses CSS/SVG-only "faux pixel art" — no sprite hunting, no custom drawing
- Ships as a static site (no backend)

The existing layout, markup, and styling are not preserved. Old files are removed at cutover.

## Scope

**In scope**
- New static site built with Astro + Tailwind CSS + GSAP
- Single-page scrolling home with a gamified "Press Start" landing
- One detail page per project, generated from markdown content collections
- A reusable pixel-chrome component library (CSS/SVG only)
- Migration of existing project thumbnails and resume PDF
- Cloudflare Pages deployment (with GitHub Pages as fallback)
- Auto-generated `CONTENT-CHECKLIST.md` listing per-project gaps for later fill-in
- Removal of old HTML/CSS/JS files at cutover

**Out of scope**
- Hero/character sprites or any pixel-art image assets (CSS/SVG primitives only)
- Free/paid asset packs from itch.io / OpenGameArt
- Backend services, CMS, analytics, comment systems
- A separate dedicated About Me page (merged into home)
- A dedicated Contact page (merged into home as Comms Channel)
- Translating content; English only
- Migration of `tools.html`, `contact.html`, `convscript.js` (deleted at cutover)

## Vibe Profile

- **Aesthetic:** Cyberpunk pixel — neon magenta + cyan, deep purple/black backgrounds, CRT scanlines, glitch transitions
- **Landing model (Option D):** Press Start menu landing + persistent ambient cyberpunk effects across the rest of the site (scanlines, occasional title flicker, neon hover, parallax grid)
- **Asset strategy:** Pure CSS/SVG-generated pixel chrome; existing project title images reused as the only raster art, displayed with `image-rendering: pixelated` inside pixel frames

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Astro | Content collections give typed markdown for projects; ships near-zero JS by default; ideal for content-driven static sites |
| Styling | Tailwind CSS with custom theme | Design-system discipline, fast iteration, cohesive cyberpunk theme via tokens |
| Animation | GSAP (+ ScrollTrigger) | Polished landing timeline, scroll-triggered effects; CSS keyframes handle ambient/cheap animations |
| Fonts | Press Start 2P, VT323, Inter | Self-hosted from `public/fonts/` for performance; mixed roles avoid pixel-font fatigue |
| Hosting | Cloudflare Pages (primary) / GitHub Pages (fallback) | Free, global CDN, auto-deploy from GitHub; falls back to GH Pages if preferred |
| Source control | Existing GitHub repo `Evan.github.io` | Redesign happens on a `pixel-redesign` branch; merged at cutover |

## Information Architecture

### Home (single-page scroll)
1. **Press Start hero** — full viewport landing gate (Option D)
2. **Operator Profile** — bio reframed as character sheet
3. **Mission Log** — project grid (each card → detail page)
4. **Tech Loadout** — categorized skills/tools
5. **Career Log** — vertical timeline (placeholder entries scaffolded)
6. **Comms Channel** — social links, email, resume download

### Project page (`/projects/<slug>`)
Sections in order: back-link → Hero panel → Details strip → Key Insights → Gallery → Role & Responsibilities → Learnings → Behind the Scenes → Tech Loadout (per project) → Prev/Next nav.

Sections whose source content is empty render as visually intentional `[ FILL ME IN ]` placeholder panels rather than being hidden — they should look styled, not broken, and remain easy to spot during later fill-in.

## Content Model

### Astro content collection: `projects`

Location: `src/content/projects/<slug>.md`

Schema (frontmatter):

```yaml
title: string                      # required
order: number                      # required, used for Mission Log sort
year: number                       # required
status: shipped | in-development | concept   # required
studio: string | null              # null for personal projects
employmentType: employee | personal | freelance  # required
platforms: string[]                # required, ≥1
teamSize: number | "Individual"    # required
duration: string                   # required, free-text ("1 year", "4 months")
role: string                       # required
tagline: string                    # required, ≤140 chars
thumb: string                      # required, public path
genres: string[]                   # optional
tech: string[]                     # required, ≥1
links:                             # all optional
  steam: string
  itch: string
  github: string
  youtube: string
  website: string
keyInsights: string[]              # optional, 0–4 items
gallery: string[]                  # optional list of public paths
```

Markdown body uses level-2 headings to drive the page sections:

```
## Role & Responsibilities
…
## Learnings
…
## Behind the Scenes
…
```

Empty/missing sections render as styled placeholders. Adding a project = drop one new `.md` file. Removing = delete the file. Reordering = change the `order` field.

### Initial seed content (6 projects)
Each markdown file is seeded from the existing `index.html` copy so descriptions are not lost. Existing thumbnails are migrated and renamed:

| File | Existing thumbnail |
|---|---|
| `silent-scream.md` | `Silent_Scream_Title.png` → `silent-scream.png` |
| `high-noon.md` | `HighNoon_Title_Transparent.png` → `high-noon.png` |
| `null-runner.md` | `Null_Runner_Title_v2.png` → `null-runner.png` |
| `aetherfall.md` | `Aetherfall_Title.png` → `aetherfall.png` |
| `vr-football.md` | `VR_Football_Title.png` → `vr-football.png` |
| `abyss-crawler.md` | `Abyss_Crawler_Title.png` → `abyss-crawler.png` |

## Visual System

### Color palette (8 tokens)

```
--bg-void:       #07030f
--bg-deep:       #11062a
--bg-panel:      #1c0d3d
--neon-magenta:  #ff2e88
--neon-cyan:     #00f0ff
--neon-yellow:   #f7d046
--terminal-grn:  #39ff14
--text-soft:     #e8dcff
--text-muted:    #8a7ab5
```

Magenta and cyan are the primary accents. Yellow is rationed (warnings/labels). Terminal green is reserved for the boot sequence and code-style accents only.

### Typography

| Font | Role | Constraints |
|---|---|---|
| Press Start 2P | Headlines, section labels, name, "PRESS START" | Always uppercase; max 1–3 words per usage |
| VT323 | Subheads, taglines, metadata strips, button labels, terminal-style accents | Free use |
| Inter | Long-form body (bio, project descriptions, learnings, BTS) | Free use |

Sizing uses CSS `clamp()` for fluid scaling between mobile and desktop. All three fonts are self-hosted from `public/fonts/` to avoid Google Fonts runtime dependency.

### Pixel chrome library (CSS/SVG primitives)

Reusable components in `src/components/chrome/`. The visual language is composed exclusively from these primitives:

| Primitive | Purpose |
|---|---|
| `PixelFrame` | Chunky stepped-corner border around panels, cards, images. Layered `box-shadow` + clipped pseudo-elements. No raster images. |
| `ScanlineOverlay` | Persistent CRT scanlines across the whole site. Fixed full-viewport `repeating-linear-gradient`, ~6% opacity, slow drift. |
| `CRTVignette` | Subtle dark corners + slight curvature feel. Fixed radial gradient overlay. |
| `DitherBg` | Cyberpunk gradient with dithered grain. SVG noise + 2-stop magenta→void gradient. |
| `GridFloor` | Animated perspective grid (synthwave). CSS-only with `linear-gradient` + transform. |
| `GlitchText` | RGB-split layered text; animates on hover and scroll-into-view. |
| `NeonButton` | Outlined button with magenta/cyan glow + scanline pulse on hover. |
| `TerminalCursor` | Blinking caret after typed text. `::after` pseudo + `steps()` animation. |
| `DataChip` | Small inset pill for tags (platforms, tech). Mono font, dotted border, mini glow. |
| `HoloDivider` | Horizontal section divider. Animated dashed line + flickering bracket caps. |

Every page is composed from these primitives plus the section components in `src/components/sections/` and `src/components/project/`. No bespoke per-page styling.

### Animation language

| Animation type | Driver | Notes |
|---|---|---|
| Boot/landing sequence | GSAP timeline | Plays once per session via sessionStorage flag; skippable via any input |
| Scroll-triggered (section title glitch-in, project card stagger fade+slide, grid floor parallax) | GSAP ScrollTrigger | Disabled when `prefers-reduced-motion: reduce` |
| Idle ambient (scanline drift, occasional 1-frame title flicker, neon hover pulse) | CSS keyframes | Cheap; respects reduced motion |
| Hover (custom pixel cursor, neon edge glow, magenta→cyan gradient sweep on buttons) | CSS only | Works on all pointer devices |

### Reduced motion

When `prefers-reduced-motion: reduce` is set:
- Boot sequence shortens to a single fade-in (no typing animation, no flash)
- All scroll-triggered animations disabled
- Ambient flicker, glitch effects, parallax disabled
- Static cyberpunk aesthetic remains intact (palette, typography, scanline overlay at lower opacity, chrome)

### Responsive breakpoints

| Breakpoint | Layout |
|---|---|
| Mobile (`<640px`) | Project grid 1-col; thinner chrome; full-bleed Press Start menu; reduced font scale via `clamp()`; touch targets ≥44px |
| Tablet (`640–1024px`) | Project grid 2-col; full chrome |
| Desktop (`≥1024px`) | Project grid 3-col; full chrome and ambient effects |

Scanlines and CRT vignette persist across all breakpoints — they define the look.

## Page-Level Designs

### Press Start (landing)

Full viewport. Background: `DitherBg` + `GridFloor`. Foreground sequence (GSAP timeline, ~3.5s total, skippable):

1. Black hold (~200ms)
2. CRT power-on white flash → vignette settle (~400ms)
3. Terminal typing in `--terminal-grn`:
   - `> BOOTING NEURAL LINK…`
   - `> OPERATOR: EVAN [VERIFIED]`
   - `> READY`
4. Name reveal in Press Start 2P magenta with cyan RGB-split glitch that settles into clean text
5. Tagline (VT323): `GAMEPLAY PROGRAMMER · LEVEL DESIGNER · VFX ARTIST`
6. Menu (NeonButtons): `▶ NEW GAME` → scrolls to Mission Log; `◆ PROFILE` → Operator Profile; `◆ COMMS` → Comms Channel; `◆ RESUME.PDF` → opens PDF
7. Blinking `PRESS ANY KEY OR SCROLL TO CONTINUE` prompt at the bottom

Behavior:
- Plays once per session (sessionStorage flag); on repeat visits, fades in directly to the dismissed state
- Any keypress, click, or scroll dismisses early
- After dismissal, the rest of the site is revealed below; ambient scanlines/vignette/title flicker persist
- A small "↻ REPLAY INTRO" link in the Comms Channel footer clears the session flag and re-enters the boot sequence on next load

### Operator Profile (home)

Two-column on desktop, stacked on mobile.
- **Left:** character-sheet panel in PixelFrame — your name, role, location, years of experience, "loadout" DataChips (Unity, C#, etc.)
- **Right:** prose bio in Inter, adapted from the existing About Me page

`HoloDivider` above and below.

### Mission Log (home)

Section title in `GlitchText` Press Start 2P. Grid of project cards driven by the `projects` collection, sorted by `order`. Each card:

- `PixelFrame` containing the project's `thumb` (sharp `image-rendering: pixelated`)
- Title (VT323 large)
- DataChips: `year`, `platforms` (first 2), `status`
- Hover: neon magenta edge glow, scanline shimmer, ~1.02 scale, `▶ ENTER MISSION` label fades in
- Click → `/projects/<slug>`

3-col on desktop, 2-col on tablet, 1-col on mobile.

### Tech Loadout (home)

Skills grouped into rows: **Engines**, **Languages**, **Tools**, **Disciplines**. Each row has a label and a flow of `DataChip` items. Subtle neon hover glow per chip.

### Career Log (home)

Vertical timeline. Each entry is a "log entry" panel (PixelFrame variant) with:
- Timestamp (VT323)
- Title (Press Start 2P small)
- Description (Inter)

Seeded with placeholder entries (Studio-23 trainee → gameplay programmer, undergrad CS, etc.) marked `[ FILL ME IN ]` for later edit.

### Comms Channel (home)

Footer-style section. Big neon section title. Contains:
- Row of social link buttons (rebuilt as inline SVG/CSS — no raster icons): Facebook, GitHub, LinkedIn, DeviantArt, Email
- `[ TRANSMIT MESSAGE ]` NeonButton → `mailto:`
- `[ DOWNLOAD RESUME.PDF ]` NeonButton
- `↻ REPLAY INTRO` link
- Small footer line: "Took quite a few cups of coffee and a lot of Googling."

### Project page template (`/projects/<slug>`)

```
[← BACK TO MISSION LOG]                  [PREV ◀ slug ▶ NEXT]

# PROJECT TITLE                           (massive, GlitchText on load)
> tagline                                  (VT323, terminal-style)

┌─ HERO PANEL ──────────────────────┐
│  Title art in PixelFrame          │
│  year · studio · status DataChips │
└───────────────────────────────────┘

┌─ DETAILS STRIP ───────────────────┐
│ Platforms · Team Size · Duration  │
│ Role · Engine · Tools             │
│ Links: [Steam] [GitHub] [Itch]    │
└───────────────────────────────────┘

## KEY INSIGHTS
  ▸ insight panel 1 (PixelFrame)
  ▸ insight panel 2
  ▸ insight panel 3

## GALLERY
  4–6 PixelFrame slots; missing gallery items render as `[ SCREENSHOT 0n ]` placeholders

## ROLE & RESPONSIBILITIES
  prose (placeholder if empty)

## LEARNINGS
  prose (placeholder if empty)

## BEHIND THE SCENES
  prose with optional callout panels (placeholder if empty)

## TECH LOADOUT (this project)
  DataChips drawn from `tech` frontmatter

[← BACK TO MISSION LOG]                  [PREV ◀ slug ▶ NEXT]
```

Prev/Next navigation cycles through projects sorted by `order`, wrapping at endpoints.

Empty optional sections render as styled `[ FILL ME IN ]` placeholder blocks (intentional, not hidden).

## Content Authoring Workflow

1. Add a project: create `src/content/projects/<slug>.md` with required frontmatter and any markdown body sections. Build regenerates `/projects/<slug>` and includes it in the Mission Log automatically.
2. Edit a project: change frontmatter or markdown body in the `.md` file.
3. Remove a project: delete the `.md` file.
4. Reorder: change the `order` field in frontmatter.
5. Add gallery images: drop files in `public/images/gallery/<slug>/` and reference paths in the `gallery` array.

### CONTENT-CHECKLIST.md

A small Astro/Node script (run during `npm run dev` and `npm run build`) generates `CONTENT-CHECKLIST.md` at the repo root by scanning `src/content/projects/`. For each project, it lists checkboxes for:

- Hero art present
- Tagline filled
- Key insights count (target ≥3)
- Gallery item count (target ≥4)
- Role & Responsibilities section non-empty
- Learnings section non-empty
- Behind the Scenes section non-empty
- All declared `links` resolve (optional fields skipped, but at least one link recommended)

The checklist is committed to the repo so progress is visible in GitHub.

## Deployment

- **Primary:** Cloudflare Pages connected to the GitHub repo. Push to `main` triggers an automatic build (`npm run build`) and edge-CDN deploy. Custom domain configured via Cloudflare DNS if/when desired.
- **Fallback:** GitHub Pages with a stock Astro GitHub Action (`withastro/action`) deploying to the `gh-pages` branch. The repo name `Evan.github.io` already supports user-site hosting.

The redesign branch is set up so either deploy target works without code changes — `astro.config.mjs` reads the `SITE` env var.

## Migration Plan

1. Create branch `pixel-redesign` off `main`. The redesign happens entirely on this branch; `main` stays serving the current site until cutover.
2. Initialize Astro project with Tailwind + GSAP integrations.
3. Migrate raster assets:
   - `image/Thumbs/*` → `public/images/thumbs/<slug>.png` (renamed per the table above)
   - `files/Md. Nurusshafi Evan - Resume.pdf` → `public/files/resume.pdf`
   - Self-host font files into `public/fonts/`
4. Scaffold 6 project markdown files in `src/content/projects/`, seeded from existing `index.html` copy so the prose carries over.
5. Build the chrome component library and section components.
6. Wire the Press Start landing (GSAP timeline, sessionStorage flag) and ambient effects (ScanlineOverlay, CRTVignette, GridFloor).
7. Build home sections and project page template.
8. Add the CONTENT-CHECKLIST.md generator script.
9. Configure Cloudflare Pages (or GH Pages action).
10. At cutover, delete the legacy files: `index.html`, `aboutme.html`, `tools.html`, `contact.html`, `bootstrap.css`, `style.css`, `script.js`, `convscript.js`, `image/58535.jpg` (if unused). Keep `README.md`, `image/Thumbs/`, `files/` until their successors are in `public/`.
11. Merge `pixel-redesign` → `main`.

## Acceptance Criteria

The redesign is complete when:

- All legacy HTML/CSS/JS pages and stylesheets are removed from `main`.
- The home page renders on a fresh load with the Press Start landing, dismisses cleanly on input, and reveals the five home sections below.
- All 6 projects render at `/projects/<slug>` with their migrated thumbnails and seeded copy; missing optional sections render as styled placeholders.
- Adding a new `.md` file to `src/content/projects/` produces a new project page and a new Mission Log card without other code changes.
- `prefers-reduced-motion: reduce` disables all motion-heavy effects while preserving the static aesthetic.
- The site builds successfully and deploys to Cloudflare Pages (or GH Pages fallback).
- `CONTENT-CHECKLIST.md` is generated at build time and reflects the current state of `src/content/projects/`.
- Lighthouse mobile Performance ≥ 90 and Accessibility ≥ 95 on the home page.

## Open Questions / Deferred Decisions

None at design time. Outstanding choices that can be made during implementation without re-spec:

- Exact final wording of the Press Start typing lines
- Whether to add a custom domain to Cloudflare Pages (purely a hosting choice, not a code concern)
