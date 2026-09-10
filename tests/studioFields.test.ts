import { describe, it, expect } from "vitest";
import { FIELDS, blankEntry } from "@/studio/fields";
import { SCHEMAS } from "@/content/schemas";

describe("FIELDS", () => {
  it("covers the three authorable types", () => {
    expect(Object.keys(FIELDS)).toEqual(["projects", "posts", "career"]);
  });

  it("only names keys that exist in the matching schema", () => {
    for (const [type, fields] of Object.entries(FIELDS)) {
      const shape = Object.keys(SCHEMAS[type as keyof typeof SCHEMAS].shape);
      for (const field of fields) {
        expect(shape, `${type}.${field.key}`).toContain(field.key);
      }
    }
  });

  it("covers every required schema key so a new entry can be completed", () => {
    for (const [type, fields] of Object.entries(FIELDS)) {
      const schema = SCHEMAS[type as keyof typeof SCHEMAS];
      const declared = new Set(fields.map((f) => f.key));
      for (const [key, value] of Object.entries(schema.shape)) {
        if (!value.isOptional()) {
          expect(declared, `${type}.${key} is required but has no field`).toContain(key);
        }
      }
    }
  });

  it("gives every select widget its options", () => {
    for (const fields of Object.values(FIELDS)) {
      for (const field of fields.filter((f) => f.widget === "select")) {
        expect(field.options?.length, field.key).toBeGreaterThan(0);
      }
    }
  });

  it("gives every image and gallery widget an imageKind", () => {
    for (const fields of Object.values(FIELDS)) {
      for (const field of fields.filter((f) => f.widget === "image" || f.widget === "gallery")) {
        expect(field.imageKind, field.key).toBeTruthy();
      }
    }
  });

  it("gives the snippets repeater its sub-fields", () => {
    const snippets = FIELDS.projects.find((f) => f.key === "snippets");
    expect(snippets?.widget).toBe("repeater");
    expect(snippets?.subFields?.map((f) => f.key)).toEqual([
      "title", "language", "code", "caption",
    ]);
  });

  it("mirrors the status enum from the schema", () => {
    const status = FIELDS.projects.find((f) => f.key === "status");
    expect(status?.options).toEqual(SCHEMAS.projects.shape.status.options);
  });
});

describe("blankEntry", () => {
  it("produces a project stub that only fails on genuinely empty fields", () => {
    const stub = blankEntry("projects");
    expect(stub.status).toBe("in-development");
    expect(stub.platforms).toEqual([]);
    expect(stub.order).toBe(0);
  });

  it("produces a career stub with valid enum defaults", () => {
    const stub = blankEntry("career");
    expect(SCHEMAS.career.safeParse({ ...stub, title: "T", detail: "D", stamp: "2026" }).success)
      .toBe(true);
  });

  it("produces a post stub with today's date", () => {
    const stub = blankEntry("posts") as { date: string };
    expect(stub.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
