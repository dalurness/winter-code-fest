import { marked } from "marked";
import { normalize } from "./files";

/**
 * Renders a Markdown file into `element`. Relative links (a question's input
 * files) call `open` with the resolved VM path instead of navigating.
 */
export function renderMarkdown(
  element: HTMLElement,
  text: string,
  path: string,
  open: (path: string) => void
) {
  // The questions start with YAML frontmatter; show its title as the heading
  let title = "";
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatter) {
    title = frontmatter[1]?.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? "";
    text = text.slice(frontmatter[0].length);
  }

  element.innerHTML =
    (title ? `<h1>${escapeHtml(title)}</h1>` : "") +
    marked.parse(text, { async: false });

  const dir = path.slice(0, path.lastIndexOf("/"));
  for (const link of element.querySelectorAll("a")) {
    const href = link.getAttribute("href") ?? "";
    if (/^[a-z]+:/i.test(href) || href.startsWith("#")) {
      link.target = "_blank";
      link.rel = "noopener";
    } else {
      link.onclick = (event) => {
        event.preventDefault();
        open(normalize(href.startsWith("/") ? href : `${dir}/${href}`));
      };
    }
  }
}

function escapeHtml(text: string) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
