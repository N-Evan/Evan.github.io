import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { careerSchema, postSchema, projectSchema } from "./content/schemas";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: postSchema,
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: projectSchema,
});

// Array order in career.json is the display order — newest first.
const career = defineCollection({
  loader: file("src/data/career.json"),
  schema: careerSchema,
});

export const collections = { projects, posts, career };
