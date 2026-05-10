# Pixel Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing Bootstrap portfolio with a cyberpunk pixel-art static site (Astro + Tailwind + GSAP), featuring a single-page home with a Press Start landing and per-project detail pages generated from markdown content.

**Architecture:** Astro static site with a typed content collection for projects, Tailwind for the design system, GSAP for landing/scroll animations, and CSS/SVG-only pixel chrome. Project detail pages and Mission Log cards are generated from `src/content/projects/*.md`, so adding/removing projects means adding/removing files. Old HTML/CSS/JS files are removed at cutover.

**Tech Stack:** Astro 5, TypeScript, Tailwind CSS 3 (`@astrojs/tailwind`), GSAP 3 (with ScrollTrigger), `@fontsource` packages for self-hosted fonts (Press Start 2P, VT323, Inter), Vitest for unit tests, Cloudflare Pages (primary hosting) with GitHub Pages fallback action.

**Spec:** [docs/superpowers/specs/2026-05-09-pixel-portfolio-redesign-design.md](../specs/2026-05-09-pixel-portfolio-redesign-design.md)

---

## File structure (target)

```
Evan.github.io/
├── astro.config.mjs              # Astro config + integrations
├── tailwind.config.mjs           # Tailwind theme (colors, fonts, animations)
├── tsconfig.json                 # extends astro/tsconfigs/strict
├── vitest.config.ts              # Vitest config
├── package.json
├── postcss.config.cjs
├── .gitignore
├── public/
│   ├── images/
│   │   ├── thumbs/               # migrated project title images
│   │   └── gallery/              # per-slug subfolders for screenshots
│   └── files/
│       └── resume.pdf            # migrated resume
├── src/
│   ├── content.config.ts         # content collection schema
│   ├── content/
│   │   └── projects/             # 6 seeded project markdown files
│   ├── layouts/
│   │   ├── BaseLayout.astro      # html shell, fonts, ambient overlays
│   │   └── ProjectLayout.astro   # wraps project pages
│   ├── pages/
│   │   ├── index.astro           # home page
│   │   └── projects/[slug].astro # project detail pages
│   ├── components/
│   │   ├── chrome/               # pixel UI primitives (CSS/SVG only)
│   │   ├── sections/             # home page sections
│   │   └── project/              # project page sections
│   ├── lib/
│   │   ├── projectNav.ts         # prev/next utility (TDD)
│   │   └── projectChecklist.ts   # checklist builder (TDD)
│   ├── scripts/
│   │   └── generate-checklist.mjs # invokes checklist builder, writes file
│   ├── styles/
│   │   ├── global.css            # @import order, reset
│   │   ├── theme.css             # CSS custom properties
│   │   └── fonts.css             # @font-face wrappers via @fontsource
│   └── env.d.ts
├── tests/
│   ├── projectNav.test.ts
│   └── projectChecklist.test.ts
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── CONTENT-CHECKLIST.md          # generated at build time
└── README.md                     # updated
```

Files removed at cutover (Task 30):
- `index.html`, `aboutme.html`, `tools.html`, `contact.html`
- `bootstrap.css`, `style.css`, `script.js`, `convscript.js`
- `image/58535.jpg`, `image/icons/`, `image/Thumbs/` (after assets migrated)
- `files/Md. Nurusshafi Evan - Resume.pdf` (after migration)

---

## Phase 1 — Project scaffolding

### Task 1: Scaffold Astro project + base configuration

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `.gitignore` (append, do not overwrite if exists)
- Create: `src/env.d.ts`

- [ ] **Step 1: Initialize package.json**

In the repo root, create `package.json`:

