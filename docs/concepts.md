---
description: Salesforce Multi-Framework in a nutshell - UI bundles, the Data SDK, microfrontends, the View SDK and the package-free bridge - plus the Headless Experience Layer that brings the same data to AI clients, and where each one lives in Polyglot Arcade.
---

# Concepts

Salesforce Multi-Framework lets teams build Salesforce apps with the frameworks they already know. Business demos of it tend to look alike - a list, a form, a detail page. Games stress a framework differently: a game loop, canvas rendering, keyboard focus inside an iframe, state that has to survive a reload as CRM data.

Polyglot Arcade turns that into a playful reference project. Each framework is used where it fits, and every concept of Multi-Framework shows up in a place you can play. The same data also reaches AI clients through the Headless Experience Layer - a surface without a UI of its own.

## Multi-Framework in a nutshell

| Concept                             | What it means                                                                                                                                                                       | Where to look                                                                                                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI bundle** (`UIBundle` metadata) | A React or Angular app built with its usual tooling, deployed as metadata and launched from the App Launcher on its own `*.salesforce.app` domain, isolated from Lightning          | [`polyglotArcade`](../force-app/main/default/uiBundles/polyglotArcade) (Angular), [`pixelCabinet`](../force-app/main/default/uiBundles/pixelCabinet) (React)                                             |
| **Data SDK**                        | `createDataSDK()` from `@salesforce/platform-sdk`: UI API GraphQL queries and mutations with the user's session; object and field security and sharing are enforced by the platform | [`arcade-api.service.ts`](../force-app/main/default/uiBundles/polyglotArcade/src/app/api/arcade-api.service.ts), [`arcadeApi.ts`](../force-app/main/default/uiBundles/pixelCabinet/src/api/arcadeApi.ts) |
| **Microfrontend**                   | The `<lightning-ui-embedding>` base component frames an app inside an LWC on a Lightning page                                                                                       | [`arcadeGameHost`](../force-app/main/default/lwc/arcadeGameHost)                                                                                                                                         |
| **View SDK**                        | Inside the frame, `getViewSDK()` reads the host's `props` and dispatches events back to the page                                                                                    | [`hostBridge.ts`](../force-app/main/default/uiBundles/pixelCabinet/src/embedding/hostBridge.ts)                                                                                                          |
| **Package-free bridge**             | The same host protocol without `@salesforce/platform-sdk` (`postMessage` handshake, then JSON-RPC over a `MessagePort`) for guests that cannot load the SDK                         | [`snake/embedding`](https://github.com/svierk/lwc-oss-snake-game/tree/main/src/modules/snake/embedding) in the Snake repository                                                                          |

React and Angular are generally available for UI bundles as of Winter '27. Embedding an **internally hosted** bundle (served from `*.salesforce.app`) is currently in beta and supports React; any **externally hosted** app can be embedded regardless of framework. That is why the embeddable games of the org live in the React cabinet - and why an LWC OSS app on Vercel can join as well.

## Headless Experience Layer in a nutshell

The **Headless Experience Layer** (HXL, beta) is the counterpart to UI bundles: no app at all, only a declaration of what to show. AI clients such as Claude, ChatGPT and Slackbot render it natively.

| Concept                       | What it means                                                                                                                            | Where to look                                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Widget** (`UiWidgetBundle`) | A UI declared in JSON from `tile/*` components, with bindings, loops, conditions and formulas, and a schema of the attributes it accepts | [`uiWidgets`](../force-app/main/default/uiWidgets)                                                                                                                                |
| **Invocable action**          | The Apex method that reads the data, as the user who asks                                                                                | [`ArcadeHallOfFame.cls`](../force-app/main/default/classes/ArcadeHallOfFame.cls), [`ArcadePlayerCard.cls`](../force-app/main/default/classes/ArcadePlayerCard.cls)                |
| **Custom Lightning type**     | Types the action's result and maps it onto the widget's attributes (`renderer.json`)                                                     | [`lightningTypes`](../force-app/main/default/lightningTypes)                                                                                                                      |
| **Custom MCP server**         | Hosted by Salesforce: offers the actions as MCP tools and links each tool to its widget, which clients render as an MCP App              | [`polyglotArcade`](../force-app/main/default/mcpServerDefinitions/polyglotArcade.mcpServerDefinition-meta.xml), signed in through the External Client App **Polyglot Arcade MCP** |

See [Headless surface](/architecture/headless) for how they work together.

## Three frameworks, one platform

| Framework                    | Surface                                                       | Why it is used there                                                                                   |
| ---------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Angular**                  | <span class="surface hub">Polyglot Arcade</span> UI bundle    | The lobby, the hall of fame and two games: an app with its own routes, launched from the App Launcher  |
| **React**                    | <span class="surface cabinet">Pixel Cabinet</span> UI bundle  | Two real-time games, and the one bundle Lightning can frame as an internally hosted microfrontend      |
| **LWC**                      | <span class="surface floor">Arcade Floor</span> Lightning app | The host that frames the games and the native leaderboard, composed on Lightning pages                 |
| **LWC OSS**                  | Snake on Vercel, outside Salesforce                           | A guest without a Salesforce session: the host saves its rounds                                        |
| **HXL** (JSON, no framework) | <span class="surface headless">Headless</span>, in AI clients | The Hall of Fame and a player card in Claude and ChatGPT, on the same data - no frontend code to write |

## CRM data as the score sheet

Every finished round is stored as an `Arcade_Score__c` record. Leaderboards, high scores and play counts are ordinary Salesforce data: sharing, field-level security and roll-up summaries do the work, no custom backend required. The rounds show up in the shipped reports and dashboard, in the native LWC leaderboard and in both apps - see the [data model](/architecture/data-model).

## One arcade, not three apps

The Angular hub is the only lobby, the React cabinet is a machine it launches, and the Lightning app _Arcade Floor_ is where microfrontends are composed. The headless surface answers in AI clients and links back to the hub. A shared marquee bar and return links connect them, and every surface has its own color and room, so a switch between frameworks is something you see. See [Surfaces and roles](/architecture/).

## Where to go next

- [Integration patterns](/architecture/patterns) - the four ways a game reaches the platform
- [Headless surface](/architecture/headless) - the Hall of Fame in Claude and ChatGPT, without a UI of its own
- [Communication](/architecture/communication) - what the surfaces say to each other, step by step
- [Games](/games) - the five machines and how each one is built
- [Deploy](/deploy/) - your own arcade with one command
