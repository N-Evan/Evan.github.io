import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
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
  }),
});

export const collections = { projects };
