import { z, defineCollection } from "astro:content";

const daysCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    solutions: z.record(z.string(), z.string()),
  }),
});

export const collections = {
  days: daysCollection,
};
