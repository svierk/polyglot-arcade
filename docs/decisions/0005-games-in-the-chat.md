# 0005 - Games in the chat: a launcher for every game, Four in a Row on the board

- **Status:** Accepted
- **Date:** 2026-11-08
- **Release:** v1.3.0

## Context

[ADR 0003](/decisions/0003-headless-surface) kept the headless surface read-only: it "plays no game", and left Four in a Row in the chat as a candidate for a later spike. The question came back as _"Claude, I want to play a round of Snake"_, with the score flowing back into the org.

An HXL widget is a declarative tree of `tile/*` components. It has no JavaScript, no canvas and no input fields, it only gets data from a tool result, and a button can do one of two things: `action/openLink` or `action/sendMessage`. So every step of a game in a widget is a full turn of the model. That rules out a game loop, and it is enough for a turn-based game.

## Decision

**Two new tools on the headless surface, one that sends a player to a game and one that plays a game.**

- **`playArcadeGame` is the launcher.** It shows a game with the player's best, the champion and a button that opens it where it lives. Snake opens its Lightning page and not its App URL, because only the host page saves the round. Without a game, or with an unknown one, it lists every game. No new path for scores.
- **`playFourInARow` plays in the chat.** The widget draws the board with a button per column. A button posts _"Four in a Row: drop my disc in column 3 (move 5)."_ as the player, and the client answers with the tool.
- **The game lives on the server.** One `Arcade_Match__c` per open game, owned by the player and private. The model only names a column: Apex checks the move, plays the CPU and works out the score. It cannot invent a result.
- **The move number makes a move safe to repeat.** Clients and models can send a call twice, and every old board in the conversation still has its buttons. A move whose number is not the next one changes nothing and shows the current board. The record is locked while a move runs, so a parallel call sees the new number.
- **A finished game is an ordinary round.** `Arcade_Score__c` with the hub's points and level, written in user mode. `Source__c` gets the value `Headless`, so reports tell these rounds apart. A lost game scores 0 and counts as a play, as on the other surfaces.
- **The same engine as the hub, in Apex.** Same rules, search and points as `engine.ts`, on `easy` and `normal`. `hard` searches two plies deeper, which puts the Apex CPU limit at risk. It is left out rather than weakened, because its points have to mean the same on every surface.
- **Both channels.** Thin wrappers and Apex-backed types bring both widgets to the Arcade Host, as in [ADR 0004](/decisions/0004-arcade-host-agent).
- **A subagent of its own for moves in the panel.** Its only action takes the player's sentence as a bound input, and `ArcadeFourInARowAgent` reads the column from it. The model has nothing to fill in, the action is available once per turn, and the instructions ask for the card.

## Verification

Checked in a scratch org (Winter '27, API 68.0) before the documentation was written:

- **Through the MCP server,** as an admin and as a Standard User with only the permission set: all four tools listed, complete games played on `easy` and `normal`, about one second per move including the CPU's search.
- **A repeated call** returned "That button belongs to an earlier board" and left the board as it was.
- **The round reached the org:** `getPlayerCard` showed it with the source `Headless`.
- **The widgets render** in a minimal MCP Apps host with real results: a new game, a won game with its points and disabled columns, the launcher and the list of games. Nested `meta.forEach` works (a list of cells in a list of columns).
- **The Arcade Host,** in the agent preview with live actions: starts Snake with a working link, and plays four complete games. All 32 moves ran the action and came back with a board.

Findings from these runs:

- A server-side formula failure fails the whole tool call, after Apex has committed. `FORMATNUMBER(...) & ' points'` could not be evaluated, so the end of a game returned an error although the score was saved. A formula behind a `meta.if` only runs when its condition is true: test every state, not only the first.
- `TEXT()` on an empty value does the same. The player card failed for anyone whose only round in a game was lost, because its formula called `TEXT($best.rank)` in an `IF` branch that was not taken. Rounds lost in the chat made this common, so Apex now builds that line (`standing`).
- Agentforce replaces a URL that is not a Trusted URL of the org with the text `URL_Redacted`, also inside an action's output and so inside a widget's link. Our `my.salesforce.com` link to the Snake page became `/lightning/n/URL_Redacted`. `ArcadePlayGameAgent` returns a path instead; the MCP channel keeps the full URL.
- A model can claim a move without making it. A move in the general arcade subagent was sometimes answered with _"The disc was dropped in column 4"_ and no call, which left the game unchanged.
- A card appears only when the model calls the platform's `__show_tool_results__` after the action. Its output also stays hidden after a deterministic `run`, so `run` cannot play a move that the player has to see. An instruction to "reply with the message" produced text without a card.
- A single action with "call it for every message" looped until the agent gave up with _"I have reached my processing limit"_. `available when` on a per-turn variable fixed it.

## Consequences

- The headless surface writes. `playFourInARow` is marked as not read-only in the server definition, so a client may ask the player to confirm it.
- The move and the board still depend on the model in Claude, where the tool description is the only lever, and in the panel on the model making the one call it has left. A missed move is safe: the button's move number is still current, so the player can click again.
- A game takes one model turn per move, and each move adds a new board to the conversation. It is a showcase for what declarative widgets can do with a server behind them, not a fast way to play.
- Every game leaves an `Arcade_Match__c`. Nothing deletes them yet.
- `Source__c` has a fourth value. The chart on the dashboard and the report by source pick it up by themselves.

## Rejected options

- **Snake in a widget.** Not possible: no game loop, no key input, no client-side code.
- **Snake as our own MCP App,** an HTML game in the client's iframe from a server outside Salesforce. It would work in clients with MCP Apps, but it is not HXL, does not reach the Agentforce panel, and needs hosting and a second sign-in to write the score.
- **The board state in the conversation,** passed through the model with each move. The model could change it, and every move would have to trust what comes back.
- **Letting the model play the CPU.** Slower, and it could break the rules.
