import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { IMAGE_KINDS, MAX_IMAGE_BYTES, saveImage } from "@/studio/images.mjs";

let root: string;

const png = (w: number, h: number) =>
  sharp({
    create: { width: w, height: h, channels: 3, background: { r: 20, g: 5, b: 40 } },
  })
    .png()
    .toBuffer();

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "studio-img-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("IMAGE_KINDS", () => {
  it("matches the dimensions the site already uses", () => {
    expect(IMAGE_KINDS.thumb).toMatchObject({ width: 1500, height: 750 });
    expect(IMAGE_KINDS.gallery).toMatchObject({ width: 1600, height: 900 });
    expect(IMAGE_KINDS.cover).toMatchObject({ width: 1200, height: 630 });
  });
});

describe("saveImage", () => {
  it("writes a thumb at 1500x750 and returns its site path", async () => {
    const { path } = await saveImage(root, "thumb", "Aetherfall II", await png(800, 800));
    expect(path).toBe("/images/thumbs/aetherfall-ii.png");
    const meta = await sharp(join(root, "public/images/thumbs/aetherfall-ii.png")).metadata();
    expect([meta.width, meta.height]).toEqual([1500, 750]);
    expect(meta.format).toBe("png");
  });

  it("writes gallery images at 1600x900", async () => {
    const { path } = await saveImage(root, "gallery", "shot-01", await png(400, 300));
    const meta = await sharp(join(root, "public", path)).metadata();
    expect([meta.width, meta.height]).toEqual([1600, 900]);
  });

  it("slugifies the name so it cannot escape the target directory", async () => {
    const { path } = await saveImage(root, "thumb", "../../evil name", await png(10, 10));
    expect(path).toBe("/images/thumbs/evil-name.png");
    const files = await readdir(join(root, "public/images/thumbs"));
    expect(files).toEqual(["evil-name.png"]);
  });

  it("rejects an unknown kind", async () => {
    await expect(saveImage(root, "banner", "x", await png(10, 10))).rejects.toThrow(
      /unknown image kind/i
    );
  });

  it("rejects a name that slugifies to nothing", async () => {
    await expect(saveImage(root, "thumb", "!!!", await png(10, 10))).rejects.toThrow(
      /name/i
    );
  });

  it("rejects a buffer that is not an image", async () => {
    await expect(
      saveImage(root, "thumb", "notanimage", Buffer.from("hello world"))
    ).rejects.toThrow(/not a supported image/i);
  });

  it("rejects a buffer over the size cap", async () => {
    const huge = Buffer.alloc(MAX_IMAGE_BYTES + 1);
    await expect(saveImage(root, "thumb", "huge", huge)).rejects.toThrow(/too large/i);
  });

  it("leaves no .tmp file behind", async () => {
    await saveImage(root, "thumb", "clean", await png(10, 10));
    const files = await readdir(join(root, "public/images/thumbs"));
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
  });
});
