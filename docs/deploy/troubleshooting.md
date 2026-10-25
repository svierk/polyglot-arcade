---
description: Symptoms and fixes for a Polyglot Arcade org - blank embedded games, missing App URLs, UI bundles that do not open, and empty reports.
---

# Troubleshooting

Most problems come from a gap in the org or a step of the setup that did not run. `npm run preflight -- --target-org my-org` checks the org, and `npm run connect -- --target-org my-org` stores the UI bundle URLs again.

| Symptom                                                         | Fix                                                                                                                                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An embedded game stays blank or reports `HEARTBEAT_TIMEOUT`     | Check that the CSP Trusted Sites `PixelCabinet_SalesforceApp` (`https://*.salesforce.app`) and `Snake_Vercel` (`https://lwc-oss-snake-game.vercel.app`) are active, both for frame-src |
| The host shows "this game is not plugged in yet"                | Run `npm run connect`, or paste the game's URL into the **App URL** field of its game record or into the host's **App URL** property                                                   |
| The embedded cabinet shows the full cabinet instead of the game | The React games miss their **Embed Path** `/embed`: run `npm run connect`                                                                                                              |
| The host card has no **← Polyglot Arcade** action               | The Angular games miss the hub URL: run `npm run connect`                                                                                                                              |
| An Account opens without the embedded cabinet                   | **Arcade Account** is the app default in Arcade Floor only: open the Account from the Arcade Floor app                                                                                 |
| A UI bundle does not open from the App Launcher                 | Enable **Salesforce Edge Network** in My Domain - `npm run preflight` checks it                                                                                                        |
| The lobby says it could not load games                          | Assign the **Polyglot Arcade Player** permission set                                                                                                                                   |
| The setup prints `⚠` lines before the deploy                    | The preflight found a gap in the org; each line comes with a hint. The setup continues anyway                                                                                          |
| The dashboard or a report shows no data for a player            | Players need the **Run Reports** user permission, which standard profiles include                                                                                                      |

## Deploy fails with `ExpectedSourceFilesError`

A second `npm run setup` against a scratch org can fail with `Expected source files for type 'UIBundle'` for `pixelCabinet.uibundle-meta.xml` or `polyglotArcade.uibundle-meta.xml`. Source tracking still remembers the hashed build files of the previous deploy as deleted. Deploy the source directory once, then run the setup without the deploy and the build:

```bash
sf project deploy start --source-dir force-app -o my-org
npm run setup -- --target-org my-org --skip-deploy --skip-ui-bundle-build --yes
```

Still stuck? [Open an issue](https://github.com/svierk/polyglot-arcade/issues/new/choose) with the output of `npm run preflight`.
