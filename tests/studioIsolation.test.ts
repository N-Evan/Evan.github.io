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
