// Collection schemas, defined against `zod` directly rather than the `z`
// re-exported from `astro:content`, so the studio dev server can load this
// module with Vite's ssrLoadModule without Astro's virtual modules in scope.
import { z } from "zod";

export const postSchema = z.object({
  title: z.string(),
  summary: z.string().max(220),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  cover: z.string().optional(),
  draft: z.boolean().default(false),
  author: z.string().default("Md. Nurusshafi Evan"),
});

export const projectSchema = z.object({
  title: z.string(),
  order: z.number(),
  year: z.number(),
  status: z.enum(["shipped", "in-development", "concept"]),
  studio: z.string().nullable().optional(),
  employmentType: z.enum(["employee", "personal", "freelance"]),
  platforms: z.array(z.string()).min(1),
  teamSize: z.union([z.number(), z.literal("Individual")]),
  duration: z.string(),
  role: z.string(),
  tagline: z.string().max(140),
  thumb: z.string(),
  genres: z.array(z.string()).optional(),
  tech: z.array(z.string()).min(1),
  links: z
    .object({
      steam: z.string().url().optional(),
      itch: z.string().url().optional(),
      github: z.string().url().optional(),
      youtube: z.string().url().optional(),
      website: z.string().url().optional(),
      googleplay: z.string().url().optional(),
      appstore: z.string().url().optional(),
    })
    .partial()
    .optional(),
  keyInsights: z.array(z.string()).max(4).optional(),
  gallery: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  snippets: z
    .array(
      z.object({
        title: z.string(),
        language: z.string(),
        code: z.string(),
        caption: z.string().optional(),
      })
    )
    .optional(),
});

export const careerSchema = z.object({
  stamp: z.string(),
  title: z.string(),
  org: z.string().optional(),
  detail: z.string(),
  tone: z.enum(["magenta", "cyan", "yellow"]),
  kind: z.enum(["role", "milestone", "education"]),
  icon: z.string().optional(),
});

export const SCHEMAS = {
  projects: projectSchema,
  posts: postSchema,
  career: careerSchema,
} as const;
