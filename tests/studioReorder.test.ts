import { describe, it, expect } from "vitest";
import { moveInList, previewUrlFor } from "@/studio/preview";

describe("moveInList", () => {
  it("moves an item later", () => {
    expect(moveInList(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an item earlier", () => {
    expect(moveInList(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("is a no-op when the index does not change", () => {
    expect(moveInList(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input", () => {
    const ids = ["a", "b"];
    moveInList(ids, 0, 1);
    expect(ids).toEqual(["a", "b"]);
  });

  it("clamps an out-of-range target", () => {
    expect(moveInList(["a", "b"], 0, 9)).toEqual(["b", "a"]);
  });
});

describe("previewUrlFor", () => {
  it("points at the project detail page under the configured base", () => {
    expect(previewUrlFor("projects", "aetherfall", "/Evan.github.io/")).toBe(
      "/Evan.github.io/projects/aetherfall"
    );
  });

  it("points at the devlog post page", () => {
    expect(previewUrlFor("posts", "welcome-to-the-devlog", "/Evan.github.io/")).toBe(
      "/Evan.github.io/devlog/welcome-to-the-devlog"
    );
  });

  it("points career entries at the home page anchor", () => {
    expect(previewUrlFor("career", "gameplay-programmer", "/Evan.github.io/")).toBe(
      "/Evan.github.io/#career"
    );
  });

  it("falls back to the base when there is no id yet", () => {
    expect(previewUrlFor("projects", null, "/Evan.github.io/")).toBe("/Evan.github.io/");
  });

  it("works with a root base", () => {
    expect(previewUrlFor("projects", "alpha", "/")).toBe("/projects/alpha");
  });

  it("adds a cache-busting parameter when asked", () => {
    const url = previewUrlFor("projects", "alpha", "/", 1234);
    expect(url).toBe("/projects/alpha?studio=1234");
  });

  it("appends the cache-buster before a hash", () => {
    expect(previewUrlFor("career", "x", "/", 99)).toBe("/?studio=99#career");
  });
});
