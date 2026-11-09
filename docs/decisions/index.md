---
description: The architecture decision records of Polyglot Arcade - why the surfaces have the roles and the looks they have, and why one of them has no UI of its own.
---

# Decisions

Architecture decision records (ADRs) keep the reasons behind the shape of the arcade: the context, the decision, how it was verified, its consequences and the options that were rejected.

| ADR                                                                   | Decision                                                                                                                           | Release |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------- |
| [0001 · Surface roles](/decisions/0001-surface-roles)                 | One lobby in the Angular hub, the React cabinet as a machine, and the Arcade Floor Lightning app where microfrontends are composed | v0.5.0  |
| [0002 · Surfaces and machines](/decisions/0002-surfaces-and-machines) | Two halls, one bar: a color and a room per surface, and a machine of its own per game                                              | v0.7.0  |
| [0003 · Headless surface](/decisions/0003-headless-surface)           | The Hall of Fame and a player card as HXL widgets that AI clients render through a custom MCP server                               | v1.1.0  |
| [0004 · Arcade Host](/decisions/0004-arcade-host-agent)               | An Agentforce employee agent in Lightning that answers with the same HXL widgets, through thin wrapper actions                     | v1.2.0  |
| [0005 · Games in the chat](/decisions/0005-games-in-the-chat)         | A launcher for every game, and Four in a Row played in the chat with the game and the score on the server                          |

A new ADR is a Markdown file `NNNN-<slug>.md` in `docs/decisions/` with status, date and release, and an entry in the sidebar in `docs/.vitepress/config.mts`.
