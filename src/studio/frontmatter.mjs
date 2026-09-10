// YAML frontmatter round-trip. Shared by the studio write path and by
// src/scripts/generate-checklist.mjs so there is exactly one parser.
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

// Group 1 is the YAML block, group 2 is everything after the closing fence.
// The optional trailing newline is consumed so the body keeps its own leading
// blank line, which makes the round-trip byte-exact.
const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseFrontmatter(src) {
  const m = String(src).match(FENCE);
  if (!m) return { data: {}, body: String(src) };
  return { data: parseYaml(m[1]) ?? {}, body: m[2] };
}

export function stringifyFrontmatter(data, body, keyOrder = []) {
  const ordered = {};
  for (const key of keyOrder) {
    if (data[key] !== undefined) ordered[key] = data[key];
  }
  for (const key of Object.keys(data)) {
    if (!(key in ordered) && data[key] !== undefined) ordered[key] = data[key];
  }
  // lineWidth: 0 disables folding, so long taglines and URLs stay on one line.
  // blockQuote: "literal" keeps multi-line snippet code readable and diffable.
  const yaml = stringifyYaml(ordered, { lineWidth: 0, blockQuote: "literal" });
  return `---\n${yaml}---\n${body}`;
}
