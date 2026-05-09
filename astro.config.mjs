import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: process.env.SITE ?? "https://evan-portfolio.pages.dev",
  integrations: [tailwind({ applyBaseStyles: false })],
  vite: {
    ssr: { noExternal: ["gsap"] },
  },
});
