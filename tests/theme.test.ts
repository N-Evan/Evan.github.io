import { describe, it, expect } from "vitest";
import { resolveTheme, nextTheme, themeColor, applyTheme } from "@/lib/theme";

describe("resolveTheme", () => {
  it("defaults to dark for anything that isn't the string 'light'", () => {
    // The important case: a bad stored value must never yield light, or a
    // visitor with corrupt localStorage gets a full-page white flash.
    for (const bad of [null, undefined, "", "Light", "LIGHT", "dark", "true", "{}", "nonsense"]) {
      expect(resolveTheme(bad)).toBe("dark");
    }
  });

  it("returns light only for an exact 'light'", () => {
    expect(resolveTheme("light")).toBe("light");
  });
});

describe("nextTheme", () => {
  it("round-trips", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme(nextTheme("dark"))).toBe("dark");
  });
});

describe("themeColor", () => {
  it("matches the surface each theme actually paints", () => {
    expect(themeColor("dark")).toBe("#07030f");
    expect(themeColor("light")).toBe("#ece6d8");
  });
});

describe("applyTheme", () => {
  // Dark is the absence of the attribute, so the no-JS / no-storage path
  // renders correctly with nothing set.
  const fakeRoot = () => {
    const attrs = new Map<string, string>();
    return {
      setAttribute: (k: string, v: string) => void attrs.set(k, v),
      removeAttribute: (k: string) => void attrs.delete(k),
      get: (k: string) => attrs.get(k),
    };
  };

  it("sets data-theme for light and clears it for dark", () => {
    const root = fakeRoot();
    applyTheme(root as unknown as HTMLElement, "light");
    expect(root.get("data-theme")).toBe("light");

    applyTheme(root as unknown as HTMLElement, "dark");
    expect(root.get("data-theme")).toBeUndefined();
  });
});
