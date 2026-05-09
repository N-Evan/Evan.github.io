// Render src/assets/og-template.svg to public/og-image.png at 1200x630.
// Runs at build time via npm scripts.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SRC = join(ROOT, "src/assets/og-template.svg");
const OUT_PNG = join(ROOT, "public/og-image.png");
const OUT_SVG = join(ROOT, "public/og-image.svg");

async function main() {
  const svg = await readFile(SRC);

  await mkdir(dirname(OUT_PNG), { recursive: true });
  await writeFile(OUT_SVG, svg);

  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    console.warn("⚠ sharp not installed; skipped PNG conversion. Using SVG as og-image.");
    return;
  }

  await sharp(svg, { density: 192 })
    .resize(1200, 630, { fit: "contain", background: { r: 7, g: 3, b: 15, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(OUT_PNG);

  console.log(`✓ Wrote ${OUT_PNG}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