```json
{
  "name": "evan-pixel-portfolio",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "node src/scripts/generate-checklist.mjs && astro dev",
    "build": "node src/scripts/generate-checklist.mjs && astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/check": "^0.9.0",
    "@astrojs/tailwind": "^5.1.0",
    "tailwindcss": "^3.4.0",
    "gsap": "^3.12.5",
    "@fontsource/press-start-2p": "^5.0.0",
    "@fontsource/vt323": "^5.0.0",
    "@fontsource-variable/inter": "^5.0.0",
    "typescript": "^5.5.0"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: dependencies installed without errors. A `node_modules/` folder and `package-lock.json` appear.

- [ ] **Step 3: Create astro.config.mjs**

```js
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: process.env.SITE ?? "https://evan-portfolio.pages.dev",
  integrations: [tailwind({ applyBaseStyles: false })],
  vite: {
    ssr: { noExternal: ["gsap"] },
  },
});
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": [".astro/types.d.ts", "**/*", "src/env.d.ts"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 5: Create src/env.d.ts**

```ts
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
```

- [ ] **Step 6: Append to .gitignore**

If `.gitignore` does not exist, create it. Otherwise append these lines:

```
# Astro
.astro/
dist/

# Node
node_modules/
npm-debug.log*

# Generated
CONTENT-CHECKLIST.md

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
```

- [ ] **Step 7: Verify the build harness boots**

Run: `npm run check`
Expected: passes (zero pages yet, but config is valid). If it complains about missing pages, that's fine for now — we add them shortly.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json src/env.d.ts .gitignore
git commit -m "chore: scaffold astro project with tailwind + gsap deps"
```

---

### Task 2: Tailwind theme + global styles

**Files:**
- Create: `tailwind.config.mjs`
- Create: `postcss.config.cjs`
- Create: `src/styles/theme.css`
- Create: `src/styles/fonts.css`
- Create: `src/styles/global.css`

- [ ] **Step 1: Create tailwind.config.mjs**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        "bg-void":      "#07030f",
        "bg-deep":      "#11062a",
        "bg-panel":     "#1c0d3d",
        "neon-magenta": "#ff2e88",
        "neon-cyan":    "#00f0ff",
        "neon-yellow":  "#f7d046",
        "terminal-grn": "#39ff14",
        "text-soft":    "#e8dcff",
        "text-muted":   "#8a7ab5",
      },
      fontFamily: {
        pixel:    ['"Press Start 2P"', "monospace"],
        terminal: ['"VT323"', "monospace"],
        body:     ['"Inter Variable"', "Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        scanlineDrift: {
          "0%":   { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 6px" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "47%":      { opacity: "1" },
          "48%":      { opacity: "0.4" },
          "49%":      { opacity: "1" },
          "50%":      { opacity: "0.85" },
          "51%":      { opacity: "1" },
        },
        blink: {
          "0%, 49%":   { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        pulseNeon: {
          "0%, 100%": { boxShadow: "0 0 8px var(--glow-color), 0 0 16px var(--glow-color)" },
          "50%":      { boxShadow: "0 0 14px var(--glow-color), 0 0 28px var(--glow-color)" },
        },
        glitchA: {
          "0%, 100%": { transform: "translate(0,0)" },
          "20%":      { transform: "translate(-2px,1px)" },
          "40%":      { transform: "translate(1px,-1px)" },
          "60%":      { transform: "translate(-1px,2px)" },
          "80%":      { transform: "translate(2px,-1px)" },
        },
        glitchB: {
          "0%, 100%": { transform: "translate(0,0)" },
          "20%":      { transform: "translate(2px,-1px)" },
          "40%":      { transform: "translate(-1px,1px)" },
          "60%":      { transform: "translate(1px,-2px)" },
          "80%":      { transform: "translate(-2px,1px)" },
        },
      },
      animation: {
        "scanline-drift": "scanlineDrift 6s linear infinite",
        flicker:          "flicker 7s infinite steps(1)",
        blink:            "blink 1s steps(1) infinite",
        "pulse-neon":     "pulseNeon 2.4s ease-in-out infinite",
        "glitch-a":       "glitchA 1.6s infinite steps(1)",
        "glitch-b":       "glitchB 1.6s infinite steps(1)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Create postcss.config.cjs**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Then run: `npm install -D autoprefixer`
Expected: autoprefixer added to devDependencies.

- [ ] **Step 3: Create src/styles/theme.css**

```css
:root {
  --bg-void:      #07030f;
  --bg-deep:      #11062a;
  --bg-panel:     #1c0d3d;
  --neon-magenta: #ff2e88;
  --neon-cyan:    #00f0ff;
  --neon-yellow:  #f7d046;
  --terminal-grn: #39ff14;
  --text-soft:    #e8dcff;
  --text-muted:   #8a7ab5;

  --frame-thickness: 4px;
  --scanline-opacity: 0.06;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --scanline-opacity: 0.03;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Create src/styles/fonts.css**

```css
@import "@fontsource/press-start-2p/400.css";
@import "@fontsource/vt323/400.css";
@import "@fontsource-variable/inter";
```

- [ ] **Step 5: Create src/styles/global.css**

```css
@import "./fonts.css";
@import "./theme.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body {
    margin: 0;
    background-color: var(--bg-void);
    color: var(--text-soft);
    font-family: theme("fontFamily.body");
    -webkit-font-smoothing: antialiased;
  }
  body {
    min-height: 100dvh;
    overflow-x: hidden;
  }
  ::selection {
    background: var(--neon-magenta);
    color: var(--bg-void);
  }
  img {
    image-rendering: pixelated;
  }
  a {
    color: var(--neon-cyan);
    text-decoration: none;
  }
  a:hover {
    text-shadow: 0 0 8px var(--neon-cyan);
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.mjs postcss.config.cjs src/styles package.json package-lock.json
git commit -m "feat(theme): add cyberpunk theme tokens and global styles"
```

---

### Task 3: Content collection schema (TDD-adjacent)

**Files:**
- Create: `src/content.config.ts`

- [ ] **Step 1: Create src/content.config.ts**

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
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
  }),
});

export const collections = { projects };
```

- [ ] **Step 2: Verify schema compiles**

Run: `npm run check`
Expected: passes. Astro will warn about `src/content/projects/` being empty — that's fine; we seed it in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "feat(content): define typed schema for projects collection"
```

---

## Phase 2 — Asset migration

### Task 4: Migrate raster assets and resume PDF

**Files:**
- Move/copy: existing `image/Thumbs/*` → `public/images/thumbs/`
- Move/copy: `files/Md. Nurusshafi Evan - Resume.pdf` → `public/files/resume.pdf`

Old files are NOT deleted at this step — they're deleted in Task 30 cutover. Copying preserves the working `main` branch until merge.

- [ ] **Step 1: Create destination folders**

In PowerShell:
```powershell
New-Item -ItemType Directory -Force -Path public\images\thumbs, public\images\gallery, public\files | Out-Null
```

- [ ] **Step 2: Copy thumbnails with renamed filenames**

```powershell
Copy-Item "image\Thumbs\Silent_Scream_Title.png"        "public\images\thumbs\silent-scream.png"
Copy-Item "image\Thumbs\HighNoon_Title_Transparent.png" "public\images\thumbs\high-noon.png"
Copy-Item "image\Thumbs\Null_Runner_Title_v2.png"       "public\images\thumbs\null-runner.png"
Copy-Item "image\Thumbs\Aetherfall_Title.png"           "public\images\thumbs\aetherfall.png"
Copy-Item "image\Thumbs\VR_Football_Title.png"          "public\images\thumbs\vr-football.png"
Copy-Item "image\Thumbs\Abyss_Crawler_Title.png"        "public\images\thumbs\abyss-crawler.png"
```

- [ ] **Step 3: Copy resume PDF**

```powershell
Copy-Item "files\Md. Nurusshafi Evan - Resume.pdf" "public\files\resume.pdf"
```

- [ ] **Step 4: Verify all 6 thumbnails + resume exist**

Run (Glob via shell):
```powershell
Get-ChildItem public\images\thumbs, public\files
```
Expected: 6 PNGs in `public/images/thumbs/`, 1 PDF in `public/files/`.

- [ ] **Step 5: Commit**

```bash
git add public/
git commit -m "chore(assets): migrate project thumbnails and resume PDF to public/"
```

---

## Phase 3 — Seed project content

### Task 5: Seed 6 project markdown files

**Files:**
- Create: `src/content/projects/silent-scream.md`
- Create: `src/content/projects/high-noon.md`
- Create: `src/content/projects/null-runner.md`
- Create: `src/content/projects/aetherfall.md`
- Create: `src/content/projects/vr-football.md`
- Create: `src/content/projects/abyss-crawler.md`

Body sections that don't have source content yet are scaffolded as `[ FILL ME IN ]` — they will render as styled placeholders.

- [ ] **Step 1: Create silent-scream.md**

```markdown
---
title: Silent Scream
order: 1
year: 2023
status: shipped
studio: Studio-23
employmentType: employee
platforms: [Windows, XBox]
teamSize: 5
duration: 1 year
role: Gameplay Programmer
tagline: A horror cooking game built with a five-person team at Studio-23.
thumb: /images/thumbs/silent-scream.png
genres: [horror, indie]
tech: [Unity, "C#", Blender]
links:
  steam: https://store.steampowered.com/app/1955750/SILENT_SCREAM/
keyInsights: []
gallery: []
---

## Role & Responsibilities

Collaborated with a team of five while aiding in the development of key
systems of the game. Throughout the development period we also produced
open-source packages for Unity to speed up development. Responsible for
working on the game feel as we ported the game to the XBox platform.

## Learnings

[ FILL ME IN ]

## Behind the Scenes

[ FILL ME IN ]
```

- [ ] **Step 2: Create high-noon.md**

```markdown
---
title: High Noon
order: 2
year: 2023
status: shipped
studio: Studio-23
employmentType: employee
platforms: [Windows]
teamSize: 2
duration: 4 months
role: Gameplay Programmer & UI/UX Owner (PC)
tagline: A real-time PvP dueling game powered by Photon networking.
thumb: /images/thumbs/high-noon.png
genres: [pvp, duel]
tech: [Unity, "C#", Photon, Blender]
links:
  itch: https://brainstation23.itch.io/high-noon
keyInsights: []
gallery: []
---

## Role & Responsibilities

Built a real-time player-versus-player dueling game using Photon Unity
Networking and developed all systems from scratch. Explored design ideas
to make the game more fun and engaging with the support of 3D artists
and designers from the team. Design owner of the UI & UX on the PC platform.

## Learnings

[ FILL ME IN ]

## Behind the Scenes

[ FILL ME IN ]
```

- [ ] **Step 3: Create null-runner.md**

```markdown
---
title: Null Runner
order: 3
year: 2023
status: shipped
studio: null
employmentType: personal
platforms: [Windows, WebGL]
teamSize: Individual
duration: 1 week
role: Solo Developer
tagline: An arcade maze runner built around a unique light-and-dark mechanic.
thumb: /images/thumbs/null-runner.png
genres: [arcade, runner]
tech: [Unity, "C#", Blender]
links:
  itch: https://n0tlucifer.itch.io/retromazemadness
  github: https://github.com/N-Evan/Null-Runner
keyInsights: []
gallery: []
---

## Role & Responsibilities

Created the entire game design and concept following the theme of light
and dark. Handcrafted the maze and the unique mechanic of navigating
through the unknown — using freely available assets and writing all
systems from scratch. Encapsulates my overall knowledge of game design
and development across both the visual and backend sides.

## Learnings

[ FILL ME IN ]

## Behind the Scenes

[ FILL ME IN ]
```

- [ ] **Step 4: Create aetherfall.md**

```markdown
---
title: Aetherfall
order: 4
year: 2024
status: in-development
studio: null
employmentType: personal
platforms: [Windows]
teamSize: Individual
duration: Ongoing
role: Solo Developer
tagline: A solo-scale adventure RPG, an ongoing personal passion project.
thumb: /images/thumbs/aetherfall.png
genres: [rpg, adventure]
tech: [Unity, "C#", Blender, Substance Painter]
links:
  github: https://github.com/N-Evan/Aetherfall
keyInsights: []
gallery: []
---

## Role & Responsibilities

Aetherfall is a personal passion project to develop my own adventure
RPG at a small, realistic scale for a solo developer. There is no end
goal — I plan to keep iterating on it as I write more of the story
and slowly grow it into a complete game. Built in my free time using
free design resources from the internet.

## Learnings

[ FILL ME IN ]

## Behind the Scenes

[ FILL ME IN ]
```

- [ ] **Step 5: Create vr-football.md**

```markdown
---
title: VR Football
order: 5
year: 2022
status: shipped
studio: Studio-23
employmentType: employee
platforms: [Meta Quest 2]
teamSize: 4
duration: 4 months
role: Gameplay Programmer
tagline: A VR penalty-shootout saver game for Meta Quest 2.
thumb: /images/thumbs/vr-football.png
genres: [vr, sports]
tech: [Unity, "C#", Blender]
links:
  youtube: https://youtu.be/KDjOsnUUf_M
keyInsights: []
gallery: []
---

## Role & Responsibilities

Developed a penalty-shootout saver game for Meta Quest 2. The shots
get progressively harder the longer you play. Most of the core systems
were developed by me under the guidance of a senior game developer
and designer. My first VR project.

## Learnings

[ FILL ME IN ]

## Behind the Scenes

[ FILL ME IN ]
```

- [ ] **Step 6: Create abyss-crawler.md**

```markdown
---
title: Abyss Crawler
order: 6
year: 2021
status: shipped
studio: null
employmentType: personal
platforms: [Windows, WebGL]
teamSize: Individual
duration: 1 month
role: Solo Developer
tagline: My first proper game — a 2D platformer that started it all.
thumb: /images/thumbs/abyss-crawler.png
genres: ["2d-platformer"]
tech: [Unity, Adobe Photoshop]
links:
  itch: https://n0tlucifer.itch.io/abyss-crawler
keyInsights: []
gallery: []
---

## Role & Responsibilities

Abyss Crawler is the first proper game I worked on, and I am the sole
owner of its idea and design. It was largely a learning opportunity —
where I got familiar with game development tools and learned best
practices for building complex systems across different game types.

## Learnings

[ FILL ME IN ]

## Behind the Scenes

[ FILL ME IN ]
```

- [ ] **Step 7: Verify content compiles**

Run: `npm run check`
Expected: zero schema validation errors. The strict schema in Task 3 will fail loudly if any required field is missing or mistyped.

- [ ] **Step 8: Commit**

```bash
git add src/content/projects
git commit -m "feat(content): seed six project markdown files from existing copy"
```

---

## Phase 4 — Pixel chrome library

### Task 6: BaseLayout + ambient overlays

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/chrome/ScanlineOverlay.astro`
- Create: `src/components/chrome/CRTVignette.astro`

- [ ] **Step 1: Create ScanlineOverlay.astro**

```astro
---
// src/components/chrome/ScanlineOverlay.astro
// Persistent CRT scanlines across the whole site.
---
<div class="scanlines" aria-hidden="true"></div>

<style>
  .scanlines {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1000;
    background-image: repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, var(--scanline-opacity)) 0,
      rgba(255, 255, 255, var(--scanline-opacity)) 1px,
      transparent 1px,
      transparent 3px
    );
    animation: scanlineDrift 6s linear infinite;
    mix-blend-mode: overlay;
  }
  @keyframes scanlineDrift {
    from { background-position: 0 0; }
    to   { background-position: 0 6px; }
  }
</style>
```

- [ ] **Step 2: Create CRTVignette.astro**

```astro
---
// src/components/chrome/CRTVignette.astro
// Subtle dark corner vignette + CRT curvature feel.
---
<div class="vignette" aria-hidden="true"></div>

<style>
  .vignette {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 999;
    background:
      radial-gradient(
        ellipse at center,
        transparent 55%,
        rgba(7, 3, 15, 0.65) 100%
      );
  }
</style>
```

- [ ] **Step 3: Create BaseLayout.astro**

```astro
---
// src/layouts/BaseLayout.astro
import "../styles/global.css";
import ScanlineOverlay from "../components/chrome/ScanlineOverlay.astro";
import CRTVignette from "../components/chrome/CRTVignette.astro";

interface Props {
  title: string;
  description?: string;
}
const { title, description = "Md. Nurusshafi Evan — gameplay programmer, level designer, VFX artist." } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{title}</title>
  </head>
  <body class="bg-bg-void text-text-soft">
    <slot />
    <ScanlineOverlay />
    <CRTVignette />
  </body>
</html>
```

- [ ] **Step 4: Add a stub home page so dev server boots**

Create `src/pages/index.astro` (will be replaced in Task 13):

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---
<BaseLayout title="Evan — Pixel Portfolio">
  <main class="min-h-dvh grid place-items-center">
    <h1 class="font-pixel text-neon-magenta text-2xl">PORTFOLIO LOADING…</h1>
  </main>
</BaseLayout>
```

- [ ] **Step 5: Boot dev server and verify**

Run: `npm run dev`
Expected: Astro starts at http://localhost:4321. Opening it shows the magenta heading on a near-black background, with subtle scanlines drifting and dark corner vignette. No console errors.

Stop the dev server (Ctrl+C) before continuing.

- [ ] **Step 6: Commit**

```bash
git add src/layouts src/components/chrome src/pages/index.astro
git commit -m "feat(chrome): base layout with persistent scanline + crt vignette"
```

---

### Task 7: PixelFrame component

**Files:**
- Create: `src/components/chrome/PixelFrame.astro`

- [ ] **Step 1: Create PixelFrame.astro**

```astro
---
// src/components/chrome/PixelFrame.astro
// Chunky stepped-corner border around panels, cards, and images.
// CSS-only — no images. Uses layered box-shadow to fake stepped pixel edges.

interface Props {
  tone?: "magenta" | "cyan" | "muted";
  class?: string;
}
const { tone = "magenta", class: extraClass = "" } = Astro.props;

const colorVar =
  tone === "cyan"   ? "var(--neon-cyan)" :
  tone === "muted"  ? "var(--text-muted)" :
                      "var(--neon-magenta)";
---
<div class={`pixel-frame ${extraClass}`} style={`--frame-color: ${colorVar};`}>
  <div class="pixel-frame__inner">
    <slot />
  </div>
</div>

<style>
  .pixel-frame {
    --t: var(--frame-thickness);
    position: relative;
    background: var(--bg-panel);
    /* stepped pixel corners via layered box-shadow inset rings */
    box-shadow:
      0 0 0 var(--t) var(--bg-void),
      0 0 0 calc(var(--t) * 2) var(--frame-color),
      0 0 18px rgba(0, 0, 0, 0.5);
    margin: calc(var(--t) * 2);
  }
  .pixel-frame::before,
  .pixel-frame::after {
    content: "";
    position: absolute;
    width: var(--t);
    height: var(--t);
    background: var(--frame-color);
  }
  .pixel-frame::before { top: calc(var(--t) * -2); left: calc(var(--t) * -2); }
  .pixel-frame::after  { bottom: calc(var(--t) * -2); right: calc(var(--t) * -2); }
  .pixel-frame__inner {
    padding: 1.25rem;
  }
