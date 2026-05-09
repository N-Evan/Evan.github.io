import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: process.env.SITE ?? "https://evan-portfolio.pages.dev",
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap(),
  ],
  vite: {
    ssr: { noExternal: ["gsap"] },
  },
});
