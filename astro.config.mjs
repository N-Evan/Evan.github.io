import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

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
  ],
  vite: {
    ssr: { noExternal: ["gsap"] },
  },
});