</style>
```

- [ ] **Step 2: Smoke-test by adding to home page**

Temporarily edit `src/pages/index.astro`:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import PixelFrame from "../components/chrome/PixelFrame.astro";
---
<BaseLayout title="Evan — Pixel Portfolio">
  <main class="min-h-dvh grid place-items-center p-8">
    <PixelFrame>
      <p class="font-terminal text-2xl">SYSTEM ONLINE</p>
    </PixelFrame>
  </main>
</BaseLayout>
```

Run: `npm run dev`
Expected: a magenta-bordered panel containing "SYSTEM ONLINE" in VT323 font on the panel background. Confirm visually, then stop server.

- [ ] **Step 3: Commit**

```bash
git add src/components/chrome/PixelFrame.astro src/pages/index.astro
git commit -m "feat(chrome): pixel-stepped frame component"
```

---

### Task 8: GlitchText component

**Files:**
- Create: `src/components/chrome/GlitchText.astro`

- [ ] **Step 1: Create GlitchText.astro**

```astro
---
// src/components/chrome/GlitchText.astro
// RGB-split layered text that animates on hover and (via class) on view.
interface Props {
  text: string;
  as?: "h1" | "h2" | "h3" | "h4" | "span";
  class?: string;
}
const { text, as: Tag = "span", class: extraClass = "" } = Astro.props;
---
<Tag class={`glitch ${extraClass}`} data-text={text}>{text}</Tag>

<style>
  .glitch {
    position: relative;
    color: var(--text-soft);
    display: inline-block;
  }
  .glitch::before,
  .glitch::after {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    pointer-events: none;
    mix-blend-mode: screen;
  }
  .glitch::before { color: var(--neon-magenta); transform: translate(0, 0); }
  .glitch::after  { color: var(--neon-cyan);    transform: translate(0, 0); }

  .glitch:hover::before,
  .glitch.is-glitching::before {
    animation: glitchA 0.8s steps(1) 1;
  }
  .glitch:hover::after,
  .glitch.is-glitching::after {
    animation: glitchB 0.8s steps(1) 1;
  }

  @keyframes glitchA {
    0%, 100% { transform: translate(0,0); }
    20% { transform: translate(-2px, 1px); }
    40% { transform: translate(1px, -1px); }
    60% { transform: translate(-1px, 2px); }
    80% { transform: translate(2px, -1px); }
  }
  @keyframes glitchB {
    0%, 100% { transform: translate(0,0); }
    20% { transform: translate(2px, -1px); }
    40% { transform: translate(-1px, 1px); }
    60% { transform: translate(1px, -2px); }
    80% { transform: translate(-2px, 1px); }
  }
</style>
```

- [ ] **Step 2: Smoke-test on home page**

Temporarily replace `src/pages/index.astro` body:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import GlitchText from "../components/chrome/GlitchText.astro";
---
<BaseLayout title="Evan — Pixel Portfolio">
  <main class="min-h-dvh grid place-items-center">
    <GlitchText as="h1" text="EVAN" class="font-pixel text-6xl" />
  </main>
</BaseLayout>
```

Run: `npm run dev` → confirm hover triggers RGB-split glitch on "EVAN". Stop server.

- [ ] **Step 3: Commit**

```bash
git add src/components/chrome/GlitchText.astro src/pages/index.astro
git commit -m "feat(chrome): glitch-text component with rgb-split hover"
```

---

### Task 9: NeonButton, TerminalCursor, DataChip, HoloDivider

**Files:**
- Create: `src/components/chrome/NeonButton.astro`
- Create: `src/components/chrome/TerminalCursor.astro`
- Create: `src/components/chrome/DataChip.astro`
- Create: `src/components/chrome/HoloDivider.astro`

- [ ] **Step 1: Create NeonButton.astro**

```astro
---
// src/components/chrome/NeonButton.astro
interface Props {
  href?: string;
  tone?: "magenta" | "cyan";
  type?: "button" | "submit";
  class?: string;
}
const { href, tone = "magenta", type = "button", class: extraClass = "" } = Astro.props;
const colorVar = tone === "cyan" ? "var(--neon-cyan)" : "var(--neon-magenta)";
const Tag = href ? "a" : "button";
---
<Tag
  href={href}
  type={!href ? type : undefined}
  class={`neon-btn font-terminal uppercase tracking-wider ${extraClass}`}
  style={`--glow-color: ${colorVar};`}
>
  <slot />
</Tag>

<style>
  .neon-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    color: var(--text-soft);
    background: transparent;
    border: 2px solid var(--glow-color);
    text-shadow: 0 0 6px var(--glow-color);
    box-shadow: 0 0 6px var(--glow-color), inset 0 0 6px rgba(255,255,255,0.05);
    transition: transform 80ms steps(2), box-shadow 200ms ease;
    cursor: pointer;
    font-size: 1.125rem;
    line-height: 1;
  }
  .neon-btn:hover {
    transform: translate(-1px, -1px);
    box-shadow:
      0 0 12px var(--glow-color),
      0 0 24px var(--glow-color),
      inset 0 0 8px rgba(255,255,255,0.08);
  }
  .neon-btn:focus-visible {
    outline: 2px dashed var(--glow-color);
    outline-offset: 4px;
  }
</style>
```

- [ ] **Step 2: Create TerminalCursor.astro**

```astro
---
// src/components/chrome/TerminalCursor.astro
---
<span class="cursor" aria-hidden="true">▮</span>

