// Normalises dropped images to the dimensions the site's components expect,
// so authored content cannot introduce an off-aspect thumb or a 4MB PNG.
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { slugify } from "./store.mjs";

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export const IMAGE_KINDS = Object.freeze({
  // 2:1, matching public/images/thumbs/*.png
  thumb: { dir: "public/images/thumbs", width: 1500, height: 750, web: "/images/thumbs" },
  // 16:9, matching GalleryGrid's aspect-video container
  gallery: { dir: "public/images/gallery", width: 1600, height: 900, web: "/images/gallery" },
  // Post covers double as OG images
  cover: { dir: "public/images", width: 1200, height: 630, web: "/images" },
});

export async function saveImage(root, kind, name, buffer) {
  const target = IMAGE_KINDS[kind];
  if (!target) throw new Error(`unknown image kind: ${kind}`);
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`image too large: ${buffer.length} bytes (max ${MAX_IMAGE_BYTES})`);
  }

  const slug = slugify(name);
  if (!slug) throw new Error("name must contain at least one letter or digit");

  let normalised;
  try {
    normalised = await sharp(buffer)
      .resize(target.width, target.height, { fit: "cover" })
      .png()
      .toBuffer();
  } catch {
    throw new Error("not a supported image format");
  }

  await mkdir(join(root, target.dir), { recursive: true });
  const filename = `${slug}.png`;
  const path = join(root, target.dir, filename);
  const tmp = `${path}.tmp`;
  await writeFile(tmp, normalised);
  await rename(tmp, path);

  return { path: `${target.web}/${filename}` };
}
