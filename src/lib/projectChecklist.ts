// Evaluates a project's content completeness and renders a markdown checklist.

export interface RawProject {
  id: string;
  data: {
    title: string;
    tagline?: string;
    thumb?: string;
    keyInsights?: string[];
    gallery?: string[];
    links?: Record<string, string | undefined>;
  };
  body: string;
}

export interface Checks {
  heroArt: boolean;
  tagline: boolean;
  keyInsightsAtLeast3: boolean;
  galleryAtLeast4: boolean;
  roleSection: boolean;
  learningsSection: boolean;
  btsSection: boolean;
  atLeastOneLink: boolean;
}

export interface ProjectEvaluation {
  id: string;
  title: string;
  checks: Checks;
}

const PLACEHOLDER_RE = /\[\s*FILL ME IN[^\]]*\]/i;

function sectionFilled(body: string, heading: string): boolean {
  const re = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "i");
  const m = body.match(re);
  if (!m) return false;
  const content = m[1].trim();
  if (content.length === 0) return false;
  if (PLACEHOLDER_RE.test(content) && content.replace(PLACEHOLDER_RE, "").trim().length === 0) {
    return false;
  }
  return true;
}

export function evaluateProject(p: RawProject): ProjectEvaluation {
  const links = p.data.links ?? {};
  return {
    id: p.id,
    title: p.data.title,
    checks: {
      heroArt: typeof p.data.thumb === "string" && p.data.thumb.length > 0,
      tagline: typeof p.data.tagline === "string" && p.data.tagline.trim().length > 0,
      keyInsightsAtLeast3: (p.data.keyInsights?.length ?? 0) >= 3,
      galleryAtLeast4: (p.data.gallery?.length ?? 0) >= 4,
      roleSection: sectionFilled(p.body, "Role & Responsibilities"),
      learningsSection: sectionFilled(p.body, "Learnings"),
      btsSection: sectionFilled(p.body, "Behind the Scenes"),
      atLeastOneLink: Object.values(links).some((v) => typeof v === "string" && v.length > 0),
    },
  };
}

const LABELS: Array<{ key: keyof Checks; label: string }> = [
  { key: "heroArt",             label: "Hero art present" },
  { key: "tagline",             label: "Tagline filled" },
  { key: "keyInsightsAtLeast3", label: "Key insights ≥ 3" },
  { key: "galleryAtLeast4",     label: "Gallery items ≥ 4" },
  { key: "roleSection",         label: "Role & Responsibilities filled" },
  { key: "learningsSection",    label: "Learnings filled" },
  { key: "btsSection",          label: "Behind the Scenes filled" },
  { key: "atLeastOneLink",      label: "At least one external link" },
];

export function renderChecklist(projects: RawProject[]): string {
  const lines: string[] = [
    "# Content Checklist",
    "",
    "_Auto-generated. Run `npm run dev` or `npm run build` to refresh._",
    "",
  ];
  for (const p of projects) {
    const ev = evaluateProject(p);
    lines.push(`## ${ev.title}`);
    lines.push("");
    for (const { key, label } of LABELS) {
      const mark = ev.checks[key] ? "x" : " ";
      lines.push(`- [${mark}] ${label}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
