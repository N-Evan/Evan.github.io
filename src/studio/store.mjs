// Filesystem access for the studio. Every function takes the repo root as its
// first argument so the whole module is testable against temp directories.
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseFrontmatter } from "./frontmatter.mjs";

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
