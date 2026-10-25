---
description: Develop Polyglot Arcade locally - dev servers for both UI bundles, embedding a local game in Lightning, tests and checks, CI and the docs site.
---

# Development

Each UI bundle is a regular Angular or React project with its own `package.json`. The SFDX project around them holds the LWCs, the metadata and the setup scripts.

## Dev servers

```bash
cd force-app/main/default/uiBundles/pixelCabinet && npm run dev     # React cabinet (Vite)
cd force-app/main/default/uiBundles/polyglotArcade && npm run dev   # Angular hub
```

Both dev servers proxy data calls to your default org:

```bash
sf config set target-org=polyglot-arcade
```

## Embed a local game

To embed a local game in Lightning while you iterate, deploy the development-only trusted sites for the cabinet (`http://localhost:5173`) and the Snake (`yarn dev` in the Snake repository, `http://localhost:3000`) and set the host's **App URL** property to the dev server:

```bash
sf project deploy start --source-dir dev
```

Chrome's Local Network Access checks can block a Salesforce page from framing `localhost` (`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`); allow local network access for the org's domain in the site settings.

## Tests and checks

The [Validation workflow](../.github/workflows/ci.yml) runs all of them on every push and pull request, no org required:

| Scope         | Command                                                                                    | What it covers                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| SFDX project  | `npm run prettier:verify` · `npm run lint` · `npm run test:unit`                           | formatting, LWC linting, LWC Jest + accessibility (sa11y)                                             |
| React cabinet | `npm run lint` · `npx vitest run` · `npm run build:e2e && npx playwright test`             | game engines, production build, end-to-end play, accessibility (axe), touch at 375 px                 |
| Angular hub   | `npm run build` · `npx ng test --watch=false` · `npm run build:e2e && npx playwright test` | game engines, lobby launch targets, Tech X-ray, end-to-end play, accessibility (axe), touch at 375 px |
| Docs site     | `npm run test:docs` · `npm run docs:build`                                                 | link handling of the Markdown copies, the site builds without dead links                              |

The Playwright tests of both bundles run in two projects: `chromium` on a desktop window, including the [axe](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) checks against WCAG 2.1 AA, and `mobile` (Chromium's phone emulation, tests tagged `@touch`) for touch play and layouts at 375 px. The hub's tests answer the Data SDK's calls with the seed games, so the lobby and the Tech X-ray are tested without an org.

GraphQL operations are validated against your org's schema with `npm run graphql:codegen` inside each bundle.

## Release acceptance in a real org

The [Scratch Org Setup workflow](../.github/workflows/scratch-org.yml) creates a fresh scratch org, runs `npm run setup`, records a round, runs the setup again and checks that the round survived. It runs on release tags and manually (**Actions → Scratch Org Setup → Run workflow**), so it does not use up the Dev Hub's scratch org limit, and needs a JWT login to a Dev Hub: the repository secrets `SFDX_CONSUMER_KEY` and `SFDX_JWT_SECRET_KEY` and the repository variable `SFDX_USERNAME`.

## This site

The docs are a [VitePress](https://vitepress.dev) site in `docs/`, with the same stack as the [Salesforce DevOps Starter Kit](https://svierk.github.io/salesforce-devops-starter-kit/):

```bash
npm run docs:dev       # local dev server with hot reload
npm run docs:build     # production build into docs/.vitepress/dist
npm run docs:preview   # serve the production build
```

- Every page is hand-written Markdown. Screenshots come from `images/`, the same files the README shows, so there is one set of them.
- Mermaid code fences render as diagrams on the site and on GitHub alike; mermaid is only loaded by pages that have one.
- Links to files outside `docs/` (e.g. `../force-app/...`) point to GitHub on the site.
- [`vitepress-plugin-llms`](https://github.com/okineadev/vitepress-plugin-llms) writes [`llms.txt`](https://svierk.github.io/polyglot-arcade/llms.txt), `llms-full.txt` and a Markdown copy of each page for AI agents.
- The game cards on [Games](/games) draw the teaser marquees from the hub's own `marquees.ts`.

The [Docs workflow](../.github/workflows/docs.yml) builds the site on every push to `main` that touches it and deploys it to GitHub Pages.

## Contributing

Contributions are welcome - new games, fixes and ideas for further integration patterns. The [contributing guide](../CONTRIBUTING.md) has the conventions; [Build your own game](/build-your-own-game) walks through a new game.
