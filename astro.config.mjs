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
        res.setHeader("Content-Length", size);
        res.setHeader("Cache-Control", "no-cache");
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
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeMathJaxSvg],
    }),
  },
});
