# 0003 - A headless surface: HXL widgets through a custom MCP server

- **Status:** Accepted
- **Date:** 2026-10-31
- **Release:** v1.1.0

## Context

Polyglot Arcade shows one org's data in three frameworks: the Angular hub, the React cabinet and Lightning. The roadmap after v1.0.0 named an Agentforce question like _"who is this week's champion?"_ as an idea.

Salesforce's **Headless Experience Layer** (HXL, beta) answers that question in more places at once. A widget is declared once in JSON from a catalog of `tile/*` components and rendered natively in Agentforce in Lightning, and - through a custom MCP server - in Claude, ChatGPT and Slackbot. The data comes from Apex invocable actions, typed by custom Lightning types. Sharing and field-level security apply as in Lightning.

## Decision

**A fourth surface without a UI of its own.** The Hall of Fame and a player card become HXL widgets, served by the custom MCP server `polyglotArcade` and rendered in AI clients that support MCP Apps.

- **A surface, not a fifth integration pattern.** The four patterns describe how a game reaches the platform. The headless surface plays no game - it reads the same score sheet and answers questions. The Tech X-ray stays as it is.
- **MCP first.** Claude, ChatGPT and Slackbot reach players outside Salesforce, which is the new part. The Agentforce channel in Lightning needs an agent and an Apex-backed type of its own and is left for later.
- **Two read-only tools.** `getHallOfFame` ranks players by their best round - one row per player, because "who is the champion?" is about players - or names the champion of every game. `getPlayerCard` shows one player's bests, ranks and last rounds. Both are invocable Apex actions, `with sharing` and `WITH USER_MODE`.
- **Widgets that lead to each other.** Buttons use `action/sendMessage` ("Show my Polyglot Arcade player card.") and `action/openLink` (the hub's App URL), so the conversation moves on without client-specific code.
- **Setup does everything.** `npm run setup` turns HXL on (`Settings:UiWidget`, deployed before the rest), deploys the widgets, types, MCP server and an External Client App for OAuth, and its connect step activates the server and prints the server URL and OAuth client ID.

## Verification

Checked in scratch orgs (Winter '27) before the documentation was written:

- **HXL can be turned on by metadata.** `UiWidgetSettings.hxlEnabled` works in the scratch org definition and as a deployed setting. In the same deploy as the widgets it comes too late: the org rejects the widget bundles first. The setup therefore deploys the setting on its own first.
- **The External Client App deploys into scratch orgs.** Setup's UI cannot create one there, the Metadata API can. The OAuth scopes are named `MCP` and `RefreshToken`; a second deploy keeps the generated consumer key.
- **An MCP server is activated by a record.** `McpServerDefinition` has no active flag; Setup's **Activate** creates an `McpServerAccess` record (Tooling API), which the connect step creates or updates.
- **End to end as a player.** A PKCE authorization code flow with the External Client App's consumer key, then `tools/list`, `resources/read` and `tools/call` against `api.salesforce.com/platform/mcp/v1/sandbox/custom/polyglotArcade`. A Standard User with only the permission set saw no tools until the permission set granted the two Apex classes.
- **The widgets render.** The `ui://` resources are MCP Apps. Loaded into a minimal MCP Apps host with real tool results, they render as in the screenshots on [Headless surface](/architecture/headless), light and dark.

## Consequences

- The first Apex in the project. `ArcadeToolsTest` covers the three classes, and the scratch org workflow runs the Apex tests and checks that the Hall of Fame tool ranks the recorded round and that the MCP server is active.
- `npm run setup` turns on a beta service in every org it runs against, and every such org gets an External Client App for MCP sign-in. Both are documented on the deploy page.
- The External Client App knows Claude's callback URL. ChatGPT and Slackbot use callback URLs per connector, which have to be added to it.
- Tool input reaches Apex wrapped as `{ inputs: [ ... ] }`, the shape of an invocable action. Clients read that from the tool's input schema - and may bundle several requests into one call, which the beta renders as text only ("Couldn't render a rich UI for this response"). Claude did that on the first try. The tool descriptions in the MCP server definition therefore ask for exactly one request per call; the hosted server picks up a changed description after about two minutes.
- A widget change can take a while to show up in a client that has rendered the old one.

## Rejected options

- **Pattern 5.** It would put a surface without a game next to four ways of embedding games, and change the Tech X-ray for it.
- **An Agentforce agent action only.** Needs an agent in the org and stays inside Salesforce; Claude and ChatGPT would not see it.
- **Salesforce's standard MCP servers.** The record and query servers answer in text only; there is no widget and no ranking logic.
- **An External Client App created by hand.** Not possible in scratch orgs through Setup, and the scratch org workflow could not test the MCP part.
- **Playing Four in a Row in the chat now.** `sendMessage` buttons would make it possible - a button per column - but every move is a turn of the model and the board needs server-side state. A candidate for a later spike.
