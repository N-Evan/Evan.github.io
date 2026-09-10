// Connect middleware for the studio API. Mounted only from configureServer,
// so it has no production counterpart. Thin glue: parse, delegate to the
// store, serialise.
import { fileURLToPath } from "node:url";
import {
  TYPES, createEntry, deleteEntry, listEntries, readEntry, reorderEntries, typeConfig, writeEntry,
} from "./store.mjs";
import { saveImage, MAX_IMAGE_BYTES } from "./images.mjs";

const DEFAULT_ROOT = fileURLToPath(new URL("../../", import.meta.url));

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > limit) {
        reject(new Error(`request body too large (max ${limit})`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const statusFor = (err) =>
  err.code === "ENOENT" ? 404 : err.code === "EEXIST" ? 409 : 400;

export function createHandler(server, root = DEFAULT_ROOT) {
  // Loaded lazily and cached: the schemas module is plain TS over `zod`, so
  // ssrLoadModule resolves it without Astro's virtual modules in scope.
  let schemasPromise;
  const schemas = () => {
    schemasPromise ??= server.ssrLoadModule("/src/content/schemas.ts");
    return schemasPromise;
  };

  async function validate(type, data) {
    const { SCHEMAS } = await schemas();
    const schema = SCHEMAS[type];
    const result = schema.safeParse(data);
    if (result.success) {
      return { data: result.data, keyOrder: Object.keys(schema.shape) };
    }
    return {
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  return async function studioHandler(req, res, next) {
    const url = new URL(req.url, "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);
    const method = req.method ?? "GET";

    try {
      // GET /entries
      if (method === "GET" && segments[0] === "entries" && segments.length === 1) {
        const entries = {};
        for (const type of Object.keys(TYPES)) {
          entries[type] = await listEntries(root, type);
        }
        return send(res, 200, { types: TYPES, entries });
      }

      // /entry/:type[/:id]
      if (segments[0] === "entry") {
        const [, type, id] = segments;
        typeConfig(type);

        if (method === "GET" && id) {
          return send(res, 200, await readEntry(root, type, id));
        }

        if (method === "POST" && !id) {
          const { data, body = "" } = JSON.parse(await readBody(req, 2e6));
          const checked = await validate(type, data);
          if (checked.errors) return send(res, 422, { errors: checked.errors });
          return send(res, 201, await createEntry(root, type, data, body, checked.keyOrder));
        }

        if (method === "PUT" && id) {
          const { data, body = "" } = JSON.parse(await readBody(req, 2e6));
          const checked = await validate(type, data);
          if (checked.errors) return send(res, 422, { errors: checked.errors });
          return send(res, 200, await writeEntry(root, type, id, data, body, checked.keyOrder));
        }

        if (method === "DELETE" && id) {
          return send(res, 200, await deleteEntry(root, type, id));
        }
      }

      // POST /reorder/:type
      if (method === "POST" && segments[0] === "reorder" && segments[1]) {
        const { ids } = JSON.parse(await readBody(req, 1e5));
        return send(res, 200, await reorderEntries(root, segments[1], ids));
      }

      // POST /image?kind=&name=
      if (method === "POST" && segments[0] === "image") {
        const buffer = await readBody(req, MAX_IMAGE_BYTES);
        const kind = url.searchParams.get("kind");
        const name = url.searchParams.get("name");
        return send(res, 200, await saveImage(root, kind, name, buffer));
      }

      return next();
    } catch (err) {
      server.config.logger.error(`[studio] ${method} ${req.url}: ${err.message}`);
      return send(res, statusFor(err), { error: err.message });
    }
  };
}
