---
layout: home
title: Polyglot Arcade
titleTemplate: Salesforce Multi-Framework as a retro arcade
hero:
  name: Polyglot Arcade
  text: Salesforce Multi‑Framework
  tagline: An Angular hub, a React cabinet and an LWC OSS game share one org's CRM data and meet on Lightning pages as microfrontends - as a retro arcade you can play.
  image:
    src: /images/polyglot-arcade-hero.svg
    alt: Three pixel-art arcade cabinets in magenta, cyan and blue, showing Brick Breaker, Block Drop and Snake
  actions:
    - theme: brand
      text: Deploy to your org
      link: /deploy/
    - theme: alt
      text: How it is built
      link: /architecture/
    - theme: alt
      text: View on GitHub
      link: https://github.com/svierk/polyglot-arcade
features:
  - icon:
      src: /images/icons/frameworks.svg
      width: 48
      height: 48
    title: Three frameworks, one platform
    details: The lobby is Angular, the real-time games run in a React cabinet, and an LWC OSS Snake joins from Vercel.
    link: /concepts
    linkText: Multi-Framework in a nutshell
  - icon:
      src: /images/icons/trophy.svg
      width: 48
      height: 48
    title: CRM data as the score sheet
    details: Every round is an Arcade_Score__c record. Sharing, field-level security and roll-up summaries do the work.
    link: /architecture/data-model
    linkText: Data model
  - icon:
      src: /images/icons/microfrontend.svg
      width: 48
      height: 48
    title: Microfrontends in Lightning
    details: One host LWC drops any game onto a Lightning page, talks to it through events and saves rounds for guests without a session.
    link: /architecture/patterns
    linkText: Four integration patterns
  - icon:
      src: /images/icons/communication.svg
      width: 48
      height: 48
    title: Communication you can follow
    details: Data SDK GraphQL, View SDK props and events, the package-free bridge and Lightning Message Service - each with a diagram.
    link: /architecture/communication
    linkText: Communication
  - icon:
      src: /images/icons/xray.svg
      width: 48
      height: 48
    title: The Tech X-ray tells what you see
    details: One switch in the lobby turns every game card into a blueprint of how the game is built.
    link: /architecture/patterns#tech-x-ray
    linkText: Tech X-ray
  - icon:
      src: /images/icons/joystick.svg
      width: 48
      height: 48
    title: Build your own game
    details: Add a game to the hub, to the cabinet, or bring one hosted anywhere as a guest on a Lightning page.
    link: /build-your-own-game
    linkText: Build your own game
---

## The architecture at a glance

One Salesforce org is the hall. Three surfaces stand in it, each in a color of its own, and one machine stands outside: the Snake on Vercel. The arrows are everything they say to each other and to the data they share.

```mermaid
flowchart LR
    Hub["<b>Polyglot Arcade</b><br/>Angular UI bundle<br/>lobby · hall of fame<br/>Four in a Row · Brick Breaker"]
    Cab["<b>Pixel Cabinet</b><br/>React UI bundle<br/>Block Drop · Pellet Chase"]
    Floor["<b>Arcade Floor</b><br/>Lightning app<br/>arcadeGameHost · arcadeLeaderboard"]
    Snake["<b>Snake</b><br/>LWC OSS on Vercel<br/>outside Salesforce"]
    Data[("<b>Salesforce data</b><br/>Arcade_Game__c<br/>Arcade_Score__c")]
    Hub -- "launches" --> Cab
    Hub -- "links to the Snake page" --> Floor
    Floor <-- "frames /embed · props<br/>gameover event" --> Cab
    Floor <-- "frames · package-free bridge<br/>gameover event" --> Snake
    Hub -- "Data SDK GraphQL" --> Data
    Cab -- "Data SDK GraphQL" --> Data
    Floor -- "createRecord · GraphQL wire" --> Data
    classDef hub fill:#e879f9,stroke:#a21caf,color:#1a0520
    classDef cabinet fill:#22d3ee,stroke:#0e7490,color:#042f2e
    classDef floor fill:#60a5fa,stroke:#1d4ed8,color:#0b1530
    classDef guest fill:#c084fc,stroke:#7e22ce,color:#1e0b36
    class Hub hub
    class Cab cabinet
    class Floor floor
    class Snake guest
```

- <span class="surface hub">Polyglot Arcade</span> is the only lobby and the hall of fame. It launches every game, wherever the game lives.
- <span class="surface cabinet">Pixel Cabinet</span> is a machine, not a second hub. The hub launches its games, and Lightning frames them as a microfrontend.
- <span class="surface floor">Arcade Floor</span> is where microfrontends are composed: the Snake page and the Account page with the embedded cabinet.

Every finished round becomes a record. Read on in [Surfaces and roles](/architecture/), or [deploy the arcade](/deploy/) into your own org with one command.

<img class="shot" src="/images/lobby.png" alt="Polyglot Arcade lobby in the magenta arcade hall: game cards with pixel-art teaser marquees, each saying where its game lives" />
