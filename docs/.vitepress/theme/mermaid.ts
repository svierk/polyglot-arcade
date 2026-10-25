/**
 * Shared, lazy entry point to mermaid for the theme components.
 *
 * mermaid is around 700 kB, so it is imported on first use instead of being
 * bundled into the app - pages without a diagram never download it. Renders
 * are chained because mermaid.initialize() is global: two diagrams rendering
 * at once would otherwise pick up each other's config.
 */
import type { MermaidConfig } from "mermaid";

// Diagrams color the surfaces via classDef; these variables cover the rest -
// edges, edge labels, subgraphs and plain nodes. They mirror the surfaces of
// theme/custom.css (the arcade night in dark mode), so keep the two in step.
const THEMES: Record<"light" | "dark", MermaidConfig> = {
  light: {
    theme: "base",
    themeVariables: {
      background: "#ffffff",
      primaryColor: "#f6f6f7",
      primaryBorderColor: "#9aa0a6",
      primaryTextColor: "#3c3c43",
      textColor: "#3c3c43",
      lineColor: "#67676c",
      edgeLabelBackground: "#ffffff",
      clusterBkg: "#f6f6f7",
      clusterBorder: "#d5d5db"
    }
  },
  dark: {
    theme: "base",
    themeVariables: {
      darkMode: true,
      background: "#07071a",
      primaryColor: "#16163a",
      primaryBorderColor: "#3f3f74",
      primaryTextColor: "#e2e8f0",
      textColor: "#e2e8f0",
      lineColor: "#94a3b8",
      edgeLabelBackground: "#07071a",
      clusterBkg: "#0d0d26",
      clusterBorder: "#2a2a55"
    }
  }
};

let mermaid: typeof import("mermaid").default | undefined;
let queue: Promise<unknown> = Promise.resolve();
let renderCount = 0;

export function renderMermaid(
  source: string,
  isDark: boolean
): Promise<string> {
  const job = queue.then(async () => {
    mermaid ??= (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      // mermaid sizes each label box at line-height 1.5, but the label is a <p>
      // and `.vp-doc p` sets 28px - a three-line label then overflows its box
      // and is clipped. themeCSS is scoped to the diagram's id, so it wins.
      themeCSS: "p { line-height: inherit; }",
      ...THEMES[isDark ? "dark" : "light"]
    });
    const { svg } = await mermaid.render(`mermaid-${renderCount++}`, source);
    return svg;
  });
  // A failed render must not block the ones queued behind it.
  queue = job.catch(() => {});
  return job;
}
