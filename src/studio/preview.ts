// Route mapping and list-move maths, split out so both are unit-testable
// without a DOM.
const ROUTES = {
  projects: "projects/",
  posts: "devlog/",
  career: "#career",
} as const;

export function previewUrlFor(
  type: keyof typeof ROUTES,
  id: string | null,
  base: string,
  bust?: number
): string {
  const home = base.endsWith("/") ? base : `${base}/`;
  const query = bust ? `?studio=${bust}` : "";

  if (type === "career") return `${home}${query}#career`;
  if (!id) return `${home}${query}`;
  return `${home}${ROUTES[type]}${id}${query}`;
}

export function moveInList(ids: string[], from: number, to: number): string[] {
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  const target = Math.max(0, Math.min(to, next.length));
  next.splice(target, 0, moved);
  return next;
}
