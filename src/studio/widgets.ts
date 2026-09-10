import type { Field } from "./fields";

export function parseTagInput(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

export function linksToRows(
  links: Record<string, string | undefined> | undefined
): Array<{ platform: string; url: string }> {
  if (!links) return [];
  return Object.entries(links)
    .filter(([, url]) => typeof url === "string")
    .map(([platform, url]) => ({ platform, url: url as string }));
}

export function rowsToLinks(
  rows: Array<{ platform: string; url: string }>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (row.platform && row.url.trim()) out[row.platform] = row.url.trim();
  }
  return out;
}

export function coerceValue(field: Field, raw: string): unknown {
  if (field.widget === "number") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (field.widget === "bool") return raw === "true";
  if (field.key === "teamSize") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    return trimmed;
  }
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : raw;
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = []
): HTMLElementTagNameMap[K] => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
};

async function uploadImage(kind: string, name: string, file: File): Promise<string> {
  const res = await fetch(
    `/__studio/image?kind=${encodeURIComponent(kind)}&name=${encodeURIComponent(name)}`,
    { method: "POST", body: file }
  );
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error ?? "upload failed");
  return payload.path as string;
}

function dropZone(
  field: Field,
  nameHint: () => string,
  onPath: (path: string) => void
): HTMLElement {
  const zone = el("div", { className: "drop", tabIndex: 0 }, ["drop image or click to browse"]);
  const picker = el("input", { type: "file", accept: "image/*", hidden: true });

  const ingest = async (file: File | undefined) => {
    if (!file) return;
    zone.classList.add("drop--busy");
    zone.textContent = "processing…";
    try {
      onPath(await uploadImage(field.imageKind ?? "thumb", nameHint(), file));
    } catch (err) {
      zone.textContent = (err as Error).message;
    } finally {
      zone.classList.remove("drop--busy");
    }
  };

  zone.addEventListener("click", () => picker.click());
  picker.addEventListener("change", () => ingest(picker.files?.[0]));
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("is-over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("is-over");
    ingest(e.dataTransfer?.files?.[0]);
  });

  return el("div", {}, [zone, picker]);
}

export function renderField(
  field: Field,
  value: unknown,
  onChange: (key: string, value: unknown) => void,
  nameHint: () => string = () => field.key
): HTMLElement {
  const wrap = el("div", { className: "field" });
  wrap.append(el("label", { className: "field__label" }, [field.label]));

  const emit = (next: unknown) => onChange(field.key, next);

  switch (field.widget) {
    case "select": {
      const select = el("select");
      if (!field.options?.includes(String(value))) select.append(el("option", { value: "" }, ["—"]));
      for (const option of field.options ?? []) {
        select.append(el("option", { value: option, selected: option === value }, [option]));
      }
      select.addEventListener("change", () => emit(select.value || undefined));
      wrap.append(select);
      break;
    }
    case "bool": {
      const box = el("input", { type: "checkbox", checked: Boolean(value) });
      box.addEventListener("change", () => emit(box.checked));
      wrap.append(box);
      break;
    }
    case "number":
    case "date":
    case "url":
    case "text": {
      const input = el("input", {
        type: field.widget === "number" ? "number" : field.widget === "date" ? "date" : field.widget === "url" ? "url" : "text",
        value: value == null ? "" : String(value).slice(0, field.widget === "date" ? 10 : undefined),
      });
      input.addEventListener("input", () => emit(coerceValue(field, input.value)));
      wrap.append(input);
      break;
    }
    case "textarea":
    case "markdown": {
      const area = el("textarea", {
        value: value == null ? "" : String(value),
        className: field.key === "code" ? "is-code" : "",
      });
      area.addEventListener("input", () => emit(area.value === "" ? undefined : area.value));
      wrap.append(area);
      break;
    }
    case "tags": {
      const list = Array.isArray(value) ? [...(value as string[])] : [];
      const box = el("div", { className: "tags" });
      const input = el("input", { type: "text", placeholder: "add, comma, separated" });

      const paint = () => {
        box.replaceChildren();
        list.forEach((tag, index) => {
          const remove = el("button", { type: "button", title: `Remove ${tag}` }, ["×"]);
          remove.addEventListener("click", () => {
            list.splice(index, 1);
            paint();
            emit([...list]);
          });
          box.append(el("span", { className: "chip" }, [tag, remove]));
        });
        box.append(input);
        input.focus();
      };

      const commit = () => {
        const added = parseTagInput(input.value).filter((tag) => !list.includes(tag));
        if (!added.length) return;
        list.push(...added);
        input.value = "";
        paint();
        emit([...list]);
      };

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === ",") {
          e.preventDefault();
          commit();
        }
      });
      input.addEventListener("blur", commit);
      paint();
      wrap.append(box);
      break;
    }
    case "image": {
      const preview = el("div");
      const paint = (path: unknown) => {
        preview.replaceChildren();
        if (typeof path === "string" && path) {
          preview.append(el("img", { src: path, alt: "" }), el("code", {}, [path]));
        }
      };
      paint(value);
      wrap.append(
        preview,
        dropZone(field, nameHint, (path) => {
          paint(path);
          emit(path);
        })
      );
      break;
    }
    case "gallery": {
      const list = Array.isArray(value) ? [...(value as string[])] : [];
      const strip = el("div", { className: "gallery-strip" });
      const paint = () => {
        strip.replaceChildren();
        list.forEach((path, index) => {
          const remove = el("button", { type: "button", title: "Remove" }, ["×"]);
          remove.addEventListener("click", () => {
            list.splice(index, 1);
            paint();
            emit([...list]);
          });
          strip.append(el("figure", {}, [el("img", { src: path, alt: "" }), remove]));
        });
      };
      paint();
      wrap.append(
        strip,
        dropZone(field, () => `${nameHint()}-${list.length + 1}`, (path) => {
          list.push(path);
          paint();
          emit([...list]);
        })
      );
      break;
    }
    case "repeater": {
      const rows: Array<Record<string, unknown>> =
        field.key === "links"
          ? linksToRows(value as Record<string, string>)
          : Array.isArray(value)
            ? (value as Array<Record<string, unknown>>).map((row) => ({ ...row }))
            : [];

      const host = el("div");
      const publish = () =>
        emit(
          field.key === "links"
            ? rowsToLinks(rows as Array<{ platform: string; url: string }>)
            : rows.length
              ? rows.map((row) => ({ ...row }))
              : undefined
        );

      const paint = () => {
        host.replaceChildren();
        rows.forEach((row, index) => {
          const remove = el("button", { className: "btn btn--danger", type: "button" }, ["REMOVE"]);
          remove.addEventListener("click", () => {
            rows.splice(index, 1);
            paint();
            publish();
          });
          const block = el("div", { className: "repeat-row" }, [
            el("div", { className: "repeat-row__head" }, [
              el("strong", {}, [`#${index + 1}`]),
              remove,
            ]),
          ]);
          for (const sub of field.subFields ?? []) {
            block.append(
              renderField(sub, row[sub.key], (key, next) => {
                row[key] = next;
                publish();
              })
            );
          }
          host.append(block);
        });
        const add = el("button", { className: "btn", type: "button" }, ["+ ADD"]);
        add.addEventListener("click", () => {
          rows.push({});
          paint();
        });
        host.append(add);
      };
      paint();
      wrap.append(host);
      break;
    }
  }

  if (field.help) wrap.append(el("p", { className: "field__help" }, [field.help]));
  wrap.append(el("p", { className: "field__error", id: `err-${field.key}`, hidden: true }));
  return wrap;
}
