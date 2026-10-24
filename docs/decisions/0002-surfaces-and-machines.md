# 0002 - Two halls, one bar: surfaces and machines you can tell apart

- **Status:** Accepted
- **Date:** 2026-10-24
- **Release:** v0.7.0 ([#17](https://github.com/svierk/polyglot-arcade/issues/17))

## Context

Up to v0.6.0 the Angular hub and the React cabinet shared almost their whole look: the same violet background, the same cyan neon, the same panel, the same "High scores" card and button. Only a small badge in the marquee bar said which bundle was on screen. The four in-org games ran in that one chrome and looked as if they came out of one game box.

Polyglot Arcade exists to show Salesforce Multi-Framework. That two frameworks run side by side is the point of the demo, so it should be seen on the page, not only read in a badge. A real arcade has the same problem the other way round: one hall, but every machine has its own cabinet, screen and character. The Snake already showed how that works: a retro phone with its own LCD.

## Decision

**Same hall, different machines - and two halls, one bar.** There are two levels of identity:

| Level   | What is shared                                                                                                                                         | What is its own                                                                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surface | The marquee bar's layout (`← Lobby`, logo, badge), the footer row (`Salesforce ↗`, player, `Log out`), base tokens, round result and high-score markup | A surface color and a room: the Angular hub is a **magenta arcade hall** with a carpet pattern, the React cabinet a **cyan machine room** with a blueprint grid. Lightning's Arcade Floor is **blue**.                     |
| Machine | Nothing but the data: score, level, the leaderboard rows                                                                                               | Cabinet, screen, HUD, controls, result screen and high-score card: an upright CRT cabinet (Pellet Chase), a handheld brick game (Block Drop), a console on a wood-grain TV (Brick Breaker), a tabletop toy (Four in a Row) |

The surface colors are used wherever a surface is named: the marquee bar and badge, a legend and a "Lives in" line on every lobby card, the launch buttons (they take the color of the surface they open), the source of each round in the hall of fame, and a slim `React · Pixel Cabinet UI bundle` tag below the compact machine that Lightning frames at `/embed`.

How it is built:

- `arcade.css` stays identical in both bundles, but only holds the shared part. Each bundle's `surface.css` sets `--surface` and the room. Machine styles live with their game: `games/<key>/machine.css` in React, the component styles in Angular (`ViewEncapsulation.None`, every rule scoped to the component's element, so the machine can style the projected result screen).
- The stage that saves rounds stays generic. React passes the result screen to the game component as a prop, Angular projects it into the machine with `<ng-content>`. The high-score card is one shared component per bundle, dressed by the machine's styles (`.machine-<key> .hiscores`).
- Fonts (Press Start 2P, DSEG7, VT323, Fredoka) come from npm under the SIL Open Font License and are bundled at build time. No CDN, no CSP change.
- Teaser marquees in the lobby are pixel art per `Game_Key__c`, kept as data in the hub (`games/marquees.ts`) and drawn as SVG, so they need no asset path. Unknown games keep the plain card.
- Game rules stay untouched in `engine.ts`. Canvas games only changed how they draw (an LCD for Block Drop, chunky 80s colors for Brick Breaker); scanlines and glare are CSS overlays above the canvas.
- Nothing in a machine is sized by the viewport, and flicker, blinking lights and bounces stop under `prefers-reduced-motion`. Machines fit a 1280 × 860 window below the bar; the Pellet Chase cabinet is cut off below its control panel for that.
- The marquee bar is sticky and stays as lean as before. A row below the footer credits holds `Salesforce ↗`, the player (`uiapi.currentUser`) and `Log out` (`/secur/logout.jsp`), so the platform's "Logged in as" banner is switched off with `<meta name="sf-session-banner" content="disabled">` in both `index.html` files - also inside the Lightning frame, where Lightning already shows who is logged in.

## Consequences

- A change to the marquee bar, the result or high-score markup still has to land in both copies of `arcade.css`; a change to a machine touches only its game folder.
- Angular's per-component style budget is raised to 8 kB (warning) / 16 kB (error): a machine is more CSS than a panel.
- The embedded Snake shows a cut-out of its phone at full size - screen and navigation keys - instead of the whole phone, so it fits a Lightning page without scrolling. That change lives in the Snake repository.
- New games need a machine concept, a teaser marquee and, if they use a new font, an entry in `THIRD_PARTY_NOTICES.md`.

## Rejected options

- **Color only.** Same room for both bundles, only the bar in the surface color. Easy to miss once the machines fill the page.
- **Framed surfaces.** A frame in the surface color around every page with a corner label, like a boundary in an architecture diagram. Very explicit, but it overlaps with the Tech X-ray planned for v0.8.0.
- **Machine look-alikes of real products.** The machines keep the classic shapes and colors players remember - the blue frame of the toy, the early-90s proportions of the handheld - but no names, logos or signature details of specific products (no slanted A/B buttons or cross d-pad on the handheld, no brand lettering).
- **Fonts from a CDN.** Would need a CSP Trusted Site per font host and breaks without network access to it.
