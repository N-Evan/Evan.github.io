import { describe, it, expect } from "vitest";
import { getPrevNext, sortByOrder } from "@/lib/projectNav";

type Item = { id: string; data: { order: number } };
const make = (id: string, order: number): Item => ({ id, data: { order } });

describe("sortByOrder", () => {
  it("returns items sorted ascending by order", () => {
    const a = make("a", 3), b = make("b", 1), c = make("c", 2);
    expect(sortByOrder([a, b, c]).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input", () => {
    const arr = [make("a", 2), make("b", 1)];
    sortByOrder(arr);
    expect(arr.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("getPrevNext", () => {
  const items = [make("a", 1), make("b", 2), make("c", 3)];

  it("returns the next item with wrap from last → first", () => {
    expect(getPrevNext(items, "c").next?.id).toBe("a");
  });

  it("returns the prev item with wrap from first → last", () => {
    expect(getPrevNext(items, "a").prev?.id).toBe("c");
  });

  it("returns prev/next around middle item", () => {
    const result = getPrevNext(items, "b");
    expect(result.prev?.id).toBe("a");
    expect(result.next?.id).toBe("c");
  });

  it("returns null prev/next when current id is not in list", () => {
    expect(getPrevNext(items, "missing")).toEqual({ prev: null, next: null });
  });

  it("handles a single-item list (prev and next both itself)", () => {
    const single = [make("only", 1)];
    const result = getPrevNext(single, "only");
    expect(result.prev?.id).toBe("only");
    expect(result.next?.id).toBe("only");
  });
});
