# Pixel Cabinet (React)

The React UI bundle of [Polyglot Arcade](../../../../../README.md): the real-time games, launchable from the App Launcher and embeddable in Lightning pages as a microfrontend through the `arcadeGameHost` LWC.

| Route            | Purpose                                                                              |
| ---------------- | ------------------------------------------------------------------------------------ |
| `/`              | No lobby of its own: sends the player to the Polyglot Arcade hub lobby               |
| `/play/:gameKey` | A game's machine with its high-score card, e.g. `/play/block-drop`                   |
| `/embed`         | Compact machine framed by `<lightning-ui-embedding>`; the game comes from host props |

## Structure

```
src/
├── api/            Data SDK access: games, scores, leaderboards (GraphQL)
├── cabinet/        Layouts (standalone + embed), GameStage, RoundResult, Leaderboard
├── embedding/      View SDK bridge: host props in, gameover event out
├── games/          registry, shared types, one folder per game:
│                   engine.ts (rules) + component (machine) + machine.css (its look)
├── pages/          GamePage, HubRedirect, NotFound
└── styles/         Tailwind base, shared arcade.css, surface.css (the machine room)
```

## Commands

Run from this folder:

```bash
npm run dev          # Vite dev server, data calls proxied to the default org
npm run build        # type check + production build into dist/
npm run lint         # ESLint (incl. GraphQL operations once schema.graphql exists)
npx vitest run       # unit tests (game engines)
npm run build:e2e && npx playwright test   # end-to-end, axe and touch tests against the built app, no org needed
```

Deploy from the project root with `sf project deploy start --source-dir force-app/main/default/uiBundles/pixelCabinet`. The bundle is deployed with its built `dist/` folder, so build before deploying.
