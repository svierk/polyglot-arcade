# 0001 - Surface roles: one lobby, machines and a Lightning floor

- **Status:** Accepted
- **Date:** 2026-10-23
- **Release:** v0.5.0 ([#15](https://github.com/svierk/polyglot-arcade/issues/15))

## Context

Up to v0.4.0 Polyglot Arcade had three surfaces that each felt like a separate entry point:

- the **Angular UI bundle** _Polyglot Arcade_ with a lobby and the hall of fame,
- the **React UI bundle** _Pixel Cabinet_ with a lobby of its own that looked like the hub's,
- the **Arcade Break Room**, a Lightning app page with the embedded Block Drop and Snake. No Lightning app contained it, so it opened as a temporary tab in whatever app the player used last.

Switching from the hub to the cabinet felt like landing on a second hub. Neither the cabinet nor Lightning had a way back.

Three platform facts limit the options:

1. **Internally hosted embedding** (beta) of a UI bundle via `<lightning-ui-embedding>` supports React only. The embeddable games therefore have to live in the React bundle.
2. **Composition happens in Lightning.** `lightning-ui-embedding` is an LWC base component. The `sf-embedding-bridge` in `@salesforce/platform-sdk` only implements the guest side. A UI bundle cannot host another bundle by platform means.
3. **UI bundles run outside Lightning** on the org's `*.salesforce.app` domain, each with its own App Launcher entry.

## Decision

Every surface gets one role.

| Surface                                 | Role                                                                                                                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Polyglot Arcade** (Angular UI bundle) | The only lobby and hall of fame, and the entry point. It launches every game, wherever it lives.                                                                                                                                         |
| **Pixel Cabinet** (React UI bundle)     | A _machine_, not a second hub. It has no lobby: `/` sends the player to the hub lobby. `/play/:gameKey` (launched from the hub) and `/embed` (framed by Lightning) stay.                                                                 |
| **Arcade Floor** (Lightning app)        | The place where microfrontends are composed. One app page per embedded game (_Snake_) and a composition showcase on the Account record page (_Arcade Account_, app default in Arcade Floor), where rounds are attributed to the Account. |

Navigation between the surfaces:

- **Shared marquee bar.** Every standalone UI bundle page starts with the same bar: `← Lobby` and a badge naming the surface (`Angular · Polyglot Arcade hub`, `React · Pixel Cabinet UI bundle`). It is the one piece of chrome the bundles deliberately share (`arcade.css` in both bundles). The switch between bundles stays visible as a feature, not as a break.
- **Hub → cabinet:** the App URL on the React game records (unchanged).
- **Hub → Lightning:** `SFDC_ENV.orgUrl` plus `/lightning/app/c__arcadeFloor/n/<tab>`. Since v0.7.0 the marquee bar of both bundles also has a `Salesforce ↗` link to the Arcade Floor app itself.
- **Cabinet → hub:** derived from the cabinet's own base path, no stored URL.
- **Lightning → hub:** a `← Polyglot Arcade` action on the `arcadeGameHost` card. The hub URL is the App URL of the Angular game records, stored by `npm run connect`. Every game record now says where its game lives.

## Verification

Checked in a scratch org (Winter '27) before the implementation:

- **An org-relative app URL does not launch a UI bundle.** `/lightning/app/c__polyglotArcade`, `/lightning/app/<app id>` and `/home/home.jsp?tsid=<app id>` all open an empty Lightning app ("This app doesn't have any navigation items"). Lightning needs the bundle's `*.salesforce.app` URL. That URL is org-specific and only exposed as the `StartUrl` of the app's `AppMenuItem`, so `npm run connect` stores it.
- **Both bundles share one origin.** The org serves them as `https://<my-domain>--c.<...>.salesforce.app/app/c__pixelCabinet` and `/app/c__polyglotArcade`. `SFDC_ENV` provides `basePath` (`/app/c__pixelCabinet`) and `appName`, so the cabinet reaches the hub by swapping its app name.
- **A hidden app is not launchable.** In a permission set, `applicationVisibilities.visible = false` removes access, not just the App Launcher entry. The cabinet URL then opens the empty Lightning app as well, `/play/<game>` included. The cabinet therefore stays visible in the App Launcher, and its `/` redirects to the hub.
- **`/lightning/n/<tab>` keeps the current app.** Without the app in the URL, the Snake tab opens as a temporary tab in the last used app, the problem the Break Room had. `/lightning/app/c__arcadeFloor/n/Arcade_Snake` opens it inside Arcade Floor.

## Consequences

- The cabinet's e2e lobby test is gone. The `/embed` game picker for `game = lobby` stays: it is how the cabinet is chosen on the Account page.
- The Arcade Break Room flexipage and tab are removed. Existing orgs delete them on upgrade (see the README).
- The Lightning app needs a label different from the UI bundle app _Polyglot Arcade_, hence _Arcade Floor_.
- The Lightning → hub link depends on `npm run connect`. Until it ran, the host shows no back action. v0.6.0 folds `connect` into `npm run setup`.
- v0.7.0 gives each machine its own look below the shared marquee bar.

## Rejected options

- **The Angular hub hosts the React cabinet.** The hub would frame the cabinet's `/embed` route itself. Hosting is only implemented by the `lightning-ui-embedding` base component; a UI bundle has no platform means to host another one. A self-built `postMessage` contract between the two bundles is possible but not supported, and origin and session of the two bundles need checking first. It stays a spike after v1.0.0, possibly as a fifth pattern.
- **Keep a lobby in the cabinet.** Two lobbies with the same look are the problem this decision solves. Players pick games in one place.
- **Hide the cabinet from the App Launcher.** Not possible without removing access, see Verification.
- **Store the hub URL in a custom setting or custom metadata.** It would add a second place for app URLs next to `App_Url__c`, which already holds the cabinet URL and the Snake URL.
- **Derive the hub URL in Lightning from the cabinet URL.** It would need no new data, but it couples the host LWC to the naming of another bundle and to the domain scheme.
- **Keep one Break Room page for all embedded games.** Two games on one page had no business reason, and the page belonged to no app. One page per game, plus the Account page where several frameworks meet for a reason, shows the composition more clearly.