<style>
  .cursor {
    display: inline-block;
    margin-left: 0.15ch;
    color: var(--terminal-grn);
    animation: blink 1s steps(1) infinite;
  }
  @keyframes blink {
    0%, 49%   { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
</style>
```

- [ ] **Step 3: Create DataChip.astro**

```astro
---
// src/components/chrome/DataChip.astro
interface Props {
  tone?: "default" | "magenta" | "cyan" | "yellow";
  class?: string;
}
const { tone = "default", class: extraClass = "" } = Astro.props;
const color =
  tone === "magenta" ? "var(--neon-magenta)" :
  tone === "cyan"    ? "var(--neon-cyan)"    :
  tone === "yellow"  ? "var(--neon-yellow)"  :
                       "var(--text-muted)";
---
<span class={`chip font-terminal ${extraClass}`} style={`--chip-color: ${color};`}>
  <slot />
</span>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.55rem;
    font-size: 0.95rem;
    line-height: 1.4;
    color: var(--chip-color);
    border: 1px dashed var(--chip-color);
    background: rgba(255, 255, 255, 0.02);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
```

- [ ] **Step 4: Create HoloDivider.astro**

```astro
---
// src/components/chrome/HoloDivider.astro
---
<div class="holo" aria-hidden="true">
  <span class="bracket">[</span>
  <span class="line"></span>
  <span class="bracket">]</span>
</div>

<style>
  .holo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    margin: 2rem 0;
    color: var(--neon-cyan);
  }
  .bracket {
    font-family: theme("fontFamily.terminal");
    font-size: 1.25rem;
    animation: flicker 7s steps(1) infinite;
  }
  .line {
    flex: 1;
    height: 1px;
    background-image: repeating-linear-gradient(
      to right,
      var(--neon-cyan) 0,
      var(--neon-cyan) 6px,
      transparent 6px,
      transparent 12px
    );
  }
  @keyframes flicker {
    0%, 100% { opacity: 1; }
    47%      { opacity: 1; }
    48%      { opacity: 0.4; }
    49%      { opacity: 1; }
    50%      { opacity: 0.85; }
    51%      { opacity: 1; }
  }
</style>
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds, output written to `dist/`. No type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/chrome
git commit -m "feat(chrome): neon button, terminal cursor, data chip, holo divider"
```

---

### Task 10: DitherBg + GridFloor

**Files:**
- Create: `src/components/chrome/DitherBg.astro`
- Create: `src/components/chrome/GridFloor.astro`

- [ ] **Step 1: Create DitherBg.astro**

```astro
---
// src/components/chrome/DitherBg.astro
// Cyberpunk gradient with SVG-noise dither, sits behind hero/landing content.
---
<div class="dither" aria-hidden="true">
  <svg class="dither__noise" xmlns="http://www.w3.org/2000/svg">
    <filter id="dnoise">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.18  0 0 0 0 0.53  0 0 0 0.06 0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#dnoise)"/>
  </svg>
</div>

<style>
  .dither {
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(
        ellipse at top,
        rgba(255, 46, 136, 0.18),
        transparent 60%
      ),
      linear-gradient(
        180deg,
        var(--bg-deep) 0%,
        var(--bg-void) 100%
      );
    overflow: hidden;
  }
  .dither__noise {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.6;
    mix-blend-mode: screen;
  }
</style>
```

- [ ] **Step 2: Create GridFloor.astro**

```astro
---
// src/components/chrome/GridFloor.astro
// Animated synthwave perspective grid below hero content.
---
<div class="floor" aria-hidden="true">
  <div class="floor__plane"></div>
</div>

<style>
  .floor {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 45%;
    perspective: 600px;
    overflow: hidden;
    pointer-events: none;
    z-index: -1;
  }
  .floor__plane {
    position: absolute;
    left: -25%;
    right: -25%;
    bottom: -50%;
    height: 200%;
    transform: rotateX(60deg);
    transform-origin: bottom center;
    background-image:
      linear-gradient(to right, var(--neon-cyan) 1px, transparent 1px),
      linear-gradient(to bottom, var(--neon-cyan) 1px, transparent 1px);
    background-size: 64px 64px;
    opacity: 0.45;
    animation: gridScroll 8s linear infinite;
    mask-image: linear-gradient(to top, black 30%, transparent 90%);
    -webkit-mask-image: linear-gradient(to top, black 30%, transparent 90%);
  }
  @keyframes gridScroll {
    from { background-position: 0 0; }
    to   { background-position: 0 64px; }
  }
</style>
```

- [ ] **Step 3: Smoke test**

Edit `src/pages/index.astro` body:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import DitherBg from "../components/chrome/DitherBg.astro";
import GridFloor from "../components/chrome/GridFloor.astro";
import GlitchText from "../components/chrome/GlitchText.astro";
---
<BaseLayout title="Evan — Pixel Portfolio">
  <main class="relative min-h-dvh grid place-items-center overflow-hidden">
    <DitherBg />
    <GridFloor />
    <GlitchText as="h1" text="EVAN" class="font-pixel text-7xl text-neon-magenta relative" />
  </main>
</BaseLayout>
```

Run `npm run dev`. Expected: name centered over dithered gradient, animated cyan grid floor scrolling at the bottom. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/chrome src/pages/index.astro
git commit -m "feat(chrome): dither-bg and animated synthwave grid-floor"
```

---

## Phase 5 — Project navigation utility (TDD)

### Task 11: projectNav + tests

**Files:**
- Create: `tests/projectNav.test.ts`
- Create: `src/lib/projectNav.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
```

- [ ] **Step 2: Write failing tests in tests/projectNav.test.ts**

```ts
import { describe, it, expect } from "vitest";
import { getPrevNext, sortByOrder } from "@/lib/projectNav";

type Item = { id: string; data: { order: number } };
const make = (id: string, order: number): Item => ({ id, data: { order } });

describe("sortByOrder", () => {
  it("returns items sorted ascending by order", () => {
    const a = make("a", 3), b = make("b", 1), c = make("c", 2);
    expect(sortByOrder([a, b, c]).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input", () => {
    const arr = [make("a", 2), make("b", 1)];
    sortByOrder(arr);
    expect(arr.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("getPrevNext", () => {
  const items = [make("a", 1), make("b", 2), make("c", 3)];

  it("returns the next item with wrap from last → first", () => {
    expect(getPrevNext(items, "c").next?.id).toBe("a");
  });

  it("returns the prev item with wrap from first → last", () => {
    expect(getPrevNext(items, "a").prev?.id).toBe("c");
  });

  it("returns prev/next around middle item", () => {
    const result = getPrevNext(items, "b");
    expect(result.prev?.id).toBe("a");
    expect(result.next?.id).toBe("c");
  });

  it("returns null prev/next when current id is not in list", () => {
    expect(getPrevNext(items, "missing")).toEqual({ prev: null, next: null });
  });

  it("handles a single-item list (prev and next both itself)", () => {
    const single = [make("only", 1)];
    const result = getPrevNext(single, "only");
    expect(result.prev?.id).toBe("only");
    expect(result.next?.id).toBe("only");
  });
});
```

- [ ] **Step 3: Run tests, expect failure**

Run: `npm test`
Expected: tests fail with "Cannot find module '@/lib/projectNav'" or similar.

- [ ] **Step 4: Implement src/lib/projectNav.ts**

```ts
// src/lib/projectNav.ts
// Pure utilities for project ordering and prev/next navigation.

export interface Orderable {
  id: string;
  data: { order: number };
}

export function sortByOrder<T extends Orderable>(items: T[]): T[] {
  return [...items].sort((a, b) => a.data.order - b.data.order);
}

export function getPrevNext<T extends Orderable>(
  items: T[],
  currentId: string
): { prev: T | null; next: T | null } {
  const sorted = sortByOrder(items);
  const idx = sorted.findIndex((x) => x.id === currentId);
  if (idx === -1) return { prev: null, next: null };
  const len = sorted.length;
  const prev = sorted[(idx - 1 + len) % len];
  const next = sorted[(idx + 1) % len];
  return { prev, next };
}
```

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`
Expected: all 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add tests/projectNav.test.ts src/lib/projectNav.ts vitest.config.ts
git commit -m "feat(lib): project ordering and prev/next navigation utility"
```

---

## Phase 6 — Home page sections

### Task 12: index.astro skeleton with anchor sections

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace src/pages/index.astro**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import HoloDivider from "../components/chrome/HoloDivider.astro";
---
<BaseLayout title="Evan — Pixel Portfolio">
  <main class="relative">
    <section id="press-start" class="min-h-dvh"></section>
    <HoloDivider />
    <section id="profile" class="min-h-[60vh] py-20"></section>
    <HoloDivider />
    <section id="missions" class="min-h-[80vh] py-20"></section>
    <HoloDivider />
    <section id="loadout" class="min-h-[40vh] py-20"></section>
    <HoloDivider />
    <section id="career" class="min-h-[40vh] py-20"></section>
    <HoloDivider />
    <section id="comms" class="min-h-[40vh] py-20"></section>
  </main>
</BaseLayout>
```

- [ ] **Step 2: Verify dev server still boots**

Run: `npm run dev` → load http://localhost:4321 → confirm holo dividers visible between empty sections. Stop server.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(home): scaffold home page section anchors"
```

---

### Task 13: Press Start landing section

**Files:**
- Create: `src/components/sections/PressStart.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create PressStart.astro**

```astro
---
// src/components/sections/PressStart.astro
import DitherBg from "../chrome/DitherBg.astro";
import GridFloor from "../chrome/GridFloor.astro";
import GlitchText from "../chrome/GlitchText.astro";
import NeonButton from "../chrome/NeonButton.astro";
import TerminalCursor from "../chrome/TerminalCursor.astro";
---
<section id="press-start" class="press-start relative min-h-dvh overflow-hidden">
  <DitherBg />
  <GridFloor />

  <div class="press-start__inner relative z-10 min-h-dvh grid place-items-center px-6">
    <div class="text-center max-w-4xl">
      <pre class="boot font-terminal text-terminal-grn text-base sm:text-xl whitespace-pre leading-tight">
<span data-line>&gt; BOOTING NEURAL LINK&hellip;</span>
<span data-line>&gt; OPERATOR: EVAN [VERIFIED]</span>
<span data-line>&gt; READY<span class="cursor"><TerminalCursor /></span></span>
      </pre>

      <div class="reveal mt-8 opacity-0">
        <GlitchText
          as="h1"
          text="EVAN"
          class="font-pixel text-5xl sm:text-7xl md:text-8xl text-neon-magenta inline-block"
        />
        <p class="mt-4 font-terminal text-text-soft text-lg sm:text-2xl tracking-wider">
          GAMEPLAY PROGRAMMER &middot; LEVEL DESIGNER &middot; VFX ARTIST
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <NeonButton href="#missions" tone="magenta">▶ NEW GAME</NeonButton>
          <NeonButton href="#profile"  tone="cyan">◆ PROFILE</NeonButton>
          <NeonButton href="#comms"    tone="cyan">◆ COMMS</NeonButton>
          <NeonButton href="/files/resume.pdf" tone="cyan">◆ RESUME.PDF</NeonButton>
        </div>
        <p class="mt-10 font-terminal text-text-muted text-sm animate-blink">
          PRESS ANY KEY OR SCROLL TO CONTINUE
        </p>
      </div>
    </div>
  </div>
</section>

<script>
  import { gsap } from "gsap";

  const KEY = "evan-portfolio:press-start-played";
  const root = document.querySelector<HTMLElement>(".press-start__inner");
  const lines = document.querySelectorAll<HTMLElement>(".boot [data-line]");
  const reveal = document.querySelector<HTMLElement>(".reveal");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!root || !reveal) {
    // section missing, do nothing
  } else if (sessionStorage.getItem(KEY) === "1") {
    // already played this session — reveal end-state immediately
    lines.forEach((l) => (l.style.opacity = "1"));
    reveal.style.opacity = "1";
  } else if (reduced) {
    // reduced motion — single fade-in
    gsap.fromTo([lines, reveal], { opacity: 0 }, { opacity: 1, duration: 0.4 });
    sessionStorage.setItem(KEY, "1");
  } else {
    // full sequence
    lines.forEach((l) => (l.style.opacity = "0"));
    const tl = gsap.timeline({
      defaults: { duration: 0.6, ease: "steps(8)" },
      onComplete: () => sessionStorage.setItem(KEY, "1"),
    });
    tl.set(root, { backgroundColor: "transparent" })
      .to(root, { backgroundColor: "rgba(255,255,255,0.85)", duration: 0.05 })
      .to(root, { backgroundColor: "transparent", duration: 0.25 })
      .to(lines[0], { opacity: 1, duration: 0.2 })
      .to(lines[1], { opacity: 1, duration: 0.2 }, "+=0.25")
      .to(lines[2], { opacity: 1, duration: 0.2 }, "+=0.25")
      .to(reveal, { opacity: 1, y: 0, duration: 0.5 }, "+=0.2");

    // skippable on any input
    const skip = () => {
      tl.progress(1);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("wheel", skip, { passive: true } as AddEventListenerOptions);
    };
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    window.addEventListener("wheel", skip, { passive: true });
  }
</script>

<style>
  .press-start__inner { background: transparent; }
  .boot [data-line]   { display: block; }
</style>
```

- [ ] **Step 2: Wire PressStart into the home page**

Replace `src/pages/index.astro` body:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import HoloDivider from "../components/chrome/HoloDivider.astro";
import PressStart from "../components/sections/PressStart.astro";
---
<BaseLayout title="Evan — Pixel Portfolio">
  <main class="relative">
    <PressStart />
    <HoloDivider />
    <section id="profile" class="min-h-[60vh] py-20"></section>
    <HoloDivider />
    <section id="missions" class="min-h-[80vh] py-20"></section>
    <HoloDivider />
    <section id="loadout" class="min-h-[40vh] py-20"></section>
    <HoloDivider />
    <section id="career" class="min-h-[40vh] py-20"></section>
    <HoloDivider />
    <section id="comms" class="min-h-[40vh] py-20"></section>
  </main>
</BaseLayout>
```

- [ ] **Step 3: Verify behavior**

Run: `npm run dev` and open http://localhost:4321. Verify in DevTools:
1. First load: typing lines fade in sequentially → name + tagline + buttons reveal. CRT flash plays.
2. Reload (same tab): boot sequence skips, end-state shows immediately.
3. Open new private window with `prefers-reduced-motion: reduce` (in DevTools Rendering tab → "Emulate CSS prefers-reduced-motion: reduce") → reload → single fade-in, no flash, no glitch.
4. Click anywhere mid-sequence → boot skips to end.

Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/PressStart.astro src/pages/index.astro
git commit -m "feat(home): press-start landing with boot sequence and skip + reduced-motion"
```

---

### Task 14: Operator Profile section

**Files:**
- Create: `src/components/sections/OperatorProfile.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create OperatorProfile.astro**

```astro
---
// src/components/sections/OperatorProfile.astro
import PixelFrame from "../chrome/PixelFrame.astro";
import DataChip from "../chrome/DataChip.astro";
import GlitchText from "../chrome/GlitchText.astro";
---
<section id="profile" class="profile py-24 px-6 max-w-6xl mx-auto">
  <GlitchText as="h2" text="// OPERATOR PROFILE" class="font-pixel text-neon-cyan text-2xl sm:text-3xl block mb-10" />

  <div class="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-8 items-start">
    <PixelFrame tone="cyan">
      <dl class="font-terminal text-lg space-y-2">
        <div><dt class="inline text-text-muted">CALLSIGN: </dt><dd class="inline">EVAN</dd></div>
        <div><dt class="inline text-text-muted">CLASS: </dt><dd class="inline">GAMEPLAY PROGRAMMER</dd></div>
        <div><dt class="inline text-text-muted">REGION: </dt><dd class="inline">DHAKA, BD</dd></div>
        <div><dt class="inline text-text-muted">XP: </dt><dd class="inline">2+ YEARS</dd></div>
      </dl>
      <div class="mt-4 flex flex-wrap gap-2">
        <DataChip tone="magenta">UNITY</DataChip>
        <DataChip tone="magenta">C#</DataChip>
        <DataChip tone="cyan">BLENDER</DataChip>
        <DataChip tone="cyan">PHOTON</DataChip>
        <DataChip tone="yellow">VFX</DataChip>
      </div>
    </PixelFrame>

    <div class="font-body leading-relaxed space-y-4 text-text-soft">
      <p>
        I'm Evan. I have been playing video games for as long as I can remember,
        which led to me wondering what it would feel like to create such engaging
        experiences for millions of others to enjoy.
      </p>
      <p>
        My first step into game development started during my undergraduate studies
        when I dabbled in Unity Engine and built an old-school text-based
        choose-your-own-adventure game from a small story I had written. From then
        on I followed indie game developers across multiple platforms to keep up
        with the industry.
      </p>
      <p>
        Right before completing my undergraduate degree I was fortunate enough to
        secure a job at Brain Station 23 on the Studio-23 team as a trainee
        gameplay programmer — that kick-started my career and pushed me to pursue
        this craft to its fullest.
      </p>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Replace section stub in index.astro**

In `src/pages/index.astro`, replace the empty `<section id="profile">` line with:

```astro
import OperatorProfile from "../components/sections/OperatorProfile.astro";
```

…in the frontmatter, and replace the `<section id="profile" class="min-h-[60vh] py-20"></section>` line with:

```astro
<OperatorProfile />
```

- [ ] **Step 3: Verify**

Run: `npm run dev` → scroll past Press Start → confirm Operator Profile renders with cyan-toned PixelFrame on the left and prose on the right. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/OperatorProfile.astro src/pages/index.astro
git commit -m "feat(home): operator profile section"
```

---

### Task 15: Mission Log section (project grid)

**Files:**
- Create: `src/components/sections/MissionLog.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create MissionLog.astro**

```astro
---
// src/components/sections/MissionLog.astro
import { getCollection } from "astro:content";
import PixelFrame from "../chrome/PixelFrame.astro";
import DataChip from "../chrome/DataChip.astro";
import GlitchText from "../chrome/GlitchText.astro";
import { sortByOrder } from "../../lib/projectNav";

const projects = sortByOrder(await getCollection("projects"));
---
<section id="missions" class="missions py-24 px-6 max-w-6xl mx-auto">
  <GlitchText as="h2" text="// MISSION LOG" class="font-pixel text-neon-magenta text-2xl sm:text-3xl block mb-10" />

  <ul class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
    {projects.map((p) => (
      <li>
        <a href={`/projects/${p.id}`} class="mission-card group block">
          <PixelFrame tone="magenta">
            <div class="aspect-[2/1] overflow-hidden bg-bg-void grid place-items-center mb-3">
              <img
                src={p.data.thumb}
                alt={`${p.data.title} title art`}
                width="600"
                height="300"
                class="w-full h-full object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
            <h3 class="font-terminal text-2xl text-text-soft leading-tight">{p.data.title}</h3>
            <p class="font-terminal text-text-muted text-base mt-1">{p.data.tagline}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <DataChip>{p.data.year}</DataChip>
              {p.data.platforms.slice(0, 2).map((pl) => <DataChip>{pl}</DataChip>)}
              <DataChip tone={p.data.status === "shipped" ? "cyan" : "yellow"}>
                {p.data.status.toUpperCase()}
              </DataChip>
            </div>
            <span class="enter font-terminal text-neon-magenta mt-3 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
              ▶ ENTER MISSION
            </span>
          </PixelFrame>
        </a>
      </li>
    ))}
  </ul>
</section>

<style>
  .mission-card { transition: transform 200ms ease; }
  .mission-card:hover { transform: translateY(-4px); }
</style>
```

- [ ] **Step 2: Wire into index.astro**

Add `import MissionLog from "../components/sections/MissionLog.astro";` to frontmatter.
Replace `<section id="missions" class="min-h-[80vh] py-20"></section>` with `<MissionLog />`.

- [ ] **Step 3: Verify**

Run: `npm run dev`. Scroll to Mission Log → confirm 6 cards rendered (3 cols on desktop, 2 on tablet, 1 on mobile via DevTools responsive view). Hover a card → "▶ ENTER MISSION" appears. Click → 404 (since project pages don't exist yet — that's expected, fixed in Task 19).

Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/MissionLog.astro src/pages/index.astro
git commit -m "feat(home): mission log project grid driven by content collection"
```

---

### Task 16: Tech Loadout section

**Files:**
- Create: `src/components/sections/TechLoadout.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create TechLoadout.astro**

```astro
---
// src/components/sections/TechLoadout.astro
import DataChip from "../chrome/DataChip.astro";
import GlitchText from "../chrome/GlitchText.astro";

const rows: { label: string; items: string[]; tone: "magenta" | "cyan" | "yellow" }[] = [
  { label: "ENGINES",     items: ["Unity"],                                       tone: "magenta" },
  { label: "LANGUAGES",   items: ["C#", "JavaScript", "TypeScript"],              tone: "cyan" },
  { label: "TOOLS",       items: ["Blender", "Substance Painter", "Photon", "Adobe Photoshop", "Aseprite"], tone: "cyan" },
  { label: "DISCIPLINES", items: ["Gameplay Programming", "Level Design", "VFX", "UI / UX"], tone: "yellow" },
];
---
<section id="loadout" class="loadout py-24 px-6 max-w-6xl mx-auto">
  <GlitchText as="h2" text="// TECH LOADOUT" class="font-pixel text-neon-yellow text-2xl sm:text-3xl block mb-10" />
  <dl class="space-y-6">
    {rows.map((row) => (
      <div class="grid gap-3 md:grid-cols-[160px_1fr] items-start">
        <dt class="font-terminal text-text-muted uppercase tracking-widest">{row.label}</dt>
        <dd class="flex flex-wrap gap-2">
          {row.items.map((it) => <DataChip tone={row.tone}>{it}</DataChip>)}
        </dd>
      </div>
    ))}
  </dl>
</section>
```

- [ ] **Step 2: Wire into index.astro**

Add `import TechLoadout from "../components/sections/TechLoadout.astro";` to frontmatter.
Replace `<section id="loadout" class="min-h-[40vh] py-20"></section>` with `<TechLoadout />`.

- [ ] **Step 3: Verify**

Run: `npm run dev` → scroll to "// TECH LOADOUT" → confirm four labeled rows of chips. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/TechLoadout.astro src/pages/index.astro
git commit -m "feat(home): tech loadout section"
```

---

### Task 17: Career Log section

**Files:**
- Create: `src/components/sections/CareerLog.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create CareerLog.astro**

```astro
---
// src/components/sections/CareerLog.astro
// Vertical timeline. Entries seeded as placeholders for later fill-in.
import PixelFrame from "../chrome/PixelFrame.astro";
import GlitchText from "../chrome/GlitchText.astro";

const entries = [
  { stamp: "2023 – PRESENT", title: "Gameplay Programmer", body: "Studio-23 (Brain Station 23). Shipped Silent Scream and other titles." },
  { stamp: "2022 – 2023",    title: "Trainee Gameplay Programmer", body: "Joined Studio-23 just before completing undergrad. Worked on VR Football and started High Noon." },
  { stamp: "2018 – 2022",    title: "Undergraduate, Computer Science", body: "[ FILL ME IN: school, focus areas, formative projects ]" },
];
---
<section id="career" class="career py-24 px-6 max-w-4xl mx-auto">
  <GlitchText as="h2" text="// CAREER LOG" class="font-pixel text-neon-cyan text-2xl sm:text-3xl block mb-10" />
  <ol class="space-y-6">
    {entries.map((e) => (
      <li>
        <PixelFrame tone="muted">
          <p class="font-terminal text-text-muted text-sm tracking-widest">{e.stamp}</p>
          <h3 class="font-pixel text-neon-magenta text-base sm:text-lg mt-1">{e.title}</h3>
          <p class="font-body text-text-soft mt-2 leading-relaxed">{e.body}</p>
        </PixelFrame>
      </li>
    ))}
  </ol>
</section>
```

- [ ] **Step 2: Wire into index.astro**

Add `import CareerLog from "../components/sections/CareerLog.astro";` to frontmatter.
Replace `<section id="career" class="min-h-[40vh] py-20"></section>` with `<CareerLog />`.

- [ ] **Step 3: Verify**

Run: `npm run dev` → confirm three timeline entries each in their own muted PixelFrame. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/CareerLog.astro src/pages/index.astro
git commit -m "feat(home): career log timeline section"
```

---

### Task 18: Comms Channel section

**Files:**
- Create: `src/components/sections/CommsChannel.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create CommsChannel.astro**

```astro
---
// src/components/sections/CommsChannel.astro
import NeonButton from "../chrome/NeonButton.astro";
import GlitchText from "../chrome/GlitchText.astro";

const socials = [
  { label: "GITHUB",      href: "https://github.com/N-Evan" },
  { label: "LINKEDIN",    href: "https://www.linkedin.com/in/n-evan/" },
  { label: "DEVIANTART",  href: "https://www.deviantart.com/n0tlucifer" },
  { label: "FACEBOOK",    href: "https://www.facebook.com/N0tLucifer/" },
];
---
<section id="comms" class="comms py-24 px-6 max-w-4xl mx-auto text-center">
  <GlitchText as="h2" text="// COMMS CHANNEL" class="font-pixel text-neon-magenta text-2xl sm:text-3xl block mb-10" />

  <div class="flex flex-wrap justify-center gap-3 mb-8">
    {socials.map((s) => (
      <NeonButton href={s.href} tone="cyan">{s.label}</NeonButton>
    ))}
  </div>

  <div class="flex flex-wrap justify-center gap-3 mb-12">
    <NeonButton href="mailto:nurusshafievan@gmail.com" tone="magenta">[ TRANSMIT MESSAGE ]</NeonButton>
    <NeonButton href="/files/resume.pdf" tone="cyan">[ DOWNLOAD RESUME.PDF ]</NeonButton>
  </div>

  <button id="replay-intro" class="font-terminal text-text-muted underline decoration-dotted hover:text-neon-cyan transition-colors">
    ↻ REPLAY INTRO
  </button>

  <p class="font-terminal text-text-muted text-sm mt-12">
    Took quite a few cups of coffee and a lot of Googling.
  </p>
</section>

<script>
  const KEY = "evan-portfolio:press-start-played";
  document.getElementById("replay-intro")?.addEventListener("click", () => {
    sessionStorage.removeItem(KEY);
    window.location.href = "/";
  });
</script>
```

- [ ] **Step 2: Wire into index.astro**

Add `import CommsChannel from "../components/sections/CommsChannel.astro";` to frontmatter.
Replace `<section id="comms" class="min-h-[40vh] py-20"></section>` with `<CommsChannel />`.

- [ ] **Step 3: Verify**

Run: `npm run dev` → scroll to Comms → confirm social buttons, transmit/resume buttons, replay-intro link, footer line. Click "REPLAY INTRO" → page reloads and Press Start plays again. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/CommsChannel.astro src/pages/index.astro
git commit -m "feat(home): comms channel section with replay-intro"
```

---

## Phase 7 — Project detail pages

### Task 19: ProjectLayout + dynamic [slug].astro skeleton

**Files:**
- Create: `src/layouts/ProjectLayout.astro`
- Create: `src/pages/projects/[slug].astro`

- [ ] **Step 1: Create ProjectLayout.astro**

```astro
---
// src/layouts/ProjectLayout.astro
import BaseLayout from "./BaseLayout.astro";
interface Props { title: string; description?: string; }
const { title, description } = Astro.props;
---
<BaseLayout title={`${title} — Evan`} description={description}>
  <main class="relative max-w-5xl mx-auto px-6 py-16">
    <slot />
  </main>
</BaseLayout>
```

- [ ] **Step 2: Create [slug].astro skeleton**

```astro
---
// src/pages/projects/[slug].astro
import { getCollection, render } from "astro:content";
import ProjectLayout from "../../layouts/ProjectLayout.astro";
import { sortByOrder, getPrevNext } from "../../lib/projectNav";

export async function getStaticPaths() {
  const projects = await getCollection("projects");
  return projects.map((entry) => ({
    params: { slug: entry.id },
    props: { entry, all: projects },
  }));
}

const { entry, all } = Astro.props;
const { Content } = await render(entry);
const sorted = sortByOrder(all);
const { prev, next } = getPrevNext(sorted, entry.id);
---
<ProjectLayout title={entry.data.title} description={entry.data.tagline}>
  <a href="/#missions" class="font-terminal text-text-muted hover:text-neon-cyan">← BACK TO MISSION LOG</a>

  <h1 class="font-pixel text-neon-magenta text-3xl sm:text-5xl mt-6 mb-2">{entry.data.title}</h1>
  <p class="font-terminal text-text-muted text-lg sm:text-xl">&gt; {entry.data.tagline}</p>

  <article class="prose-content mt-10">
    <!-- HeroPanel, DetailsStrip, KeyInsights, Gallery added in Tasks 20–21 -->
    <Content />
  </article>

  <nav class="mt-16 flex justify-between font-terminal text-text-muted">
    <a href={prev ? `/projects/${prev.id}` : "#"} class="hover:text-neon-cyan">◀ PREV: {prev?.data.title ?? "—"}</a>
    <a href={next ? `/projects/${next.id}` : "#"} class="hover:text-neon-cyan">NEXT: {next?.data.title ?? "—"} ▶</a>
  </nav>
</ProjectLayout>

<style is:global>
  .prose-content h2 {
    font-family: theme("fontFamily.pixel");
    color: var(--neon-cyan);
    font-size: 1.25rem;
    margin: 2.5rem 0 1rem;
  }
  .prose-content p { margin: 0.75rem 0; line-height: 1.7; }
  .prose-content ul { margin: 0.75rem 0 0.75rem 1.25rem; list-style: square; }
  .prose-content li { margin: 0.25rem 0; }
</style>
```

- [ ] **Step 3: Verify all 6 project pages render**

Run: `npm run dev`. Visit:
- http://localhost:4321/projects/silent-scream
- http://localhost:4321/projects/high-noon
- http://localhost:4321/projects/null-runner
- http://localhost:4321/projects/aetherfall
- http://localhost:4321/projects/vr-football
- http://localhost:4321/projects/abyss-crawler

Each shows the title, tagline, body markdown rendering, and prev/next navigation that wraps correctly. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/ProjectLayout.astro src/pages/projects/
git commit -m "feat(project): dynamic project page skeleton with prev/next nav"
```

---

### Task 20: HeroPanel + DetailsStrip components

**Files:**
- Create: `src/components/project/HeroPanel.astro`
- Create: `src/components/project/DetailsStrip.astro`
- Modify: `src/pages/projects/[slug].astro`

- [ ] **Step 1: Create HeroPanel.astro**

```astro
---
// src/components/project/HeroPanel.astro
import PixelFrame from "../chrome/PixelFrame.astro";
import DataChip from "../chrome/DataChip.astro";

interface Props {
  title: string;
  thumb: string;
  year: number;
  studio: string | null | undefined;
  status: "shipped" | "in-development" | "concept";
}
const { title, thumb, year, studio, status } = Astro.props;
---
<PixelFrame tone="magenta">
  <div class="aspect-[2/1] bg-bg-void grid place-items-center overflow-hidden mb-4">
    <img src={thumb} alt={`${title} title art`} class="w-full h-full object-contain" width="800" height="400" />
  </div>
  <div class="flex flex-wrap gap-2">
    <DataChip>{year}</DataChip>
    {studio && <DataChip tone="cyan">{studio.toUpperCase()}</DataChip>}
    <DataChip tone={status === "shipped" ? "cyan" : "yellow"}>{status.toUpperCase()}</DataChip>
  </div>
</PixelFrame>
```

- [ ] **Step 2: Create DetailsStrip.astro**

```astro
---
// src/components/project/DetailsStrip.astro
import PixelFrame from "../chrome/PixelFrame.astro";
import NeonButton from "../chrome/NeonButton.astro";

interface ProjectLinks {
  steam?: string;
  itch?: string;
  github?: string;
  youtube?: string;
  website?: string;
}
interface Props {
  platforms: string[];
  teamSize: number | "Individual";
  duration: string;
  role: string;
  tech: string[];
  links?: ProjectLinks;
}
const { platforms, teamSize, duration, role, tech, links = {} } = Astro.props;

const linkItems: { label: string; href: string }[] = [];
if (links.steam)   linkItems.push({ label: "STEAM", href: links.steam });
if (links.itch)    linkItems.push({ label: "ITCH.IO", href: links.itch });
if (links.github)  linkItems.push({ label: "GITHUB", href: links.github });
if (links.youtube) linkItems.push({ label: "YOUTUBE", href: links.youtube });
if (links.website) linkItems.push({ label: "WEBSITE", href: links.website });
---
<PixelFrame tone="cyan">
  <dl class="grid sm:grid-cols-2 gap-x-6 gap-y-2 font-terminal text-base">
    <div><dt class="inline text-text-muted">PLATFORMS: </dt><dd class="inline">{platforms.join(", ")}</dd></div>
    <div><dt class="inline text-text-muted">TEAM SIZE: </dt><dd class="inline">{teamSize}</dd></div>
    <div><dt class="inline text-text-muted">DURATION: </dt><dd class="inline">{duration}</dd></div>
    <div><dt class="inline text-text-muted">ROLE: </dt><dd class="inline">{role}</dd></div>
    <div class="sm:col-span-2"><dt class="inline text-text-muted">TECH: </dt><dd class="inline">{tech.join(" · ")}</dd></div>
  </dl>
  {linkItems.length > 0 && (
    <div class="mt-4 flex flex-wrap gap-2">
      {linkItems.map((l) => <NeonButton href={l.href} tone="magenta">{l.label}</NeonButton>)}
    </div>
  )}
</PixelFrame>
```

- [ ] **Step 3: Wire into [slug].astro**

In `src/pages/projects/[slug].astro`, add to frontmatter:

```ts
import HeroPanel from "../../components/project/HeroPanel.astro";
import DetailsStrip from "../../components/project/DetailsStrip.astro";
```

Inside the `<article class="prose-content mt-10">` block, replace `<Content />` with:

```astro
<HeroPanel
  title={entry.data.title}
  thumb={entry.data.thumb}
  year={entry.data.year}
  studio={entry.data.studio ?? null}
  status={entry.data.status}
/>
<DetailsStrip
  platforms={entry.data.platforms}
  teamSize={entry.data.teamSize}
  duration={entry.data.duration}
  role={entry.data.role}
  tech={entry.data.tech}
  links={entry.data.links}
/>
<Content />
```

- [ ] **Step 4: Verify**

Run: `npm run dev` and visit `/projects/silent-scream`. Confirm hero image, year/studio/status chips, details strip with links to Steam button, then markdown body. Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/components/project src/pages/projects/[slug].astro
git commit -m "feat(project): hero panel and details strip"
```

---

### Task 21: KeyInsights + GalleryGrid components

**Files:**
- Create: `src/components/project/KeyInsights.astro`
- Create: `src/components/project/GalleryGrid.astro`
- Modify: `src/pages/projects/[slug].astro`

- [ ] **Step 1: Create KeyInsights.astro**

```astro
---
// src/components/project/KeyInsights.astro
import PixelFrame from "../chrome/PixelFrame.astro";

interface Props { items: string[] }
const { items } = Astro.props;
const list = items.length > 0 ? items : ["[ FILL ME IN: insight 1 ]", "[ FILL ME IN: insight 2 ]", "[ FILL ME IN: insight 3 ]"];
---
<section class="key-insights mt-10">
  <h2 class="font-pixel text-neon-cyan text-xl sm:text-2xl mb-4">// KEY INSIGHTS</h2>
  <ul class="grid gap-4 md:grid-cols-3">
    {list.map((insight) => (
      <li>
        <PixelFrame tone="muted">
          <p class="font-body leading-relaxed text-text-soft">{insight}</p>
        </PixelFrame>
      </li>
    ))}
  </ul>
</section>
```

- [ ] **Step 2: Create GalleryGrid.astro**

```astro
---
// src/components/project/GalleryGrid.astro
import PixelFrame from "../chrome/PixelFrame.astro";

interface Props { images: string[] }
const { images } = Astro.props;
// Always render at least 4 slots so the section feels deliberate.
const slots = images.length > 0 ? images : Array(4).fill(null);
---
<section class="gallery mt-10">
  <h2 class="font-pixel text-neon-cyan text-xl sm:text-2xl mb-4">// GALLERY</h2>
  <ul class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
    {slots.map((src, i) => (
      <li>
        <PixelFrame tone="cyan">
          <div class="aspect-video bg-bg-void grid place-items-center overflow-hidden">
            {src ? (
              <img src={src} alt={`Gallery image ${i + 1}`} class="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span class="font-terminal text-text-muted text-sm">[ SCREENSHOT 0{i + 1} ]</span>
            )}
          </div>
        </PixelFrame>
      </li>
    ))}
  </ul>
</section>
```

- [ ] **Step 3: Wire into [slug].astro**

In frontmatter add:

```ts
import KeyInsights from "../../components/project/KeyInsights.astro";
import GalleryGrid from "../../components/project/GalleryGrid.astro";
```

In the article body, after `<DetailsStrip … />` and before `<Content />`, insert:

```astro
<KeyInsights items={entry.data.keyInsights ?? []} />
<GalleryGrid images={entry.data.gallery ?? []} />
```

- [ ] **Step 4: Verify**

Run: `npm run dev`, visit `/projects/silent-scream`. Confirm Key Insights section with 3 placeholder panels and Gallery section with 4 `[ SCREENSHOT 0n ]` placeholder slots. Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/components/project src/pages/projects/[slug].astro
git commit -m "feat(project): key insights and gallery grid with placeholders"
```

---

### Task 22: Per-project Tech Loadout strip

**Files:**
- Create: `src/components/project/ProjectTechStrip.astro`
- Modify: `src/pages/projects/[slug].astro`

- [ ] **Step 1: Create ProjectTechStrip.astro**

```astro
---
// src/components/project/ProjectTechStrip.astro
import DataChip from "../chrome/DataChip.astro";

interface Props { items: string[] }
const { items } = Astro.props;
---
<section class="proj-tech mt-10">
  <h2 class="font-pixel text-neon-cyan text-xl sm:text-2xl mb-4">// TECH LOADOUT</h2>
  <div class="flex flex-wrap gap-2">
    {items.map((it) => <DataChip tone="cyan">{it}</DataChip>)}
  </div>
</section>
```

- [ ] **Step 2: Wire into [slug].astro**

In frontmatter add:

```ts
import ProjectTechStrip from "../../components/project/ProjectTechStrip.astro";
```

After `<Content />` in the article body, insert:

```astro
<ProjectTechStrip items={entry.data.tech} />
```

- [ ] **Step 3: Verify**

Run: `npm run dev` → visit any project page → confirm a tech-chip strip appears below the markdown body. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/project/ProjectTechStrip.astro src/pages/projects/[slug].astro
git commit -m "feat(project): per-project tech loadout strip"
```

---

## Phase 8 — Content checklist generator

### Task 23: projectChecklist library + tests (TDD)

**Files:**
- Create: `tests/projectChecklist.test.ts`
- Create: `src/lib/projectChecklist.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/projectChecklist.test.ts
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
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test`
Expected: `Cannot find module '@/lib/projectChecklist'`.

- [ ] **Step 3: Implement src/lib/projectChecklist.ts**

```ts
// src/lib/projectChecklist.ts
// Evaluates a project's content completeness and renders a markdown checklist.

export interface RawProject {
  id: string;
  data: {
    title: string;
    tagline?: string;
    thumb?: string;
    keyInsights?: string[];
    gallery?: string[];
    links?: Record<string, string | undefined>;
  };
  body: string;
}

export interface Checks {
  heroArt: boolean;
  tagline: boolean;
  keyInsightsAtLeast3: boolean;
  galleryAtLeast4: boolean;
  roleSection: boolean;
  learningsSection: boolean;
  btsSection: boolean;
  atLeastOneLink: boolean;
}

export interface ProjectEvaluation {
  id: string;
  title: string;
  checks: Checks;
}

const HEADING_RE = (h: string) => new RegExp(`^##\\s+${h}\\s*$`, "im");
const PLACEHOLDER_RE = /\[\s*FILL ME IN[^\]]*\]/i;

function sectionFilled(body: string, heading: string): boolean {
  const re = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "i");
  const m = body.match(re);
  if (!m) return false;
  const content = m[1].trim();
  if (content.length === 0) return false;
  if (PLACEHOLDER_RE.test(content) && content.replace(PLACEHOLDER_RE, "").trim().length === 0) {
    return false;
  }
  return true;
}

export function evaluateProject(p: RawProject): ProjectEvaluation {
  const links = p.data.links ?? {};
  return {
    id: p.id,
    title: p.data.title,
    checks: {
      heroArt: typeof p.data.thumb === "string" && p.data.thumb.length > 0,
      tagline: typeof p.data.tagline === "string" && p.data.tagline.trim().length > 0,
      keyInsightsAtLeast3: (p.data.keyInsights?.length ?? 0) >= 3,
      galleryAtLeast4: (p.data.gallery?.length ?? 0) >= 4,
      roleSection: sectionFilled(p.body, "Role & Responsibilities"),
      learningsSection: sectionFilled(p.body, "Learnings"),
      btsSection: sectionFilled(p.body, "Behind the Scenes"),
      atLeastOneLink: Object.values(links).some((v) => typeof v === "string" && v.length > 0),
    },
  };
}

const LABELS: Array<{ key: keyof Checks; label: string }> = [
  { key: "heroArt",             label: "Hero art present" },
  { key: "tagline",             label: "Tagline filled" },
  { key: "keyInsightsAtLeast3", label: "Key insights ≥ 3" },
  { key: "galleryAtLeast4",     label: "Gallery items ≥ 4" },
  { key: "roleSection",         label: "Role & Responsibilities filled" },
  { key: "learningsSection",    label: "Learnings filled" },
  { key: "btsSection",          label: "Behind the Scenes filled" },
  { key: "atLeastOneLink",      label: "At least one external link" },
];

export function renderChecklist(projects: RawProject[]): string {
  const lines: string[] = [
    "# Content Checklist",
    "",
    "_Auto-generated. Run `npm run dev` or `npm run build` to refresh._",
    "",
  ];
  for (const p of projects) {
    const ev = evaluateProject(p);
    lines.push(`## ${ev.title}`);
    lines.push("");
    for (const { key, label } of LABELS) {
      const mark = ev.checks[key] ? "x" : " ";
      lines.push(`- [${mark}] ${label}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npm test`
Expected: all tests pass (existing projectNav tests + new projectChecklist tests).

- [ ] **Step 5: Commit**

```bash
git add tests/projectChecklist.test.ts src/lib/projectChecklist.ts
git commit -m "feat(lib): project content checklist evaluator"
```

---

### Task 24: generate-checklist.mjs script

**Files:**
- Create: `src/scripts/generate-checklist.mjs`

- [ ] **Step 1: Create script**

```js
// src/scripts/generate-checklist.mjs
// Reads src/content/projects/*.md, evaluates content completeness,
// writes CONTENT-CHECKLIST.md at the repo root. Invoked from npm scripts.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PROJECTS_DIR = join(ROOT, "src/content/projects");
const OUT = join(ROOT, "CONTENT-CHECKLIST.md");

function parseFrontmatter(src) {
  const match = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: src };
  const yaml = match[1];
  const body = match[2];
  // Minimal YAML: only what we need. Full parsing isn't worth a dep.
  const data = {};
  const arrays = ["keyInsights", "gallery", "platforms", "tech", "genres"];
  let currentArrayKey = null;
  for (const rawLine of yaml.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim()) continue;
    if (currentArrayKey && /^\s+-\s/.test(line)) {
      data[currentArrayKey].push(line.replace(/^\s+-\s/, "").trim().replace(/^["']|["']$/g, ""));
      continue;
    }
    currentArrayKey = null;
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, rest] = m;
    if (rest === "" && arrays.includes(key)) {
      data[key] = [];
      currentArrayKey = key;
      continue;
    }
    if (rest.startsWith("[")) {
      // inline array
      const inner = rest.replace(/^\[|\]$/g, "").trim();
      data[key] = inner.length === 0 ? [] : inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
      continue;
    }
    if (key === "links") {
      data.links = {};
      continue;
    }
    data[key] = rest.replace(/^["']|["']$/g, "");
  }
  return { data, body };
}

async function main() {
  let files = [];
  try {
    files = (await readdir(PROJECTS_DIR)).filter((f) => f.endsWith(".md"));
  } catch (e) {
    if (e.code === "ENOENT") {
      await writeFile(OUT, "# Content Checklist\n\n_No projects found._\n");
      return;
    }
    throw e;
  }

  const projects = [];
  for (const f of files) {
    const src = await readFile(join(PROJECTS_DIR, f), "utf8");
    const { data, body } = parseFrontmatter(src);
    projects.push({ id: basename(f, ".md"), data, body });
  }
  projects.sort((a, b) => Number(a.data.order ?? 0) - Number(b.data.order ?? 0));

  // Re-implement the evaluator in plain JS so this script has zero TS dependency.
  const PLACEHOLDER_RE = /\[\s*FILL ME IN[^\]]*\]/i;
  const sectionFilled = (body, heading) => {
    const re = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "i");
    const m = body.match(re);
    if (!m) return false;
    const content = m[1].trim();
    if (!content) return false;
    if (PLACEHOLDER_RE.test(content) && content.replace(PLACEHOLDER_RE, "").trim().length === 0) return false;
    return true;
  };
  const evalP = (p) => ({
    title: p.data.title || p.id,
    checks: {
      "Hero art present":              !!p.data.thumb,
      "Tagline filled":                !!(p.data.tagline && String(p.data.tagline).trim()),
      "Key insights ≥ 3":              (p.data.keyInsights?.length ?? 0) >= 3,
      "Gallery items ≥ 4":             (p.data.gallery?.length ?? 0) >= 4,
      "Role & Responsibilities filled": sectionFilled(p.body, "Role & Responsibilities"),
      "Learnings filled":              sectionFilled(p.body, "Learnings"),
      "Behind the Scenes filled":      sectionFilled(p.body, "Behind the Scenes"),
      "At least one external link":    !!(p.data.links && Object.values(p.data.links).some((v) => typeof v === "string" && v.length > 0)),
    },
  });

  const lines = [
    "# Content Checklist",
    "",
    "_Auto-generated by `src/scripts/generate-checklist.mjs`. Do not edit by hand._",
    "",
  ];
  for (const p of projects) {
    const ev = evalP(p);
    lines.push(`## ${ev.title}`);
    lines.push("");
    for (const [label, ok] of Object.entries(ev.checks)) {
      lines.push(`- [${ok ? "x" : " "}] ${label}`);
    }
    lines.push("");
  }
  await writeFile(OUT, lines.join("\n"), "utf8");
  console.log(`✓ Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

(Note: this script implements its own minimal frontmatter parse + evaluator instead of importing `src/lib/projectChecklist.ts`. The `npm run dev` and `npm run build` scripts already invoke this before Astro starts, so it stays runtime-light. The TS evaluator + tests in Task 23 are the canonical reference; this script mirrors their behavior.)

- [ ] **Step 2: Run script and verify output**

Run: `node src/scripts/generate-checklist.mjs`
Expected:
- Console prints `✓ Wrote …/CONTENT-CHECKLIST.md`.
- A file `CONTENT-CHECKLIST.md` appears at the repo root with one section per project, each listing the 8 checkboxes. With seeded content from Task 5: most items unchecked except "Hero art present", "Tagline filled", "Role & Responsibilities filled", and "At least one external link" (which depend per project).

- [ ] **Step 3: Verify dev/build hooks invoke the script**

Run: `npm run build`
Expected: console shows `✓ Wrote …/CONTENT-CHECKLIST.md` BEFORE Astro builds. Astro completes the build successfully.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/generate-checklist.mjs
git commit -m "feat(checklist): generate per-project content checklist on dev/build"
```

(`CONTENT-CHECKLIST.md` is gitignored per Task 1; the script is the only thing committed. The checklist regenerates on every build.)

---

## Phase 9 — Responsiveness, motion, and polish

### Task 25: Responsive sweep + reduced-motion verification

**Files:**
- (Verification only — fix as needed in existing files)

- [ ] **Step 1: Boot dev server**

Run: `npm run dev`

- [ ] **Step 2: Test mobile viewport (375px wide)**

In Chrome DevTools, set device to iPhone SE (375 × 667). Reload `/`.

Expected:
- Press Start menu buttons wrap and remain tappable (each ≥44px tall).
- Mission Log shows 1 column.
- Operator Profile stacks vertically.
- Scanlines visible but not overpowering.
- Footer Comms section social buttons wrap to multiple rows.

If any text overflows or a button is too small, fix the offending component's responsive Tailwind classes and re-verify.

- [ ] **Step 3: Test tablet viewport (768px wide)**

Set device to iPad Mini (768 × 1024). Reload `/`.

Expected:
- Mission Log = 2 columns.
- Tech Loadout rows still readable.

- [ ] **Step 4: Test desktop viewport (1280+ wide)**

Set device to Desktop (1440 × 900). Reload `/`.

Expected:
- Mission Log = 3 columns.
- All ambient effects active.

- [ ] **Step 5: Test reduced motion**

In DevTools → Rendering tab, toggle "Emulate CSS prefers-reduced-motion: reduce". Reload `/`.

Expected:
- Press Start: single fade-in, no typing animation, no flash.
- No flicker animations on dividers/text.
- No grid floor scroll animation.
- Static aesthetic preserved (palette, scanlines at lower opacity, fonts, frames).

- [ ] **Step 6: Test project pages on each viewport**

Visit `/projects/silent-scream` at mobile / tablet / desktop. Verify hero, details strip, key insights, gallery placeholders, body, tech strip, prev/next nav all render cleanly at every breakpoint.

- [ ] **Step 7: Run a Lighthouse audit on home page (mobile)**

In DevTools → Lighthouse tab → Mode: Navigation, Device: Mobile, Categories: Performance + Accessibility. Run audit on `http://localhost:4321/`.

Expected (per spec acceptance criteria):
- Performance ≥ 90
- Accessibility ≥ 95

If either falls short, identify the failing audit (image size, contrast, missing alt text, layout shift) and fix it. Common likely fixes:
- Add explicit `width`/`height` on remaining images
- Increase low-contrast text-muted color usage
- Lazy-load gallery placeholder DOM

Stop server after audits pass.

- [ ] **Step 8: Commit any responsive/motion fixes**

```bash
git status
# stage any files you modified during the sweep, then:
git commit -m "fix(responsive): tune mobile breakpoints and reduced-motion behavior"
```

If no fixes were needed, skip the commit and proceed to Task 26.

---

### Task 26: README update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README.md content**

```markdown
# Evan — Pixel Portfolio

Personal game-dev portfolio for Md. Nurusshafi Evan, built as a static
Astro site with a cyberpunk pixel-art aesthetic.

## Live

Deployed via Cloudflare Pages on push to `main`.

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

## Adding or editing a project

Each project lives at `src/content/projects/<slug>.md`. Add a new file
to add a new project. Required frontmatter is enforced by the schema in
`src/content.config.ts` — the build will fail loudly if a field is
missing or mistyped.

After editing, run `npm run dev` to refresh `CONTENT-CHECKLIST.md` and
see what is still unfilled per project.

## Stack

- [Astro 5](https://astro.build/) — static site generator
- [Tailwind CSS](https://tailwindcss.com/) — design system
- [GSAP](https://gsap.com/) — landing animations
- [Vitest](https://vitest.dev/) — utility tests
- Self-hosted fonts: Press Start 2P, VT323, Inter (via `@fontsource`)

## Spec & plan

- Spec: [docs/superpowers/specs/2026-05-09-pixel-portfolio-redesign-design.md](docs/superpowers/specs/2026-05-09-pixel-portfolio-redesign-design.md)
- Plan: [docs/superpowers/plans/2026-05-09-pixel-portfolio-redesign.md](docs/superpowers/plans/2026-05-09-pixel-portfolio-redesign.md)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for the pixel portfolio rebuild"
```

---

## Phase 10 — Deployment

### Task 27: GitHub Pages fallback workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

This workflow is the GH Pages fallback. Cloudflare Pages (Task 28) is the primary; both can coexist without conflict.

- [ ] **Step 1: Create the workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install, build, and upload
        uses: withastro/action@v3

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit (do not push yet — Task 30 controls cutover)**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add github pages fallback deploy workflow"
```

---

### Task 28: Cloudflare Pages setup (manual, dashboard-driven)

This task does not modify code — it's a configuration checklist for the user to perform once the redesign branch merges to `main`.

- [ ] **Step 1: Sign in to Cloudflare and create a Pages project**

1. Go to https://dash.cloudflare.com/ → Workers & Pages → Create → Pages → Connect to Git.
2. Authorize the GitHub `Evan.github.io` repository.
3. Select the repository and branch `main`.

- [ ] **Step 2: Configure build settings**

| Field | Value |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (leave blank) |
| Node version (env var `NODE_VERSION`) | `20` |
| Environment variable `SITE` | `https://<your-project>.pages.dev` (set to your final domain after first deploy) |

- [ ] **Step 3: Trigger and verify the first build**

Click "Save and Deploy". Wait for the build. Verify:
- Build log shows `node src/scripts/generate-checklist.mjs` completed before `astro build`.
- Final URL loads with the Press Start landing intact.
- Each `/projects/<slug>` URL loads the corresponding detail page.

- [ ] **Step 4: (Optional) Configure custom domain**

If a custom domain is desired, follow Cloudflare Pages → Custom Domains → Add. Confirm DNS propagation, then update `SITE` env var and the `site` field in `astro.config.mjs` to match.

This task creates no commits — it's external configuration.

---

## Phase 11 — Cutover

### Task 29: Final smoke test before cutover

- [ ] **Step 1: Run the full check suite**

```bash
npm run check
npm test
npm run build
```

Expected: each command exits with status 0. The build produces a clean `dist/` directory with `index.html`, six pages under `dist/projects/<slug>/`, and asset bundles.

- [ ] **Step 2: Locally preview the production build**

Run: `npm run preview`
Expected: production build loads at the previewed URL with all behaviors verified through Tasks 13, 19, 25.

Stop preview server.

If any failures, fix in their owning task's files and re-run Step 1.

---

### Task 30: Delete legacy files and merge to main

**Files removed:**
- `index.html`
- `aboutme.html`
- `tools.html`
- `contact.html`
- `bootstrap.css`
- `style.css`
- `script.js`
- `convscript.js`
- `image/58535.jpg`
- `image/Thumbs/` (entire directory; thumbnails now in `public/images/thumbs/`)
- `image/icons/` (entire directory; icons replaced by SVG/CSS in chrome library)
- `files/Md. Nurusshafi Evan - Resume.pdf` (now at `public/files/resume.pdf`)
- `image/` (the now-empty parent directory)
- `files/` (the now-empty parent directory)

- [ ] **Step 1: Remove legacy files**

```bash
git rm index.html aboutme.html tools.html contact.html
git rm bootstrap.css style.css script.js convscript.js
git rm image/58535.jpg
git rm -r image/Thumbs image/icons
git rm "files/Md. Nurusshafi Evan - Resume.pdf"
```

If `image/` or `files/` still appear after the above, remove them too:

```bash
# Only run if these directories still exist as untracked or empty
rmdir image 2>/dev/null
rmdir files 2>/dev/null
```

- [ ] **Step 2: Confirm no references to deleted files remain**

Use Grep to scan for any string referencing the deleted files:

Run a search for these patterns and confirm zero hits in `src/`, `public/`, and `docs/`:

```
bootstrap.css
style.css
script.js
convscript.js
icons8-
58535.jpg
image/Thumbs
files/Md. Nurusshafi Evan - Resume.pdf
aboutme.html
tools.html
contact.html
```

If any hits appear, update those references to the new paths (`/files/resume.pdf`, `/images/thumbs/<slug>.png`, etc.) before continuing.

- [ ] **Step 3: Final build sanity check**

Run: `npm run build`
Expected: build succeeds. No 404s referenced from the build output.

- [ ] **Step 4: Commit the cutover**

```bash
git add -A
git commit -m "chore: remove legacy bootstrap portfolio files at cutover"
```

- [ ] **Step 5: Push the redesign branch and merge to main**

```bash
git push -u origin HEAD
```

Then on GitHub: open a pull request from this branch into `main`, review the diff, and merge. Cloudflare Pages auto-deploys on merge (per Task 28).

After deploy, verify the live site loads with the Press Start landing and all 6 project pages reachable.

- [ ] **Step 6: Mark plan complete**

Plan complete. Ongoing work (filling in `[ FILL ME IN ]` placeholders, gallery uploads, real BTS notes) is content authoring per the README and `CONTENT-CHECKLIST.md` — not part of this plan.

---

## Self-review notes

**Spec coverage check:**
- Astro/Tailwind/GSAP/Cloudflare/GH Pages — Tasks 1, 2, 27, 28 ✓
- Content collection schema — Task 3 ✓
- 6 seeded project markdown files — Task 5 ✓
- Asset migration (thumbs + resume) — Task 4 ✓
- All 10 chrome primitives (PixelFrame, ScanlineOverlay, CRTVignette, DitherBg, GridFloor, GlitchText, NeonButton, TerminalCursor, DataChip, HoloDivider) — Tasks 6–10 ✓
- BaseLayout + ProjectLayout — Tasks 6, 19 ✓
- Press Start with sessionStorage gate, skip, reduced-motion — Task 13 ✓
- Operator Profile / Mission Log / Tech Loadout / Career Log / Comms Channel — Tasks 14–18 ✓
- Project page (Hero / Details / KeyInsights / Gallery / body / per-project tech / prev-next) — Tasks 19–22 ✓
- Project nav prev/next utility (TDD) — Task 11 ✓
- CONTENT-CHECKLIST.md generator (TDD utility + script) — Tasks 23–24 ✓
- Responsive + reduced-motion + Lighthouse — Task 25 ✓
- README rewrite — Task 26 ✓
- Legacy cutover — Task 30 ✓

**Type/name consistency:** `sortByOrder` and `getPrevNext` used in MissionLog (Task 15) and [slug].astro (Task 19) match definitions in Task 11. `evaluateProject` and `renderChecklist` are tested in Task 23; the script in Task 24 reimplements the same eight check labels in plain JS to avoid TS runtime dependency, with the spec body comment noting this. Chrome component prop names (`tone`, `text`, `as`, `class`) are consistent across usages.

**Placeholder scan:** Each `[ FILL ME IN ]` in the seeded markdown is intentional and called out as part of the content-authoring workflow. No "TBD" or "implement later" steps remain in the plan itself.
