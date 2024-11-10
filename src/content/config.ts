import { z, defineCollection } from "astro:content";

const daysCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
  }),
});

const communitySolutionsCollection = defineCollection({
  type: "content"
})

export const collections = {
  days: daysCollection,
  communitySolutions: communitySolutionsCollection,
};
