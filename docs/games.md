---
description: The five games of Polyglot Arcade - Block Drop, Pellet Chase, Four in a Row, Brick Breaker and Snake - with their machines, frameworks, integration patterns and controls.
---

# Games

Five games, three frameworks. Same hall, different machines: every game has a cabinet of its own, with its HUD, result screen and high-score card in its style. In the hub lobby every game card carries a teaser marquee in the look of its machine - the ones below are drawn from the same pixel art.

| Game                            | Mechanic                                               | Framework | Lives in                                                                | Patterns                                                                     |
| ------------------------------- | ------------------------------------------------------ | --------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Block Drop](#block-drop)       | falling blocks, line clears, levels                    | React     | <span class="surface cabinet">Pixel Cabinet</span>                      | [2](/architecture/patterns#pattern-2), [3](/architecture/patterns#pattern-3) |
| [Pellet Chase](#pellet-chase)   | maze chase: four ghosts with their own tactics         | React     | <span class="surface cabinet">Pixel Cabinet</span>                      | [2](/architecture/patterns#pattern-2), [3](/architecture/patterns#pattern-3) |
| [Four in a Row](#four-in-a-row) | turn-based vs. a minimax CPU with three difficulties   | Angular   | <span class="surface hub">Polyglot Arcade hub</span>                    | [1](/architecture/patterns#pattern-1)                                        |
| [Brick Breaker](#brick-breaker) | paddle and ball, tougher walls every level             | Angular   | <span class="surface hub">Polyglot Arcade hub</span>                    | [1](/architecture/patterns#pattern-1)                                        |
| [Snake](#snake)                 | eat, grow, don't bite your own tail - on a retro phone | LWC OSS   | Vercel, embedded on the <span class="surface floor">Arcade Floor</span> | [4](/architecture/patterns#pattern-4)                                        |

The games are original implementations of classic mechanics. Names and artwork are deliberately generic - no trademarks of the original arcade titles are used. Game rules live in framework-free TypeScript (`games/*/engine.ts`) with their own unit tests; the React and Angular components only render and handle input.

## Block Drop

<TeaserMarquee game="block-drop" />

**Handheld brick game** in early-90s proportions: ivory plastic, a grey-olive LCD with segment digits, direction and rotate keys as touch controls. Launched from the hub lobby into the Pixel Cabinet, and framed by Lightning on the **Arcade Account** page.

| Keyboard                             | Touch                                    |
| ------------------------------------ | ---------------------------------------- |
| ← → move · ↑ rotate · ↓ / space drop | direction keys, rotate and start buttons |

<img class="shot" src="../images/pixel-cabinet.png" alt="Block Drop on an ivory handheld brick game with an LCD, in the cyan machine room of the Pixel Cabinet" />

## Pellet Chase

<TeaserMarquee game="pellet-chase" />

**Upright arcade cabinet**: backlit marquee, a CRT with scanlines, joystick panel and attract-screen high scores. Four ghosts, each with its own tactics. Lives in the Pixel Cabinet like Block Drop, and can be framed in Lightning the same way.

| Keyboard                        | Touch                             |
| ------------------------------- | --------------------------------- |
| arrows or WASD steer · P pauses | joystick buttons and pause button |

<img class="shot" src="../images/pellet-chase.png" alt="Pellet Chase in an upright arcade cabinet with CRT, joystick panel and the attract-screen high scores" />

## Four in a Row

<TeaserMarquee game="four-in-a-row" />

**Tabletop toy**: a glossy blue frame on feet, discs that drop and bounce, the result on the lid of the game box. The CPU plays minimax on three difficulties; the difficulty is stored as the round's level. Lives in the Angular hub.

| Keyboard                               | Touch        |
| -------------------------------------- | ------------ |
| ← → and Enter · keys 1-7 drop directly | tap a column |

Every column tells a screen reader which discs it holds and how many places are free, and the CPU's move is announced.

<img class="shot" src="../images/four-in-a-row.png" alt="Four in a Row as a tabletop toy, won against the CPU, the result on the game box lid next to its high scores" />

## Brick Breaker

<TeaserMarquee game="brick-breaker" />

**80s home console** on a wood-grain CRT TV, with the cartridge box as high-score card. Tougher walls every level. Lives in the Angular hub.

| Keyboard                             | Touch                               |
| ------------------------------------ | ----------------------------------- |
| ← → move · space launches · P pauses | tap launches, drag moves the paddle |

<img class="shot" src="../images/brick-breaker.png" alt="Brick Breaker on a wood-grain CRT TV with the console and cartridge, next to the cartridge box high scores" />

## Snake

<TeaserMarquee game="snake" />

**Retro phone** with its own LCD - an [LWC OSS app](https://github.com/svierk/lwc-oss-snake-game) on Vercel, outside Salesforce. Embedded, the Lightning page shows the part of the phone with the screen and the navigation keys at full size. The hub lobby links it to its page in the Arcade Floor app, where the host LWC saves its rounds.

<img class="shot" src="../images/snake.png" alt="Snake embedded on its page in the Arcade Floor app: the part of the phone with the screen and the navigation keys, the way back to the hub and the LWC leaderboard" />

## Hall of fame

The hub's hall of fame lists the rounds of every game across all surfaces, ten per page, the source of each round in the color of its surface.

<img class="shot" src="../images/hall-of-fame.png" alt="Hall of fame with a tab per game, the source of each round - embedded or Pixel Cabinet - in the color of its surface" />

## Playable by everyone

Every surface keeps WCAG 2.1 AA, and every in-org game can be played with a keyboard, by touch and with a screen reader.

- **Keyboard focus** is always visible: links and buttons get an outline in the surface color, the machine that takes the game keys a dashed one. Machines on a light case, like the Block Drop handheld, use a darker outline.
- **Screen readers** hear the end of every round, with the score and whether it reached Salesforce, from a live region outside the machine. Game boards are labeled with their controls.
- **Reduced motion:** with `prefers-reduced-motion`, flicker, blinking, bouncing discs and card hover effects stop. The game itself keeps moving.
- **Small screens:** all pages work from 375 px wide without scrolling sideways, and buttons react to a tap at once.

Automated checks guard it: axe against WCAG 2.1 AA and touch play at 375 px in the Playwright tests of both bundles, sa11y in the LWC tests - see [Development](/development#tests-and-checks).
