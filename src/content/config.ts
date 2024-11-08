import { z, defineCollection } from "astro:content";

const daysCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = {
  days: daysCollection,
};
