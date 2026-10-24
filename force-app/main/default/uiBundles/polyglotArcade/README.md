# Polyglot Arcade hub (Angular)

The Angular UI bundle of [Polyglot Arcade](../../../../../README.md): lobby, hall of fame and the Angular games, launched from the App Launcher.

| Route            | Purpose                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `/`              | Lobby built from `Arcade_Game__c`; launches hub games here and cabinet games via their App URL |
| `/leaderboard`   | Hall of fame across all games and surfaces                                                     |
| `/play/:gameKey` | A hub game's machine with its high-score card, e.g. `/play/four-in-a-row`                      |

## Structure

```
src/app/
├── api/                   Data SDK client + ArcadeApi (games, scores, leaderboards)
├── components/            app layout, leaderboard table, round result, teaser marquee,
│                          template UI kit (spartan)
├── games/                 registry, shared types, teaser marquee art (marquees.ts),
│                          one folder per game: engine.ts + machine component and styles
└── pages/                 lobby, play, leaderboard, not-found
src/arcade.css             shared arcade chrome (kept in sync with the cabinet)
src/surface.css            the hub's surface: arcade hall, magenta neon, fonts
```

## Commands

Run from this folder:

```bash
npm run dev                  # Angular dev server, data calls proxied to the default org
npm run build                # lint + production build into dist/
npx ng test --watch=false    # unit tests (game engine + components)
npm run build:e2e && npx playwright test   # end-to-end tests against the built app, no org needed
```

Deploy from the project root with `sf project deploy start --source-dir force-app/main/default/uiBundles/polyglotArcade`. The bundle is deployed with its built `dist/` folder, so build before deploying.
