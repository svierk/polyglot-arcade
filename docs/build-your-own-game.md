---
description: Add a game to Polyglot Arcade - in the Angular hub, in the React cabinet, or as an externally hosted guest on a Lightning page - step by step.
---

# Build your own game

A new game picks one of three homes. Where it lives decides its [integration pattern](/architecture/patterns), and the pattern decides what it needs:

| Home                                                                    | Patterns | Saves its rounds        | Can be framed in Lightning    |
| ----------------------------------------------------------------------- | -------- | ----------------------- | ----------------------------- |
| [In the hub](#in-the-hub) - Angular                                     | 1        | itself, Data SDK        | no                            |
| [In the cabinet](#in-the-cabinet) - React                               | 2, 3     | itself, Data SDK        | yes, at `/embed`              |
| [As an external guest](#as-an-external-guest) - any framework, any host | 4        | the host LWC saves them | yes, that is how it is played |

Whatever the home, every game brings the same four things:

- **A game record** in [`Arcade_Game__c.json`](../force-app/main/default/data/Arcade_Game__c.json) with a unique `Game_Key__c` - the key ties the record, the registries and the marquee together. `npm run setup` upserts it by that key.
- **A framework-free engine** (`engine.ts`) with unit tests. The component only renders and handles input.
- **A machine of its own**: cabinet, screen, HUD, controls, result screen and high-score card in the game's look ([ADR 0002](/decisions/0002-surfaces-and-machines)). Names and artwork must not use trademarks of the original arcade titles; a new font from npm goes into [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).
- **A teaser marquee** for its lobby card: pixel art in the hub's [`marquees.ts`](../force-app/main/default/uiBundles/polyglotArcade/src/app/games/marquees.ts), keyed by `Game_Key__c`. A game without one keeps the plain card.

The [headless surface](/architecture/headless) needs nothing extra: the Hall of Fame and player card tools read every active game record, so a new game shows up in the chat with its first round. If its name is not unique enough to ask for, players can use its `Game_Key__c`.

The [Tech X-ray](/architecture/patterns#tech-x-ray) needs nothing: the hub derives it from the game record.

## In the hub

An Angular game in `force-app/main/default/uiBundles/polyglotArcade`, launched from the lobby at `/play/<key>`.

1. **Game record** with `"Framework__c": "Angular"`. The setup's connect step stores the hub URL in `App_Url__c` of every Angular game.
2. **Engine** in `src/app/games/<key>/engine.ts` with `engine.spec.ts`.
3. **Component** in `src/app/games/<key>/`: it emits a `gameOver` output with a `GameResult` (`score`, `level`, `durationSeconds`, `summary`) and projects the result screen with `<ng-content>`. Machine styles stay in the component styles, scoped to its element (`ViewEncapsulation.None`).
4. **Registry:** add `{ key, name, available: true }` to `HUB_GAMES` in [`games/registry.ts`](../force-app/main/default/uiBundles/polyglotArcade/src/app/games/registry.ts).
5. **Play page:** add a `@case ('<key>')` for the component in [`pages/play/play.html`](../force-app/main/default/uiBundles/polyglotArcade/src/app/pages/play/play.html) and import it in `play.ts`. The page saves the round, announces it and shows the leaderboard.
6. **Teaser marquee** in `games/marquees.ts`.

## In the cabinet

A React game in `force-app/main/default/uiBundles/pixelCabinet`. The hub launches it at `/play/<key>`, and Lightning can frame it at `/embed` - on the Arcade Account page or any page with an Arcade Game Host.

1. **Game record** with `"Framework__c": "React"` and `"Embed_Path__c": "/embed"`. The connect step stores the cabinet URL in `App_Url__c` of every React game.
2. **Engine** in `src/games/<key>/engine.ts` with `engine.test.ts`.
3. **Component** `src/games/<key>/<Name>.tsx` that takes `GameProps`: call `onGameOver` with a `GameResult` when a round ends, show the `result` node on the machine's screen, and use `highScore` for the HUD. The machine's look goes into `machine.css` next to it.
4. **Registry:** add the key to `GameKey` in [`games/types.ts`](../force-app/main/default/uiBundles/pixelCabinet/src/games/types.ts) and an entry to `CABINET_GAMES` in [`games/registry.ts`](../force-app/main/default/uiBundles/pixelCabinet/src/games/registry.ts). The stage saves the round with the player's session - `Source__c` is `Pixel Cabinet` standalone and `Embedded` in a frame - and tells the host when it is framed.
5. **Host LWC:** add the key to the `datasource` of the `game` property in [`arcadeGameHost.js-meta.xml`](../force-app/main/default/lwc/arcadeGameHost/arcadeGameHost.js-meta.xml), so admins can pick it in Lightning App Builder. The cabinet's game picker on the Arcade Account page lists it anyway, and the lobby links that page from its card.
6. **Teaser marquee** in the hub's `games/marquees.ts`.

## As an external guest

Any web app, in any framework, on any host - like the [LWC OSS Snake](https://github.com/svierk/lwc-oss-snake-game) on Vercel. It has no Salesforce session, so it only reports its rounds and the Arcade Game Host saves them.

1. **Talk to the host.** When a round ends, dispatch a `gameover` event with `{ score, level, durationSeconds }` to the host:
   - If your app can load `@salesforce/platform-sdk`, use the View SDK: `getViewSDK()` → `dispatchEvent(new CustomEvent('gameover', { detail }))`.
   - If it cannot - like LWR for LWC OSS - implement the guest side of the [package-free bridge](https://developer.salesforce.com/docs/platform/microfrontend/guide/package-free-bridge.html). The Snake's [`snake/embedding`](https://github.com/svierk/lwc-oss-snake-game/tree/main/src/modules/snake/embedding) is a working example, see [Communication](/architecture/communication#package-free-bridge).

   Report the height of the game with `ui/notifications/resize`, so the frame fits it. The host saves only whole, non-negative scores, always for the game record it embeds.

2. **Allow framing.** Your host must not forbid framing (`X-Frame-Options` or a `frame-ancestors` that excludes the org).
3. **Game record** with your framework in `Framework__c` (add a value to the picklist if it is not `React`, `Angular` or `LWC OSS`), your URL in `App_Url__c` and `"Host_Saves_Score__c": true`.
4. **CSP Trusted Site** with your URL for frame-src - copy [`Snake_Vercel`](../force-app/main/default/cspTrustedSites/Snake_Vercel.cspTrustedSite-meta.xml).
5. **Host LWC:** add the key to the `datasource` of the `game` property in [`arcadeGameHost.js-meta.xml`](../force-app/main/default/lwc/arcadeGameHost/arcadeGameHost.js-meta.xml).
6. **A page on the Arcade Floor:** an app page with **Arcade Game Host** (your game) and **Arcade Leaderboard** - copy [`Arcade_Snake`](../force-app/main/default/flexipages/Arcade_Snake.flexipage-meta.xml) and its tab, add the tab to the [Arcade Floor app](../force-app/main/default/applications/arcadeFloor.app-meta.xml) and to the permission set.
7. **Lobby link:** add the key and the tab to `ARCADE_FLOOR_TABS` in the hub's [`pages/lobby/lobby.ts`](../force-app/main/default/uiBundles/polyglotArcade/src/app/pages/lobby/lobby.ts), so the lobby card opens the page.
8. **Teaser marquee** in the hub's `games/marquees.ts`.

To try the guest before it is deployed, run it locally, trust the dev server's URL the same way and set the host's **App URL** property to it - see [Development](/development#embed-a-local-game).

## Before you open a pull request

- Keyboard and touch controls, a labeled board, and the end of a round announced through the stage's live region. The axe checks (WCAG 2.1 AA) and the `@touch` tests in each bundle's `e2e/` folder cover new pages and machines too.
- Formatting, linting and tests pass - see [Development](/development#tests-and-checks).
- The [contributing guide](../CONTRIBUTING.md) has the conventions.
