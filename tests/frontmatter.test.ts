import { describe, it, expect } from "vitest";
import { parseFrontmatter, stringifyFrontmatter } from "@/studio/frontmatter.mjs";

const SNIPPET_DOC = [
  "---",
  "title: Aetherfall",
  "order: 1",
  "snippets:",
  "  - title: Dash",
  "    language: csharp",
  "    code: |-",
  "      void Dash() {",
  "        if (grounded) {",
  "          velocity += dir * force;",
  "        }",
  "      }",
  "---",
  "",
  "## Role & Responsibilities",
  "",
  "Did the thing.",
  "",
].join("\n");

describe("parseFrontmatter", () => {
  it("splits frontmatter from body", () => {
    const { data, body } = parseFrontmatter(SNIPPET_DOC);
    expect(data.title).toBe("Aetherfall");
    expect(data.order).toBe(1);
    expect(body).toBe("\n## Role & Responsibilities\n\nDid the thing.\n");
  });

  it("preserves multi-line code exactly", () => {
    const { data } = parseFrontmatter(SNIPPET_DOC);
    expect(data.snippets[0].code).toBe(
      "void Dash() {\n  if (grounded) {\n    velocity += dir * force;\n  }\n}"
    );
  });

  it("returns the whole input as body when there is no fence", () => {
    expect(parseFrontmatter("# Just markdown")).toEqual({
      data: {},
      body: "# Just markdown",
    });
  });

  it("handles CRLF line endings", () => {
    const { data, body } = parseFrontmatter("---\r\ntitle: X\r\n---\r\nbody\r\n");
    expect(data.title).toBe("X");
    expect(body).toBe("body\r\n");
  });
});

describe("stringifyFrontmatter", () => {
  it("round-trips a document with multi-line code", () => {
    const { data, body } = parseFrontmatter(SNIPPET_DOC);
    const out = stringifyFrontmatter(data, body, ["title", "order", "snippets"]);
    expect(parseFrontmatter(out).data).toEqual(data);
    expect(parseFrontmatter(out).body).toBe(body);
  });

  it("preserves the body verbatim", () => {
    const body = "\n## Heading\n\n- a\n- b\n\n```csharp\nvar x = 1;\n```\n";
    const out = stringifyFrontmatter({ title: "T" }, body);
    expect(parseFrontmatter(out).body).toBe(body);
  });

  it("emits keys in the requested order", () => {
    const out = stringifyFrontmatter(
      { year: 2025, title: "T", order: 3 },
      "",
      ["title", "order", "year"]
    );
    const keys = out
      .split("\n")
      .filter((l) => /^[a-z]/.test(l))
      .map((l) => l.split(":")[0]);
    expect(keys).toEqual(["title", "order", "year"]);
  });

  it("appends keys missing from keyOrder rather than dropping them", () => {
    const out = stringifyFrontmatter({ title: "T", extra: "kept" }, "", ["title"]);
    expect(parseFrontmatter(out).data).toEqual({ title: "T", extra: "kept" });
  });

  it("omits undefined values so optional fields stay absent", () => {
    const out = stringifyFrontmatter({ title: "T", studio: undefined }, "");
    expect(out).not.toContain("studio");
  });

  it("does not fold long lines", () => {
    const long = "x".repeat(400);
    const out = stringifyFrontmatter({ tagline: long }, "");
    expect(parseFrontmatter(out).data.tagline).toBe(long);
    expect(out.split("\n").some((l) => l.length > 400)).toBe(true);
  });

  it("preserves unicode used by the career timeline", () => {
    const data = { icon: "✦", stamp: "2023 — PRESENT", org: "Studio-23 · BS23" };
    const out = stringifyFrontmatter(data, "");
    expect(parseFrontmatter(out).data).toEqual(data);
  });
});
