import { z, defineCollection } from "astro:content";

const daysCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
  }),
});

const communitySolutionsCollection = defineCollection({
  type: "content",
  schema: z.object({
    descriptions: z.array(z.string()),
  }),
})

export const collections = {
  days: daysCollection,
  communitySolutions: communitySolutionsCollection,
};
