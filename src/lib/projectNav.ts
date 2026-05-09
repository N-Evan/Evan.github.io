// src/lib/projectNav.ts
// Pure utilities for project ordering and prev/next navigation.

export interface Orderable {
  id: string;
  data: { order: number };
}

export function sortByOrder<T extends Orderable>(items: T[]): T[] {
  return [...items].sort((a, b) => a.data.order - b.data.order);
}

export function getPrevNext<T extends Orderable>(
  items: T[],
  currentId: string
): { prev: T | null; next: T | null } {
  const sorted = sortByOrder(items);
  const idx = sorted.findIndex((x) => x.id === currentId);
  if (idx === -1) return { prev: null, next: null };
  const len = sorted.length;
  const prev = sorted[(idx - 1 + len) % len];
  const next = sorted[(idx + 1) % len];
  return { prev, next };
}
