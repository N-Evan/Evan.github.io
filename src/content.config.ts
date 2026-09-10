import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { postSchema, projectSchema } from "./content/schemas";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: postSchema,
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: projectSchema,
});

export const collections = { projects, posts };
