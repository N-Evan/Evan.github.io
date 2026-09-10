// Filesystem access for the studio. Every function takes the repo root as its
// first argument so the whole module is testable against temp directories.
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter.mjs";

export const TYPES = Object.freeze({
  projects: { kind: "md", dir: "src/content/projects", route: "/projects/" },
  posts: { kind: "md", dir: "src/content/posts", route: "/devlog/" },
  career: { kind: "json", path: "src/data/career.json", route: "/#career" },
});

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

export function typeConfig(type) {
  const config = TYPES[type];
  if (!config) throw new Error(`unknown type: ${type}`);
  return config;
}

export function assertId(id) {
  if (typeof id !== "string" || !ID_RE.test(id)) {
    throw new Error(`invalid id: ${id}`);
  }
  return id;
}

export function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export function mdPath(root, type, id) {
  return join(root, typeConfig(type).dir, `${assertId(id)}.md`);
}

export function jsonPath(root, type) {
  return join(root, typeConfig(type).path);
}

export async function readCareerFile(root) {
  try {
    return JSON.parse(await readFile(jsonPath(root, "career"), "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function listEntries(root, type) {
  const config = typeConfig(type);

  if (config.kind === "json") {
    const items = await readCareerFile(root);
    return items.map((item, index) => {
      const { id, ...data } = item;
      return { id, title: data.title ?? id, sort: index, data };
    });
  }

  let files;
  try {
    files = (await readdir(join(root, config.dir))).filter((f) => f.endsWith(".md"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }

  const entries = [];
  for (const file of files) {
    const src = await readFile(join(root, config.dir, file), "utf8");
    const { data } = parseFrontmatter(src);
    const id = basename(file, ".md");
    entries.push({
      id,
      title: data.title ?? id,
      sort: type === "posts" ? -new Date(data.date ?? 0).getTime() : Number(data.order ?? 0),
      data,
    });
  }
  return entries.sort((a, b) => a.sort - b.sort);
}

export async function readEntry(root, type, id) {
  const config = typeConfig(type);
  assertId(id);

  if (config.kind === "json") {
    const items = await readCareerFile(root);
    const found = items.find((item) => item.id === id);
    if (!found) {
      const err = new Error(`no such entry: ${type}/${id}`);
      err.code = "ENOENT";
      throw err;
    }
    const { id: _omit, ...data } = found;
    return { id, data, body: "" };
  }

  const src = await readFile(mdPath(root, type, id), "utf8");
  const { data, body } = parseFrontmatter(src);
  return { id, data, body };
}

const TRASH_DIR = ".studio-trash";

async function writeAtomic(path, contents) {
  const tmp = `${path}.tmp`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

function enoent(message) {
  const err = new Error(message);
  err.code = "ENOENT";
  return err;
}

async function writeCareerFile(root, items) {
  await writeAtomic(jsonPath(root, "career"), `${JSON.stringify(items, null, 2)}\n`);
}

async function toTrash(root, name, contents) {
  const dir = join(root, TRASH_DIR);
  await mkdir(dir, { recursive: true });
  const stamped = `${Date.now()}-${name}`;
  const path = join(dir, stamped);
  await writeFile(path, contents, "utf8");
  return path;
}

export async function createEntry(root, type, data, body, keyOrder = []) {
  const config = typeConfig(type);
  const id = slugify(data.title ?? "");
  if (!id) throw new Error("title must contain at least one letter or digit");

  if (config.kind === "json") {
    const items = await readCareerFile(root);
    if (items.some((item) => item.id === id)) {
      const err = new Error(`entry already exists: ${type}/${id}`);
      err.code = "EEXIST";
      throw err;
    }
    items.push({ id, ...data });
    await writeCareerFile(root, items);
    return { id };
  }

  const path = mdPath(root, type, id);
  try {
    await readFile(path, "utf8");
    const err = new Error(`entry already exists: ${type}/${id}`);
    err.code = "EEXIST";
    throw err;
  } catch (readErr) {
    if (readErr.code !== "ENOENT") throw readErr;
  }

  await mkdir(join(root, config.dir), { recursive: true });
  await writeAtomic(path, stringifyFrontmatter(data, body, keyOrder));
  return { id };
}

export async function writeEntry(root, type, id, data, body, keyOrder = []) {
  const config = typeConfig(type);
  assertId(id);

  if (config.kind === "json") {
    const items = await readCareerFile(root);
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) throw enoent(`no such entry: ${type}/${id}`);
    items[index] = { id, ...data };
    await writeCareerFile(root, items);
    return { id };
  }

  const path = mdPath(root, type, id);
  try {
    await readFile(path, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") throw enoent(`no such entry: ${type}/${id}`);
    throw err;
  }
  await writeAtomic(path, stringifyFrontmatter(data, body, keyOrder));
  return { id };
}

export async function deleteEntry(root, type, id) {
  const config = typeConfig(type);
  assertId(id);

  if (config.kind === "json") {
    const items = await readCareerFile(root);
    const found = items.find((item) => item.id === id);
    if (!found) throw enoent(`no such entry: ${type}/${id}`);
    const trashed = await toTrash(root, `career-${id}.json`, JSON.stringify(found, null, 2));
    await writeCareerFile(root, items.filter((item) => item.id !== id));
    return { id, trashed };
  }

  const path = mdPath(root, type, id);
  let contents;
  try {
    contents = await readFile(path, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") throw enoent(`no such entry: ${type}/${id}`);
    throw err;
  }
  // Trash first: git cannot restore a file it has never tracked.
  const trashed = await toTrash(root, `${type}-${id}.md`, contents);
  await unlink(path);
  return { id, trashed };
}

export async function reorderEntries(root, type, ids) {
  const config = typeConfig(type);
  if (type === "posts") throw new Error("posts are not reorderable — they sort by date");

  const existing = (await listEntries(root, type)).map((e) => e.id);
  const same =
    ids.length === existing.length && [...ids].sort().join() === [...existing].sort().join();
  if (!same) throw new Error("ids must match the existing entries exactly");

  if (config.kind === "json") {
    const items = await readCareerFile(root);
    const byId = new Map(items.map((item) => [item.id, item]));
    await writeCareerFile(root, ids.map((id) => byId.get(id)));
    return { ids };
  }

  const keyOrder = Object.keys((await readEntry(root, type, ids[0])).data);
  for (const [index, id] of ids.entries()) {
    const { data, body } = await readEntry(root, type, id);
    await writeAtomic(
      mdPath(root, type, id),
      stringifyFrontmatter({ ...data, order: index + 1 }, body, keyOrder)
    );
  }
  return { ids };
}
