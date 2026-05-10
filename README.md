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

## Adding or editing a project

Each project lives at `src/content/projects/<slug>.md`. Add a new file to
add a new project. Required frontmatter is enforced by the schema in
`src/content.config.ts` — the build will fail loudly if a field is missing
or mistyped.

After editing, run `npm run dev` to refresh `CONTENT-CHECKLIST.md` (auto-
generated at the repo root) and see what is still unfilled per project.

## Stack

- [Astro 5](https://astro.build/) — static site generator
- [Tailwind CSS](https://tailwindcss.com/) — design system
- [GSAP](https://gsap.com/) — Press Start landing animations
- [Vitest](https://vitest.dev/) — utility tests
- Self-hosted fonts: Press Start 2P, VT323, Inter (via `@fontsource`)

## Deploy

Push to `main`. The GitHub Pages workflow at
`.github/workflows/deploy.yml` builds and publishes to GitHub Pages.

For Cloudflare Pages: connect the repo in the Cloudflare dashboard with
build command `npm run build`, output directory `dist`, framework preset
Astro, and `NODE_VERSION=20`.

## Spec & plan

- Spec: [docs/superpowers/specs/2026-05-09-pixel-portfolio-redesign-design.md](docs/superpowers/specs/2026-05-09-pixel-portfolio-redesign-design.md)
- Plan: [docs/superpowers/plans/2026-05-09-pixel-portfolio-redesign.md](docs/superpowers/plans/2026-05-09-pixel-portfolio-redesign.md)
