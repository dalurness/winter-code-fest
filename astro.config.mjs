// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import remarkMath from "remark-math";
import rehypeMathJaxSvg from "rehype-mathjax";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind(), mdx()],
  site: "https://dalurness.github.io",
  base: "/winter-code-fest/",
  trailingSlash: "always",
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeMathJaxSvg],
  },
});
