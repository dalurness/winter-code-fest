// Makes the sandbox installable as an app. Its window gives the page the
// shortcuts a browser tab keeps for itself, such as Ctrl+W to close a tab.
import type { APIRoute } from "astro";

export const GET: APIRoute = () => {
  const sandbox = `${import.meta.env.BASE_URL}sandbox/`;
  return new Response(
    JSON.stringify({
      name: "Winter Code Fest Sandbox",
      short_name: "WCF Sandbox",
      description:
        "Run Winter Code Fest solutions in a Linux VM in your browser",
      id: sandbox,
      start_url: sandbox,
      scope: sandbox,
      display: "standalone",
      // Winter Night's colors; the page sets theme-color to the picked theme
      background_color: "#0d121b",
      theme_color: "#090d14",
      icons: [
        { src: `${sandbox}icons/192.png`, sizes: "192x192", type: "image/png" },
        { src: `${sandbox}icons/512.png`, sizes: "512x512", type: "image/png" },
        {
          src: `${sandbox}icons/maskable-512.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    }),
    { headers: { "Content-Type": "application/manifest+json" } }
  );
};
