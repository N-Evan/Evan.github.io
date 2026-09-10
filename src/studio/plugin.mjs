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
