import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const daysCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/days" }),
  schema: z.object({
    title: z.string(),
  }),
});

const communitySolutionsCollection = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/communitySolutions",
  }),
  schema: z.object({
    descriptions: z.array(z.string()),
  }),
});

export const collections = {
  days: daysCollection,
  communitySolutions: communitySolutionsCollection,
};
