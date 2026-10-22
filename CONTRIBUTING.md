# Contributing

Thanks for your interest in improving Polyglot Arcade! 🕹️

## How this project is organized

| Part                          | Where                                             | Tests                                       |
| ----------------------------- | ------------------------------------------------- | ------------------------------------------- |
| Angular hub                   | `force-app/main/default/uiBundles/polyglotArcade` | `npx ng test --watch=false`, Playwright e2e |
| React cabinet                 | `force-app/main/default/uiBundles/pixelCabinet`   | `npx vitest run`, Playwright e2e            |
| Lightning Web Components      | `force-app/main/default/lwc`                      | `npm run test:unit` (Jest + sa11y)          |
| Data model and other metadata | `force-app/main/default`                          | deploy to a scratch org                     |

See the [README](README.md) for the architecture and the setup of a scratch org.

## Proposing changes

1. Open an issue describing the problem or idea first, so we can align on the approach.
2. Fork the repository and create a feature branch.
3. Keep changes focused and follow the conventions of the existing code:
   - Game rules live in a framework-free `engine.ts` with unit tests; the React or Angular component only renders and handles input.
   - Data access goes through `arcadeApi.ts` (React) or `ArcadeApi` (Angular) - GraphQL operations are validated against the org schema by `npm run graphql:codegen`.
   - The arcade theme (`arcade.css`) exists in both bundles - change both copies together.
   - All UI texts, code and docs are in English.
4. Make sure formatting, linting and tests pass - the [Validation workflow](.github/workflows/ci.yml) runs the same checks on every pull request.
5. Use [Conventional Commits](https://www.conventionalcommits.org/) with a scope, e.g. `feat(cabinet): add pellet chase ghosts` or `fix(hub): disable full columns`.
6. Open a pull request and link the related issue.

## Adding a game

A new game needs a `Arcade_Game__c` seed record in `force-app/main/default/data/Arcade_Game__c.json` (unique `Game_Key__c`), an entry in the registry of the bundle it lives in, and an engine with unit tests. Names and artwork must not use trademarks of the original arcade titles.

## Code of conduct

Be respectful and constructive. This is a community project for the Trailblazer Community - let's keep it welcoming.
