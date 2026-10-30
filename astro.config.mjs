// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import remarkMath from "remark-math";
import rehypeMathJaxSvg from "rehype-mathjax";
import { unified } from "@astrojs/markdown-remark";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), mdx()],
  site: "https://dalurness.github.io",
  base: "/winter-code-fest/",
  trailingSlash: "always",
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeMathJaxSvg],
    }),
  },
});
