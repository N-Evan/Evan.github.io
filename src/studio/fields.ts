// Form layout for the studio. Deliberately hand-written rather than derived
// from the Zod schemas: usable widget choices need hints (which string is a
// URL, which array is a tag list, which is a gallery) that would otherwise
// have to live in the build's schema. Validation stays schema-derived, so no
// constraint is repeated here.
import { SCHEMAS } from "../content/schemas";

export type Widget =
  | "text" | "textarea" | "number" | "select" | "tags" | "url"
  | "bool" | "date" | "image" | "gallery" | "repeater" | "markdown";

export interface Field {
  key: string;
  label: string;
  widget: Widget;
  options?: string[];
  help?: string;
  imageKind?: "thumb" | "gallery" | "cover";
  subFields?: Field[];
  group?: string;
}

const projectFields: Field[] = [
  { key: "title", label: "Title", widget: "text", group: "Identity" },
  { key: "tagline", label: "Tagline", widget: "text", group: "Identity", help: "Max 140 chars — shown under the title." },
  { key: "order", label: "Order", widget: "number", group: "Identity", help: "Lower shows first in the Mission Log." },
  { key: "year", label: "Year", widget: "number", group: "Identity" },
  { key: "status", label: "Status", widget: "select", options: [...SCHEMAS.projects.shape.status.options], group: "Identity" },
  { key: "featured", label: "Featured", widget: "bool", group: "Identity", help: "Pins this to the Featured Project panel." },

  { key: "employmentType", label: "Employment", widget: "select", options: [...SCHEMAS.projects.shape.employmentType.options], group: "Production" },
  { key: "studio", label: "Studio", widget: "text", group: "Production", help: "Leave blank for personal projects." },
  { key: "role", label: "Role", widget: "text", group: "Production" },
  { key: "teamSize", label: "Team size", widget: "text", group: "Production", help: "A number, or the word Individual." },
  { key: "duration", label: "Duration", widget: "text", group: "Production", help: "Free text, e.g. 6 months." },
  { key: "platforms", label: "Platforms", widget: "tags", group: "Production" },
  { key: "genres", label: "Genres", widget: "tags", group: "Production" },
  { key: "tech", label: "Tech", widget: "tags", group: "Production" },

  { key: "thumb", label: "Hero art", widget: "image", imageKind: "thumb", group: "Media", help: "Normalised to 1500x750." },
  { key: "gallery", label: "Gallery", widget: "gallery", imageKind: "gallery", group: "Media", help: "Checklist wants 4 or more." },

  { key: "keyInsights", label: "Key insights", widget: "tags", group: "Detail", help: "Up to 4. Checklist wants 3 or more." },
  { key: "links", label: "Links", widget: "repeater", group: "Detail", subFields: [
    { key: "platform", label: "Platform", widget: "select", options: ["steam", "itch", "github", "youtube", "website", "googleplay", "appstore"] },
    { key: "url", label: "URL", widget: "url" },
  ] },
  { key: "snippets", label: "Code snippets", widget: "repeater", group: "Detail", subFields: [
    { key: "title", label: "Title", widget: "text" },
    { key: "language", label: "Language", widget: "text" },
    { key: "code", label: "Code", widget: "textarea" },
    { key: "caption", label: "Caption", widget: "text" },
  ] },
];

const postFields: Field[] = [
  { key: "title", label: "Title", widget: "text", group: "Identity" },
  { key: "summary", label: "Summary", widget: "textarea", group: "Identity", help: "Max 220 chars — used in listings and meta description." },
  { key: "date", label: "Date", widget: "date", group: "Identity" },
  { key: "updated", label: "Updated", widget: "date", group: "Identity" },
  { key: "author", label: "Author", widget: "text", group: "Identity" },
  { key: "draft", label: "Draft", widget: "bool", group: "Identity", help: "Drafts stay out of the listing." },
  { key: "tags", label: "Tags", widget: "tags", group: "Identity" },
  { key: "cover", label: "Cover", widget: "image", imageKind: "cover", group: "Media", help: "Doubles as the OG image. Normalised to 1200x630." },
];

const careerFields: Field[] = [
  { key: "stamp", label: "Stamp", widget: "text", group: "Entry", help: "Displayed date, e.g. 2023 or 2023 — PRESENT." },
  { key: "title", label: "Title", widget: "text", group: "Entry" },
  { key: "org", label: "Organisation", widget: "text", group: "Entry", help: "Shown for roles and education." },
  { key: "detail", label: "Detail", widget: "textarea", group: "Entry" },
  { key: "kind", label: "Kind", widget: "select", options: [...SCHEMAS.career.shape.kind.options], group: "Style" },
  { key: "tone", label: "Tone", widget: "select", options: [...SCHEMAS.career.shape.tone.options], group: "Style" },
  { key: "icon", label: "Icon", widget: "select", options: ["✦", "▲", "◆"], group: "Style", help: "Milestones only." },
];

export const FIELDS: Record<"projects" | "posts" | "career", Field[]> = {
  projects: projectFields,
  posts: postFields,
  career: careerFields,
};

const today = () => new Date().toISOString().slice(0, 10);

export function blankEntry(type: keyof typeof FIELDS): Record<string, unknown> {
  if (type === "projects") {
    return {
      title: "", tagline: "", order: 0, year: new Date().getFullYear(),
      status: "in-development", employmentType: "personal", studio: null,
      role: "", teamSize: "Individual", duration: "", platforms: [], genres: [],
      tech: [], thumb: "", gallery: [], keyInsights: [], links: {}, snippets: [],
    };
  }
  if (type === "posts") {
    return {
      title: "", summary: "", date: today(), tags: [],
      author: "Md. Nurusshafi Evan", draft: true,
    };
  }
  return { stamp: "", title: "", org: "", detail: "", kind: "milestone", tone: "cyan", icon: "✦" };
}
