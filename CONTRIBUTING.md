# Contributing

Thanks for your interest in improving Polyglot Arcade! 🕹️

## How this project is organized

| Part                          | Where                                             | Tests                                                             |
| ----------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| Angular hub                   | `force-app/main/default/uiBundles/polyglotArcade` | `npx ng test --watch=false`, Playwright e2e (incl. axe and touch) |
| React cabinet                 | `force-app/main/default/uiBundles/pixelCabinet`   | `npx vitest run`, Playwright e2e (incl. axe and touch)            |
| Lightning Web Components      | `force-app/main/default/lwc`                      | `npm run test:unit` (Jest + sa11y)                                |
| Data model and other metadata | `force-app/main/default`                          | deploy to a scratch org                                           |

See the [README](README.md) for the architecture and the setup of a scratch org.

## Proposing changes

1. Open an issue describing the problem or idea first, so we can align on the approach.
2. Fork the repository and create a feature branch.
3. Keep changes focused and follow the conventions of the existing code:
   - Game rules live in a framework-free `engine.ts` with unit tests; the React or Angular component only renders and handles input.
   - Data access goes through `arcadeApi.ts` (React) or `ArcadeApi` (Angular) - GraphQL operations are validated against the org schema by `npm run graphql:codegen`.
   - Same hall, different machines: `arcade.css` (tokens, marquee bar, round result and high-score markup) exists in both bundles - change both copies together. Each bundle's `surface.css` holds its own surface color and room, each game's look lives in its folder (`machine.css` in React, the component styles in Angular). Fonts come from npm packages under an open license and are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
   - Accessible and touchable: every game can be played with a keyboard and by touch, has a labeled board and reports the end of a round through the stage's live region. The axe checks (WCAG 2.1 AA) and the `@touch` tests in each bundle's `e2e/` folder cover new pages and machines too.
   - The Tech X-ray is derived from the game record (`xray.ts` in the hub) and uses the pattern names of the README; a new kind of integration needs a new pattern there and in the README.
   - All UI texts, code and docs are in English.
4. Make sure formatting, linting and tests pass - the [Validation workflow](.github/workflows/ci.yml) runs the same checks on every pull request.
5. Use [Conventional Commits](https://www.conventionalcommits.org/) with a scope, e.g. `feat(cabinet): add pellet chase ghosts` or `fix(hub): disable full columns`.
6. Open a pull request and link the related issue.

## Adding a game

A new game needs a `Arcade_Game__c` seed record in `force-app/main/default/data/Arcade_Game__c.json` (unique `Game_Key__c`), an entry in the registry of the bundle it lives in, an engine with unit tests, keyboard and touch controls, and a machine that passes the axe checks. Names and artwork must not use trademarks of the original arcade titles.

## Code of conduct

Be respectful and constructive. This is a community project for the Trailblazer Community - let's keep it welcoming.
