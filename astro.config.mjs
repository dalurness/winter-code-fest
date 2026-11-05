// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import remarkMath from "remark-math";
import rehypeMathJaxSvg from "rehype-mathjax";
import { unified } from "@astrojs/markdown-remark";
import { createReadStream, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { SHIKI_ALIASES } from "./src/sandbox/solution-languages.ts";
import { textMate as clank } from "./src/highlight/clank.ts";

const BASE = "/winter-code-fest/";
const V86_URL = `${BASE}sandbox/v86/`;
const V86_DIR = resolve("public/sandbox/v86");

/**
 * Serves the sandbox's VM files straight from disk in dev. Vite lists public
 * files at startup, so files written by a later `npm run sandbox:image` would
 * otherwise be missing until a restart.
 * @returns {import("vite").Plugin}
 */
function sandboxFiles() {
  return {
    name: "sandbox-files",
    // Before Astro's own middleware, which answers unknown files with a 404 page
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? "").split("?")[0] ?? "");
        if (!url.startsWith(V86_URL)) return next();
        const file = resolve(V86_DIR, url.slice(V86_URL.length));
        const size = file.startsWith(V86_DIR + sep)
          ? statSync(file, { throwIfNoEntry: false })?.size
          : undefined;
        if (size === undefined) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Accept-Ranges", "bytes");
        // The page fetches single files out of a bundle, like GitHub Pages allows
        const range = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range ?? "");
        if (range) {
          const start = Number(range[1]);
          const end = Math.min(Number(range[2]), size - 1);
          res.statusCode = 206;
          res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
          res.setHeader("Content-Length", end - start + 1);
          createReadStream(file, { start, end }).pipe(res);
          return;
        }
        res.setHeader("Content-Length", size);
        createReadStream(file).pipe(res);
      });
    },
  };
}

// https://astro.build/config
export default defineConfig({
  integrations: [react(), mdx()],
  site: "https://dalurness.github.io",
  base: BASE,
  trailingSlash: "always",
  vite: {
    plugins: [tailwindcss(), sandboxFiles()],
  },
  markdown: {
    // Code blocks sit on the same light blue as the sandbox's Markdown preview.
    // Shiki ships every language the sandbox highlights but Clank.
    shikiConfig: {
      theme: "github-light",
      langs: [clank],
      langAlias: SHIKI_ALIASES,
    },
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeMathJaxSvg],
    }),
  },
});
