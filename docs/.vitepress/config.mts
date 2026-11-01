import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';
import llmstxt from 'vitepress-plugin-llms';
import { absolutizeFile } from '../../scripts/docs/llms-links.mjs';

const title = 'Polyglot Arcade';
const description =
  'A retro arcade on the Salesforce Platform that shows Salesforce Multi-Framework end to end: Angular, React and LWC sharing CRM data.';
const siteUrl = 'https://svierk.github.io/polyglot-arcade/';
const base = '/polyglot-arcade/';
const repo = 'https://github.com/svierk/polyglot-arcade';
const repoBlob = `${repo}/blob/main/`;
// The screenshots live in images/ at the repository root, shared with the README.
const screenshots = fileURLToPath(new URL('../../images/', import.meta.url));

export default defineConfig({
  title,
  description,
  lang: 'en-US',
  base,
  cleanUrls: true,
  lastUpdated: true,
  // Head link hrefs are not base-adjusted, so they include the base prefix.
  // The Open Graph tags reuse the GitHub social preview image so shared links to
  // the docs look the same as shared links to the repository.
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}images/polyglot-arcade-logo.svg` }],
    ['link', { rel: 'apple-touch-icon', href: `${base}images/polyglot-arcade-touch-icon.png` }],
    ['meta', { name: 'theme-color', content: '#07071a' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: siteUrl }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:image', content: `${siteUrl}images/polyglot-arcade-social-preview.png` }],
    ['meta', { property: 'og:image:width', content: '1280' }],
    ['meta', { property: 'og:image:height', content: '640' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }]
  ],
  vite: {
    // AI-friendly docs: llms.txt (an index of the site), llms-full.txt (every
    // page in one file) and a Markdown copy of each page next to its HTML, for
    // agents that read the docs while they work. Its `domain` option is left
    // out on purpose: it also rewrites links inside the pages, and mangles them
    // under a base path - buildEnd below makes them absolute instead.
    plugins: [
      llmstxt(),
      // Pages show the README's screenshots as /images/<file> - the path GitHub
      // resolves from the repository root too. Resolve it to images/ instead of
      // the public directory, so Vite bundles them like any other asset (a
      // relative ../images path loses the base path in the dev server).
      {
        name: 'polyglot-arcade-screenshots',
        enforce: 'pre',
        resolveId(id) {
          const file = id.startsWith('/images/') && join(screenshots, id.slice('/images/'.length));
          return file && existsSync(file) ? file : null;
        }
      }
    ],
    // mermaid's own chunks are up to ~700 kB each, but they are only fetched by
    // pages that render a diagram (see theme/mermaid.ts). Raise the warning
    // limit above them so it still flags growth in the shared bundle.
    build: {
      chunkSizeWarningLimit: 800
    }
  },
  markdown: {
    config: (md) => {
      // ```mermaid fences become <MermaidDiagram>, which loads mermaid only when
      // a page with a diagram mounts. GitHub renders the same fences from the
      // Markdown source. URI-encoding keeps the source intact as a prop.
      const defaultFence = md.renderer.rules.fence!;
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        if (token.info.trim() === 'mermaid') {
          return `<MermaidDiagram code="${encodeURIComponent(token.content)}" />`;
        }
        return defaultFence(tokens, idx, options, env, self);
      };

      // custom.css stretches tables to the content width (display: table), which
      // drops the default theme's horizontal scrolling - on a phone a wide table
      // widened the whole page. Give every table its own scroll container;
      // tabindex keeps it keyboard-scrollable.
      md.renderer.rules.table_open = () => '<div class="table-scroll" tabindex="0"><table>\n';
      md.renderer.rules.table_close = () => '</table>\n</div>\n';

      // The pages link to files outside the docs root (e.g. ../force-app/...,
      // ../../README.md in the ADRs) - correct when viewed on GitHub, but 404 on
      // the site. Rewrite those to absolute GitHub URLs so they resolve either way.
      const defaultRender =
        md.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const hrefIndex = token.attrIndex('href');
        if (hrefIndex >= 0) {
          const href = token.attrs[hrefIndex][1];
          const target = outsideDocs(href, env.relativePath);
          if (target) token.attrs[hrefIndex][1] = repoBlob + target;
        }
        return defaultRender(tokens, idx, options, env, self);
      };
    }
  },
  // The Markdown copies are read on their own, so their relative and
  // root-relative links would resolve against nothing - see
  // scripts/docs/llms-links.mjs. llms.txt itself only links pages, by path.
  buildEnd({ outDir, srcDir }) {
    const isFile = (path) => existsSync(join(srcDir, path));
    for (const file of readdirSync(outDir, { recursive: true })) {
      if (!/\.md$|^llms-full\.txt$/.test(file)) continue;
      const path = join(outDir, file);
      writeFileSync(path, absolutizeFile(readFileSync(path, 'utf-8'), { base, isFile, siteUrl, repoBlob }));
    }
    const index = join(outDir, 'llms.txt');
    writeFileSync(index, readFileSync(index, 'utf-8').replaceAll(`](${base}`, `](${siteUrl}`));
  },
  themeConfig: {
    logo: '/images/polyglot-arcade-logo.svg',
    // No "Home" or "GitHub" entries: the logo already links home and the GitHub
    // icon covers the repository.
    nav: [
      { text: 'Concepts', link: '/concepts', activeMatch: '^/concepts' },
      { text: 'Architecture', link: '/architecture/', activeMatch: '^/architecture/' },
      { text: 'Games', link: '/games', activeMatch: '^/games' },
      { text: 'Deploy', link: '/deploy/', activeMatch: '^/deploy/' },
      { text: 'Build', link: '/build-your-own-game', activeMatch: '^/(build-your-own-game|development)' }
    ],
    sidebar: [
      {
        text: 'Start',
        items: [
          { text: 'Concepts', link: '/concepts' },
          { text: 'Games', link: '/games' }
        ]
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Surfaces and roles', link: '/architecture/' },
          { text: 'Integration patterns', link: '/architecture/patterns' },
          { text: 'Headless surface', link: '/architecture/headless' },
          { text: 'Communication', link: '/architecture/communication' },
          { text: 'Data model', link: '/architecture/data-model' }
        ]
      },
      {
        text: 'Deploy',
        items: [
          { text: 'Set up an org', link: '/deploy/' },
          { text: 'Upgrade', link: '/deploy/upgrade' },
          { text: 'Troubleshooting', link: '/deploy/troubleshooting' }
        ]
      },
      {
        text: 'Build',
        items: [
          { text: 'Build your own game', link: '/build-your-own-game' },
          { text: 'Development', link: '/development' }
        ]
      },
      {
        text: 'Decisions',
        collapsed: true,
        items: [
          { text: 'Overview', link: '/decisions/' },
          { text: '0001 · Surface roles', link: '/decisions/0001-surface-roles' },
          { text: '0002 · Surfaces and machines', link: '/decisions/0002-surfaces-and-machines' },
          { text: '0003 · Headless surface', link: '/decisions/0003-headless-surface' }
        ]
      }
    ],
    outline: [2, 3],
    search: {
      provider: 'local'
    },
    socialLinks: [{ icon: 'github', link: repo }],
    editLink: {
      pattern: `${repo}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub'
    },
    footer: {
      message: `Released under the MIT License. Not affiliated with or endorsed by Salesforce. · <a href="${base}llms.txt">llms.txt</a> for AI agents`,
      copyright: 'Copyright © Sebastiano Schwarz'
    }
  }
});

/**
 * The repository path of a link that leaves the docs root, or null. Relative
 * links are resolved against the page (`architecture/patterns.md`).
 */
function outsideDocs(href: string, page: string): string | null {
  if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(href)) return null;
  const parts = ['docs', ...page.split('/').slice(0, -1)];
  for (const part of href.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  return parts[0] === 'docs' ? null : parts.join('/');
}
