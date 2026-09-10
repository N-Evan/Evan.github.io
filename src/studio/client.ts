import { FIELDS, blankEntry, type Field } from "./fields";
import { renderField } from "./widgets";
import { moveInList, previewUrlFor } from "./preview";

type Type = keyof typeof FIELDS;

interface RailEntry {
  id: string;
  title: string;
  data: Record<string, unknown>;
}

const api = async (path: string, init?: RequestInit) => {
  const res = await fetch(`/__studio${path}`, init);
  const payload = res.status === 204 ? {} : await res.json();
  if (!res.ok) throw Object.assign(new Error(payload.error ?? res.statusText), payload);
  return payload;
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const state = {
  lists: {} as Record<Type, RailEntry[]>,
  type: null as Type | null,
  id: null as string | null,
  data: {} as Record<string, unknown>,
  body: "",
  pristine: "",
  isNew: false,
};

const BASE = document.documentElement.dataset.previewHome ?? "/";

function refreshPreview(bust = false) {
  if (!state.type) return;
  const frame = $<HTMLIFrameElement>("preview-frame");
  const next = previewUrlFor(state.type, state.id, BASE, bust ? Date.now() : undefined);
  if (frame.getAttribute("src") !== next) frame.setAttribute("src", next);
  else if (bust) frame.contentWindow?.location.reload();
}

function toast(message: string, isError = false) {
  const node = $("toast");
  node.textContent = message;
  node.classList.toggle("is-error", isError);
  node.classList.add("is-visible");
  window.setTimeout(() => node.classList.remove("is-visible"), 2600);
}

const snapshot = () => JSON.stringify({ data: state.data, body: state.body });

// Extended in Task 11 with the dirty flag and preview refresh.
function onFormChanged() {
  const dirty = snapshot() !== state.pristine;
  $<HTMLButtonElement>("btn-save").disabled = !dirty;
  $<HTMLButtonElement>("btn-discard").disabled = !dirty;
  $<HTMLButtonElement>("btn-delete").disabled = state.isNew || !state.id;
  $("dirty-flag").textContent = dirty ? "● UNSAVED" : "";
}

function renderChecklist() {
  const host = $("form-checklist");
  host.replaceChildren();
  if (state.type !== "projects") return;
  const data = state.data as Record<string, unknown>;
  const links = (data.links ?? {}) as Record<string, string>;
  const checks: Array<[string, boolean]> = [
    ["hero art", Boolean(data.thumb)],
    ["tagline", Boolean(String(data.tagline ?? "").trim())],
    ["insights ≥ 3", ((data.keyInsights as string[]) ?? []).length >= 3],
    ["gallery ≥ 4", ((data.gallery as string[]) ?? []).length >= 4],
    ["a link", Object.values(links).some(Boolean)],
    ["role section", /##\s+Role & Responsibilities\s*\n\s*\S/.test(state.body)],
    ["learnings", /##\s+Learnings\s*\n\s*\S/.test(state.body)],
    ["behind the scenes", /##\s+Behind the Scenes\s*\n\s*\S/.test(state.body)],
  ];
  for (const [label, ok] of checks) {
    const chip = document.createElement("span");
    chip.className = ok ? "ok" : "no";
    chip.textContent = `${ok ? "✓" : "·"} ${label}`;
    host.append(chip);
  }
}

function renderForm() {
  const form = $("form-fields");
  form.replaceChildren();
  if (!state.type) {
    form.innerHTML = '<p class="empty">Pick an entry on the left, or start a new one.</p>';
    return;
  }

  const onChange = (key: string, value: unknown) => {
    if (value === undefined) delete state.data[key];
    else state.data[key] = value;
    renderChecklist();
    onFormChanged();
  };

  const nameHint = () => String(state.data.title ?? state.id ?? "untitled");

  let group = "";
  for (const field of FIELDS[state.type]) {
    if (field.group && field.group !== group) {
      group = field.group;
      const head = document.createElement("p");
      head.className = "group-head";
      head.textContent = group;
      form.append(head);
    }
    form.append(renderField(field, state.data[field.key], onChange, nameHint));
  }

  if (state.type !== "career") {
    const head = document.createElement("p");
    head.className = "group-head";
    head.textContent = "Body (markdown)";
    form.append(head);
    const bodyField: Field = { key: "__body", label: "Markdown", widget: "markdown" };
    form.append(
      renderField(bodyField, state.body, (_key, value) => {
        state.body = value == null ? "" : String(value);
        renderChecklist();
        onFormChanged();
      })
    );
  }

  renderChecklist();
  onFormChanged();
}

function showErrors(errors: Array<{ path: string; message: string }> = []) {
  for (const node of document.querySelectorAll<HTMLElement>(".field__error")) {
    node.hidden = true;
    node.textContent = "";
  }
  for (const issue of errors) {
    const node = document.getElementById(`err-${issue.path.split(".")[0]}`);
    if (node) {
      node.textContent = issue.message;
      node.hidden = false;
    }
  }
}

function renderRails() {
  for (const section of document.querySelectorAll<HTMLElement>(".rail-group")) {
    const type = section.dataset.type as Type;
    const list = section.querySelector<HTMLUListElement>(".rail-list")!;
    const reorderable = type !== "posts";
    list.replaceChildren();

    for (const entry of state.lists[type] ?? []) {
      const item = document.createElement("li");
      item.className = "rail-item";
      item.dataset.id = entry.id;
      item.dataset.type = type;
      item.draggable = reorderable;
      if (state.type === type && state.id === entry.id) item.setAttribute("aria-current", "true");

      if (reorderable) {
        const grip = document.createElement("span");
        grip.className = "rail-item__grip";
        grip.textContent = "∷";
        item.append(grip);
      }
      const label = document.createElement("span");
      label.textContent = entry.title;
      const meta = document.createElement("span");
      meta.className = "rail-item__meta";
      meta.textContent = String(entry.data.year ?? entry.data.stamp ?? "");
      item.append(label, meta);
      item.addEventListener("click", () => void select(type, entry.id));

      if (reorderable) {
        item.addEventListener("dragstart", (e) => {
          e.dataTransfer?.setData("text/plain", `${type}:${entry.id}`);
        });
        item.addEventListener("dragover", (e) => {
          e.preventDefault();
          item.classList.add("is-dragover");
        });
        item.addEventListener("dragleave", () => item.classList.remove("is-dragover"));
        item.addEventListener("drop", (e) => {
          e.preventDefault();
          item.classList.remove("is-dragover");
          const [dragType, dragId] = (e.dataTransfer?.getData("text/plain") ?? "").split(":");
          if (dragType !== type || !dragId || dragId === entry.id) return;
          void commitReorder(type, dragId, entry.id);
        });
      }
      list.append(item);
    }
  }
}

async function commitReorder(type: Type, dragId: string, dropId: string) {
  const ids = (state.lists[type] ?? []).map((entry) => entry.id);
  const next = moveInList(ids, ids.indexOf(dragId), ids.indexOf(dropId));
  try {
    await api(`/reorder/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next }),
    });
    await refreshLists();
    refreshPreview(true);
    toast(`reordered ${type}`);
  } catch (err) {
    toast((err as Error).message, true);
  }
}

async function refreshLists() {
  const { entries } = await api("/entries");
  state.lists = entries;
  renderRails();
}

async function select(type: Type, id: string) {
  if (snapshot() !== state.pristine && !confirm("Discard unsaved changes?")) return;
  const entry = await api(`/entry/${type}/${id}`);
  state.type = type;
  state.id = id;
  state.data = entry.data;
  state.body = entry.body ?? "";
  state.isNew = false;
  state.pristine = snapshot();
  $("form-title").textContent = `${type.toUpperCase()} // ${id}`;
  showErrors();
  renderForm();
  renderRails();
  refreshPreview();
}

function startNew(type: Type) {
  if (snapshot() !== state.pristine && !confirm("Discard unsaved changes?")) return;
  state.type = type;
  state.id = null;
  state.data = blankEntry(type);
  state.body =
    type === "projects"
      ? "\n## Role & Responsibilities\n\n\n## Learnings\n\n\n## Behind the Scenes\n\n"
      : type === "posts"
        ? "\n\n"
        : "";
  state.isNew = true;
  state.pristine = "";
  $("form-title").textContent = `${type.toUpperCase()} // NEW`;
  showErrors();
  renderForm();
  renderRails();
}

async function save() {
  if (!state.type) return;
  const payload = JSON.stringify({ data: state.data, body: state.body });
  try {
    const result = state.isNew
      ? await api(`/entry/${state.type}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        })
      : await api(`/entry/${state.type}/${state.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
    showErrors();
    state.id = result.id;
    state.isNew = false;
    state.pristine = snapshot();
    await refreshLists();
    onFormChanged();
    refreshPreview(true);
    toast(`saved ${state.type}/${result.id}`);
  } catch (err) {
    const issues = (err as { errors?: Array<{ path: string; message: string }> }).errors;
    if (issues) {
      showErrors(issues);
      toast(`${issues.length} field${issues.length > 1 ? "s" : ""} need attention`, true);
    } else {
      toast((err as Error).message, true);
    }
  }
}

async function remove() {
  if (!state.type || !state.id) return;
  const button = $<HTMLButtonElement>("btn-delete");
  if (button.dataset.armed !== "true") {
    button.dataset.armed = "true";
    button.textContent = "CONFIRM DELETE";
    window.setTimeout(() => {
      button.dataset.armed = "false";
      button.textContent = "DELETE";
    }, 4000);
    return;
  }
  const { trashed } = await api(`/entry/${state.type}/${state.id}`, { method: "DELETE" });
  button.dataset.armed = "false";
  button.textContent = "DELETE";
  toast(`deleted — copy kept at ${trashed}`);
  state.type = null;
  state.id = null;
  state.data = {};
  state.body = "";
  state.pristine = snapshot();
  await refreshLists();
  renderForm();
  $<HTMLIFrameElement>("preview-frame").setAttribute("src", BASE);
}

$("btn-save").addEventListener("click", () => void save());
$("btn-delete").addEventListener("click", () => void remove());
$("btn-discard").addEventListener("click", () => {
  if (state.isNew && state.type) startNew(state.type);
  else if (state.type && state.id) void select(state.type, state.id);
});
for (const button of document.querySelectorAll<HTMLElement>(".rail-new")) {
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    startNew((button.closest(".rail-group") as HTMLElement).dataset.type as Type);
  });
}
const setViewport = (mobile: boolean) => {
  $("preview-frame").classList.toggle("is-mobile", mobile);
  $("preview-desktop").setAttribute("aria-pressed", String(!mobile));
  $("preview-mobile").setAttribute("aria-pressed", String(mobile));
};
$("preview-desktop").addEventListener("click", () => setViewport(false));
$("preview-mobile").addEventListener("click", () => setViewport(true));

// Theme. Drives both the studio chrome (studio.css imports theme.css, so the
// attribute is all it needs) and the preview iframe. No CRT power cycle here —
// the effect is pointless in a 46%-wide pane, so the swap is instant.
const setTheme = (theme: "dark" | "light") => {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");

  try { localStorage.setItem("evan:theme", theme); } catch { /* private mode */ }

  $("preview-theme").textContent = theme === "light" ? "DAY" : "NIGHT";
  $("preview-theme").setAttribute("aria-pressed", String(theme === "light"));

  // The iframe is same-origin, so it already reads the same localStorage on
  // load; this keeps an *already-open* preview in step without a reload.
  $<HTMLIFrameElement>("preview-frame").contentWindow?.postMessage(
    { type: "evan:theme:set", theme },
    window.location.origin
  );
};

const storedTheme = (): "dark" | "light" => {
  try { return localStorage.getItem("evan:theme") === "light" ? "light" : "dark"; }
  catch { return "dark"; }
};

setTheme(storedTheme());
$("preview-theme").addEventListener("click", () =>
  setTheme(storedTheme() === "light" ? "dark" : "light")
);

// The site posts up when toggled from inside the preview; mirror it.
window.addEventListener("message", (e) => {
  if (e.origin !== window.location.origin) return;
  if (e.data?.type !== "evan:theme") return;
  setTheme(e.data.theme === "light" ? "light" : "dark");
});

window.addEventListener("beforeunload", (e) => {
  if (snapshot() !== state.pristine) e.preventDefault();
});

void refreshLists();
