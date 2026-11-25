// The site's pages, for the breadcrumbs of the sandbox's page tabs: each
// part lists the pages beside it, such as the other days or the day's other
// solutions (src/sandbox/main.ts).
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import type { SitePages } from "../../sandbox/content";

export const GET: APIRoute = async () => {
  const solutions = await getCollection("communitySolutions");
  const days = (await getCollection("days"))
    .toSorted((a, b) => a.id.localeCompare(b.id))
    .map((entry) => ({
      id: entry.id,
      title: entry.data.title,
      solutions: solutions
        .filter((s) => s.id.startsWith(`${entry.id}/`))
        .map((s) => s.id.split("/")[1]!)
        .toSorted((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
    }));
  const pages: SitePages = { days };
  return new Response(JSON.stringify(pages), {
    headers: { "Content-Type": "application/json" },
  });
};
