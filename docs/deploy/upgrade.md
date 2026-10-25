---
description: Upgrade an org that runs an older version of Polyglot Arcade - the setup keeps all scores, plus the leftovers of older versions to remove by hand.
---

# Upgrade

Setup is safe to run again and keeps all scores, whatever version you come from:

```bash
git pull && npm install
npm run setup -- --target-org my-org
```

It deploys what is new, adds missing games, updates the existing ones by their **Game Key** and stores the UI bundle URLs again. Coming from v0.8.0 or earlier, it also adds the field **Arcade Key** to Account and the showcase Account **Pixel Pioneers Inc.**, linked from the hub lobby.

## Leftovers of older versions

Two leftovers the setup cannot remove for you:

- **v0.4.0 or earlier:** the Arcade Break Room is replaced by the Arcade Floor app. Delete its tab and page after the setup (the current permission set no longer references the tab). If you added the Break Room tab to another app's navigation or to a profile, remove it there first, otherwise the delete fails.

  ```bash
  sf project delete source -o my-org -m CustomTab:Arcade_Break_Room -m FlexiPage:Arcade_Break_Room --no-prompt
  ```

- **v0.2.0:** the host LWC is now called **Arcade Game Host** (`arcadeGameHost`). If you placed the old **Pixel Cabinet Host** on other pages, it keeps working there until you replace it with the new host (its **Cabinet URL** property is now called **App URL**) and delete it.

`npm run connect:cabinet` is gone since v0.6.0; use `npm run connect`, or let `npm run setup` do it.

The [releases](https://github.com/svierk/polyglot-arcade/releases) list what changed in each version.
