---
description: Deploy Polyglot Arcade to a scratch org or any existing org with one command - prerequisites, the preflight check and what npm run setup does.
---

# Set up an org

One command deploys the arcade, connects its surfaces and seeds the games. It runs in a scratch org, a Developer Edition or a sandbox.

## Prerequisites

- An org on **Winter '27** or later with Salesforce Multi-Framework - a scratch org, a Developer Edition or a sandbox
- For the microfrontend: a **Hyperforce** org with **English** as the default language (requirements of `lightning-ui-embedding`)
- **Salesforce Edge Network** enabled in My Domain, so the UI bundles open from the App Launcher (scratch orgs get it from the scratch org definition)
- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) and **Node.js 24**

`npm run setup` checks the org against this list before it deploys and prints a hint for every gap. The check only warns: an org without English as the default language still runs the hub and the cabinet, only embedding fails. Run it on its own with:

```bash
npm run preflight -- --target-org my-org
```

## Option A: Scratch org

```bash
git clone https://github.com/svierk/polyglot-arcade.git
cd polyglot-arcade
npm install

sf org create scratch -f config/project-scratch-def.json -a polyglot-arcade -v <your-dev-hub> -y 7
npm run setup -- --target-org polyglot-arcade
```

The scratch org definition sets English as the language and enables the Edge Network.

## Option B: Any existing org

```bash
git clone https://github.com/svierk/polyglot-arcade.git
cd polyglot-arcade
npm install

sf org login web -a my-org        # Developer Edition, sandbox, ...
npm run setup -- --target-org my-org
```

## What the setup does

`npm run setup` shows the steps it is about to run (confirm with Enter, or pass `--yes` to skip the picker) and then:

1. **Preflight** - checks the API version, Multi-Framework, default language, Hyperforce and Edge Network
2. **Build** - installs and builds both UI bundles
3. **Deploy** - deploys the metadata, including the reports and the dashboard
4. **Permission set** - assigns Polyglot Arcade Player to you
5. **Data** - upserts the five games by their **Game Key** and the showcase Account **Pixel Pioneers Inc.** by its **Arcade Key**. Existing records are updated in place, so their scores survive
6. **Connect** - stores the org-specific UI bundle URLs (read from their App Launcher entries) on the game records: the Pixel Cabinet URL and its `/embed` route on the React games, so the hub can launch them and the host LWC can embed them, and the hub URL on the Angular games, so the host LWC can link back to the lobby
7. **GraphQL** - fetches the org's GraphQL schema and generates the types of both UI bundles

The Snake needs no connect step: its Vercel URL ships with the seed data, and the CSP Trusted Site `Snake_Vercel` lets Lightning frame it.

`npm run connect -- --target-org my-org` runs the connect step on its own, and `--skip-<step>` leaves a step out:

```bash
node scripts/org-setup.mjs --help
```

## Play

Open **Polyglot Arcade** from the App Launcher - the lobby launches every game. The Lightning side lives in the **Arcade Floor** app:

- the **Snake** tab with the embedded Snake and its leaderboard,
- the **Dashboards** tab with the Arcade Floor dashboard,
- the **Accounts** tab: every Account opens on the **Arcade Account** page with the embedded cabinet, and the list view **Arcade Accounts** shows the showcase Account **Pixel Pioneers Inc.** Rounds played there count for the Account. The hub lobby links its page from Block Drop and Pellet Chase.

## Optional steps

- **More players:** assign the permission set to other users.

  ```bash
  sf org assign permset -n polyglotArcade_Access -b <username> -o my-org
  ```

- **Games on Account pages in other apps:** **Arcade Account** is the Account page only in Arcade Floor. Assign it to other apps in Lightning App Builder, or add **Arcade Game Host** (any game, including Snake) and **Arcade Leaderboard** to your own Account page. Both pick up the record ID automatically, and the leaderboard shows only that Account's rounds.

Something does not work? See [Troubleshooting](/deploy/troubleshooting). Coming from an older version? See [Upgrade](/deploy/upgrade).
