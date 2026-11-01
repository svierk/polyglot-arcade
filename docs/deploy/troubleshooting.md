---
description: Symptoms and fixes for a Polyglot Arcade org - blank embedded games, missing App URLs, UI bundles that do not open, empty reports, and an MCP connector that does not work.
---

# Troubleshooting

Most problems come from a gap in the org or a step of the setup that did not run. `npm run preflight -- --target-org my-org` checks the org, and `npm run connect -- --target-org my-org` stores the UI bundle URLs again and activates the MCP server.

| Symptom                                                                                     | Fix                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An embedded game stays blank or reports `HEARTBEAT_TIMEOUT`                                 | Check that the CSP Trusted Sites `PixelCabinet_SalesforceApp` (`https://*.salesforce.app`) and `Snake_Vercel` (`https://lwc-oss-snake-game.vercel.app`) are active, both for frame-src                   |
| The host shows "this game is not plugged in yet"                                            | Run `npm run connect`, or paste the game's URL into the **App URL** field of its game record or into the host's **App URL** property                                                                     |
| The embedded cabinet shows the full cabinet instead of the game                             | The React games miss their **Embed Path** `/embed`: run `npm run connect`                                                                                                                                |
| The host card has no **← Polyglot Arcade** action                                           | The Angular games miss the hub URL: run `npm run connect`                                                                                                                                                |
| An Account opens without the embedded cabinet                                               | **Arcade Account** is the app default in Arcade Floor only: open the Account from the Arcade Floor app                                                                                                   |
| A UI bundle does not open from the App Launcher                                             | Enable **Salesforce Edge Network** in My Domain - `npm run preflight` checks it                                                                                                                          |
| The lobby has no link to the Pixel Pioneers Inc. Account page                               | Run `npm run setup` to seed the showcase Account; players also need read access to Accounts (the permission set grants it)                                                                               |
| The lobby says it could not load games                                                      | Assign the **Polyglot Arcade Player** permission set                                                                                                                                                     |
| A UI bundle shows `GraphQL Error:` without details (HTTP 401)                               | The bundle was built against the API version of another org, the CLI's default org. Since v1.0.1 the setup builds against `--target-org`: run `npm run setup` again                                      |
| A UI bundle update fails with `Content deployment failed`                                   | The org's data storage is full (Setup > Storage Usage): free up storage, then run `npm run setup` again                                                                                                  |
| The setup prints `⚠` lines before the deploy                                                | The preflight found a gap in the org; each line comes with a hint. The setup continues anyway                                                                                                            |
| The dashboard or a report shows no data for a player                                        | Players need the **Run Reports** user permission, which standard profiles include                                                                                                                        |
| The deploy fails with `Not available for deploy for this organization` on `UiWidgetBundle`  | The Headless Experience Layer is off. The setup turns it on before the deploy; on its own: `sf project deploy start -m Settings:UiWidget`, or **Setup → Headless Experience Layer Settings**             |
| Claude cannot connect: the sign-in fails or ends on an error page                           | A new External Client App takes up to 30 minutes. Check that the server URL matches the org type (`/sandbox/` for sandboxes and scratch orgs) and that the client ID is the one `npm run connect` prints |
| Claude connects but lists no arcade tools, or a tool says it has no access to an Apex class | The player misses the **Polyglot Arcade Player** permission set, which grants the two tool classes                                                                                                       |
| The connector lists the tools but answers without a widget                                  | The MCP server is not active or the client does not render MCP Apps: run `npm run connect`, and use Claude or ChatGPT - Slackbot shows no widgets with Block Kit                                         |
| A changed widget still looks like the old one in the chat                                   | Clients keep a rendered widget for a while; start a new conversation                                                                                                                                     |
| Connecting Claude opens the login page of another org                                       | `test.salesforce.com` forwards to the org you used last in this browser. Open the arcade org first (`sf org open -o my-org`), then click **Connect** again                                               |
| The chat shows "Couldn't render a rich UI for this response"                                | The client bundled several requests into one tool call, and a widget renders only one. Ask again for one period, game or player; the tool descriptions already ask for single calls                      |

## Deploy fails with `ExpectedSourceFilesError`

A second `npm run setup` against a scratch org can fail with `Expected source files for type 'UIBundle'` for `pixelCabinet.uibundle-meta.xml` or `polyglotArcade.uibundle-meta.xml`. Source tracking still remembers the hashed build files of the previous deploy as deleted. Deploy the source directory once, then run the setup without the deploy and the build:

```bash
sf project deploy start --source-dir force-app -o my-org
npm run setup -- --target-org my-org --skip-deploy --skip-ui-bundle-build --yes
```

Still stuck? [Open an issue](https://github.com/svierk/polyglot-arcade/issues/new/choose) with the output of `npm run preflight`.
