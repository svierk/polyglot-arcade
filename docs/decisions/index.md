---
description: The architecture decision records of Polyglot Arcade - why the surfaces have the roles and the looks they have.
---

# Decisions

Architecture decision records (ADRs) keep the reasons behind the shape of the arcade: the context, the decision, how it was verified, its consequences and the options that were rejected.

| ADR                                                                   | Decision                                                                                                                           | Release |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------- |
| [0001 · Surface roles](/decisions/0001-surface-roles)                 | One lobby in the Angular hub, the React cabinet as a machine, and the Arcade Floor Lightning app where microfrontends are composed | v0.5.0  |
| [0002 · Surfaces and machines](/decisions/0002-surfaces-and-machines) | Two halls, one bar: a color and a room per surface, and a machine of its own per game                                              | v0.7.0  |

A new ADR is a Markdown file `NNNN-<slug>.md` in `docs/decisions/` with status, date and release, and an entry in the sidebar in `docs/.vitepress/config.mts`.
