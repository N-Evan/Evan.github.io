// Prefix internal paths with Astro's configured `base` so they resolve
// correctly when the site is served from a sub-path (e.g. on GitHub Pages
// at https://<user>.github.io/<repo>/).

// Strip trailing slashes so we can always concatenate `BASE + "/" + ...`
// regardless of whether the configured base had a trailing slash.
const BASE = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");

/**
 * Apply the configured base to an internal path. Returns the input unchanged
 * for fully-qualified URLs (http://, https://), protocol-relative URLs (//),
 * mailto:, tel:, and pure fragment links (#anchor).
 *
 * @example
 *   withBase("/devlog")        // "/" or "/Evan.github.io/devlog"
 *   withBase("/#missions")     // "/#missions" or "/Evan.github.io/#missions"
 *   withBase("https://x.com")  // "https://x.com"
 */
export function withBase(path: string | undefined | null): string {
  const home = BASE === "" ? "/" : BASE + "/";
  if (path == null || path === "") return home;
  if (/^[a-z][a-z0-9+.\-]*:/i.test(path)) return path; // protocol scheme
  if (path.startsWith("//")) return path;
  if (path.startsWith("#")) return path;
  // Already prefixed
  if (BASE !== "" && (path === BASE || path.startsWith(BASE + "/"))) return path;
  // Normalize leading slash, then join
  const cleaned = path.startsWith("/") ? path.slice(1) : path;
  return home + cleaned;
}
