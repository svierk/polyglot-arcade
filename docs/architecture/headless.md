---
description: The headless surface of Polyglot Arcade - the Hall of Fame and a player card as Salesforce HXL widgets that Claude, ChatGPT and Slackbot render through a custom MCP server and the Arcade Host agent shows in Lightning, on the same data and with the same security as every other surface.
---

# Headless surface

Players ask, the arcade answers in the chat. The **headless surface** brings the Hall of Fame and a player card to AI clients such as Claude and ChatGPT - without a UI bundle, a Lightning page or frontend code of its own. It is built with the Salesforce **Headless Experience Layer** (HXL, beta): a widget is declared once in JSON, and every client that supports MCP Apps renders it natively. Inside the org, the Agentforce agent [Arcade Host](#the-arcade-host-in-lightning) answers with the same widgets.

<img class="shot" src="/images/hxl-hall-of-fame.png" alt="The Arcade Hall of Fame widget: a crown, the title Hall of Fame with an All time badge, 14 rounds by 3 players, then one row per game with a gold medal, the champion's initials, the game, the champion and their rounds, and the best score - Block Drop, Pellet Chase, Four in a Row, Brick Breaker and Snake - and the buttons Play in the arcade and My player card" />

The other surfaces show the same data in three frameworks. This one shows it with no UI of its own: the arcade only says what to show, and the client decides how it looks. [ADR 0003](/decisions/0003-headless-surface) and [ADR 0004](/decisions/0004-arcade-host-agent) have the reasons.

## From a question to a widget

```mermaid
sequenceDiagram
    actor Player
    participant Client as Claude
    participant MCP as MCP server<br/>polyglotArcade
    participant Apex as ArcadeHallOfFame<br/>invocable action
    participant Data as Arcade_Score__c
    Player->>Client: Who is this week's champion?
    Client->>MCP: tools/call getHallOfFame { period: week }<br/>OAuth token of the player
    MCP->>Apex: invoke as the player
    Apex->>Data: best round per player, user mode
    Data-->>Apex: rows the player may see
    Apex-->>MCP: title, entries, rounds, ...
    MCP-->>Client: result + ui://widget/lightningType/c__arcadeHallOfFame
    Client-->>Player: arcadeHallOfFameWidget, rendered natively,<br/>and an answer in words
```

The MCP server is hosted by Salesforce at `api.salesforce.com`. The client signs the player in with OAuth, so every call runs as that player. The tool result carries the data twice: as structured content, which the model reads to answer in words, and as the input of the widget the tool is linked to.

## The tools

| Tool            | Input                                                                                                                                                                       | Shows                                                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getHallOfFame` | `game` - key or name, forgiving case, spaces and hyphens (`brick-breaker`, `Brick Breaker`); empty for all games<br/>`period` - `today`, `week`, `month` or `all` (default) | With a game, its top 10 players by their best round; without one, the champion of every game. Players with the same best share a rank. Buttons: **Play in the arcade** and **My player card**   |
| `getPlayerCard` | `player` - a name; empty for the person who asks                                                                                                                            | The player's best round and rank in every game they played, how many of the games that is, and their last five rounds, with dates in the asker's locale and time zone. Button: **Hall of Fame** |

`playArcadeGame` and `playFourInARow` start and play games, see [Playing in the chat](#playing-in-the-chat).

The Hall of Fame here ranks **players**, one row each with their best round. The hall of fame in the hub ranks **rounds**. In a chat, "who is the champion?" is a question about players.

<img class="shot" src="/images/hxl-player-card.png" alt="The Arcade Player Card widget for Sam Spinner: initials avatar, 6 rounds in 5 of 5 games and a progress bar, Personal bests with rank, rounds and best score per game, Last rounds with game, date, surface and score, and a Hall of Fame button" />

The buttons use the two actions HXL offers: `action/openLink` opens the hub from the **App URL** that the setup stores on the Angular games, and `action/sendMessage` posts a new message as the player, for example _"Show my Polyglot Arcade player card."_ The client answers it with the other tool, so the widgets lead to each other without a line of client-specific code.

The screenshots show the widgets as the HXL renderer draws them, which the MCP server delivers to the client as an MCP App. In the client they follow its theme, light or dark.

## The Arcade Host in Lightning

The **Arcade Host** is an Agentforce employee agent. It opens in the Agentforce panel of Lightning, answers the same questions with the same data and shows the same widgets - from the same widget JSON as in Claude.

<img class="shot" src="/images/agentforce-panel.png" alt="The Arcade Floor app with the Snake page and the open Agentforce panel of the Arcade Host: the question Show the Block Drop high scores, a one-sentence answer, and the Hall of Fame widget for Block Drop with Ada Pixelquest, Sam Spinner and Grace Bytebrook, their medals, rounds and best scores, and the buttons Play in the arcade and My player card" />

```mermaid
sequenceDiagram
    actor Player
    participant Agent as Arcade Host<br/>Agentforce panel
    participant Wrapper as ArcadeHallOfFameAgent<br/>invocable action
    participant Tool as ArcadeHallOfFame
    participant Data as Arcade_Score__c
    Player->>Agent: Show the Block Drop high scores
    Agent->>Wrapper: getHallOfFame { game: block-drop }<br/>as the signed-in user
    Wrapper->>Tool: same request
    Tool->>Data: best round per player, user mode
    Data-->>Tool: rows the player may see
    Tool-->>Wrapper: title, entries, rounds, ...
    Wrapper-->>Agent: one output: hallOfFame
    Agent-->>Player: arcadeHallOfFameWidget via the type c__arcadeHallOfFameCard,<br/>and one sentence
```

The widget is the same, but the wiring differs from the MCP channel:

|                  | MCP clients                                                                  | Arcade Host in Lightning                                                                             |
| ---------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Action           | `ArcadeHallOfFame`, with its fields as separate outputs                      | `ArcadeHallOfFameAgent`, which returns the same response as one output                               |
| Lightning types  | Object-based: the envelope `arcadeHallOfFame` and the response `...Response` | Apex-backed: `arcadeHallOfFameCard` holds only `@apexClassType/c__ArcadeHallOfFame$Response`         |
| Links the widget | `uiResource` of the tool in the MCP server definition                        | The Agent Script output: `complex_data_type_name: "c__arcadeHallOfFameCard"`, `is_displayable: True` |
| Sign-in          | OAuth through the External Client App                                        | The Lightning session                                                                                |

The player card works the same way, with `ArcadePlayerCardAgent` and `arcadePlayerCardView`. Agentforce ties a Lightning type to one output, which has to hold the whole card, and the tools return their fields one by one. So the agent has these thin wrappers, while the logic stays in the tools.

## Building blocks

Six kinds of metadata make the MCP side of the surface, and the agent adds a seventh. All of them are deployed by `npm run setup`.

| Piece       | Metadata                                                                                                                                | Job                                                                                                                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tools       | Apex `ArcadeHallOfFame`, `ArcadePlayerCard`, with `ArcadeScoreStats`                                                                    | Invocable actions that read `Arcade_Score__c`. Lists of rows are global inner classes (`ArcadeHallOfFame.Entry`) with `@AuraEnabled` fields                                                                    |
| Widgets     | `UiWidgetBundle` `arcadeHallOfFameWidget`, `arcadePlayerCardWidget`                                                                     | The composition: `tile/*` components, `forEach` over the rows, `if` for empty states, formulas such as `FORMATNUMBER`, and a `schema.json` with the attributes the widget accepts                              |
| Types       | `LightningTypeBundle` `arcadeHallOfFame` and `arcadeHallOfFameResponse`, the same for the player card                                   | The response type mirrors the action's outputs. The envelope type models the tool result (`actionName`, `isSuccess`, `outputValues`), and its `renderer.json` maps `outputValues.*` to the widget's attributes |
| MCP server  | `McpServerDefinition` `polyglotArcade`                                                                                                  | The two tools, read-only and idempotent, each linked by `uiResource` to its widget resource `ui://widget/lightningType/c__<type>`                                                                              |
| Sign-in     | `ExternalClientApplication` `polyglotArcadeMcp` with its OAuth settings and policies                                                    | OAuth for MCP clients: scopes MCP and refresh token, PKCE, JWT-based access tokens, no client secret, Claude's callback URL                                                                                    |
| Agent       | Authoring bundle `Arcade_Host` and permission set `arcadeHost_Access` in `agent/`, wrapper classes and Apex-backed types in `force-app` | The agent in Agent Script. The setup's agent step publishes and activates it after the deploy, and skips an org without Agentforce                                                                             |
| Beta switch | `Settings` `UiWidget`                                                                                                                   | Turns on the Headless Experience Layer. The setup deploys it before everything else - an org checks widget bundles before it applies settings from the same deploy                                             |

The setup's connect step then activates the MCP server - an `McpServerAccess` record, which the server's metadata has no field for - and prints its URL and the OAuth client ID. See [Connect Claude](/deploy/#connect-claude).

## Same data, same rules

- **The player, not an integration user.** The MCP client acts with the OAuth token of the player who signed in. `getPlayerCard` without a name is the asker's own card.
- **Sharing and field-level security.** The Apex classes are `with sharing` and query `WITH USER_MODE`, so a player sees in the chat exactly what the hub shows them.
- **One permission set.** **Polyglot Arcade Player** grants access to the tool classes. Without it, the MCP server lists no tools.
- **The agent runs as the signed-in user too.** **Arcade Host Access** (`arcadeHost_Access`) grants the agent and its wrapper classes. Without it, a user sees no Agentforce icon and no error.
- **One tool writes.** `playFourInARow` keeps the player's own game and records its round, in user mode and marked as not read-only in the server definition. All other tools only read.

## Playing in the chat

_"I want to play a round of Snake"_ - a widget has no game loop and no key input, so the arcade splits games into two kinds ([ADR 0005](/decisions/0005-games-in-the-chat)).

| Tool             | Input                                                                                                                                                                     | What it does                                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playArcadeGame` | `game` - key or name; empty lists every game                                                                                                                              | Shows the game, the player's best and the champion, and opens it where it lives. Snake opens its Lightning page, where the host saves the round. Buttons: **Play in the arcade** or, for Four in a Row, **Play here**, and **High scores**      |
| `playFourInARow` | `column` - 1 to 7; empty shows or starts a game<br/>`moveNumber` - from the button's message<br/>`newGame` - gives up the open game<br/>`difficulty` - `easy` or `normal` | Plays a move and the CPU's answer and shows the board with a button per column. A finished game is recorded in `Arcade_Score__c` with `Source__c` `Headless` and the hub's points. Buttons when it is over: **New game** and **My player card** |

```mermaid
sequenceDiagram
    actor Player
    participant Client as Claude or the Arcade Host
    participant Apex as ArcadeFourInARow
    participant Data as Arcade_Match__c<br/>Arcade_Score__c
    Player->>Client: clicks column 3 on the board
    Client->>Apex: playFourInARow { column: 3, moveNumber: 5 }
    Apex->>Data: lock the player's open game
    Apex->>Apex: check the move, play the CPU
    Apex->>Data: save the board, on the last move also the score
    Apex-->>Client: board, status, message
    Client-->>Player: a new board with a button per column
```

The game is on the server, so the model only names a column and cannot change the board or the score. The move number makes a call safe to repeat: a move that is not the next one changes nothing and shows the current board, which also covers the buttons of older boards further up the conversation. The widget shows `easy` and `normal`; `hard` searches two plies deeper, which puts the Apex CPU limit at risk, and a weaker `hard` would change what its points mean.

In the panel, moves run in the Arcade Host's own subagent `four_in_a_row`: one action, available once per turn, with the player's sentence bound as its input. `ArcadeFourInARowAgent` reads the column from that sentence, so the model only has to make the call and show the card. The launcher returns a path there instead of a URL, because Agentforce replaces URLs that are not Trusted URLs of the org.

## Limits of the beta

- HXL is a beta service and is turned on per org. This project needs API version 68.0 (Winter '27).
- Widgets render in clients that support MCP Apps - Claude and ChatGPT. Slackbot shows them unless it uses Block Kit.
- A widget shows data and offers buttons; it has no input fields and no code. Interaction goes through `sendMessage` and `openLink`, so every move of a game is a turn of the model.
- A formula that cannot be evaluated fails the whole tool call, also after Apex has saved its work. Formulas behind a `meta.if` only run when their condition is true, so test every state. `TEXT()` on an empty value is such a failure, even in a branch of `IF` that is not taken.
- One request per call. The tool input is a list (`inputs: [ ... ]`, the shape of an invocable action), but a widget renders only a single result - a call that bundles several periods returns text only. The tool descriptions tell the model to call once per period, game or player.
- After a widget changes in the org, a client can show the old version for a while.
- A widget has no sizes per channel, and each client maps the heading levels to its own scale. The Agentforce panel draws them much larger than Claude, so the widgets use `h3` and below.
- The Arcade Host has only been verified in scratch orgs, not in a Developer Edition or a sandbox.

## Where each piece lives

```
agent/
├── aiAuthoringBundles/       Arcade_Host: the agent in Agent Script
└── permissionsets/           arcadeHost_Access
force-app/main/default/
├── classes/                  ArcadeHallOfFame, ArcadePlayerCard, ArcadeScoreStats, ArcadeToolsTest,
│                             ArcadePlayGame, ArcadeFourInARow(+Engine, +Test),
│                             ArcadeHallOfFameAgent, ArcadePlayerCardAgent,
│                             ArcadePlayGameAgent, ArcadeFourInARowAgent
├── uiWidgets/                arcadeHallOfFameWidget, arcadePlayerCardWidget,
│                             arcadePlayGameWidget, arcadeFourInARowWidget
├── lightningTypes/           arcadeHallOfFame(+Response), arcadePlayerCard(+Response),
│                             arcadePlayGame(+Response), arcadeFourInARow(+Response),
│                             arcadeHallOfFameCard, arcadePlayerCardView,
│                             arcadePlayGameCard, arcadeFourInARowBoard
├── objects/                  Arcade_Match__c: the open game of a player
├── mcpServerDefinitions/     polyglotArcade
├── externalClientApps/       Polyglot Arcade MCP, with extlClntApp* OAuth settings and policies
└── settings/                 UiWidget (HXL on)
```
