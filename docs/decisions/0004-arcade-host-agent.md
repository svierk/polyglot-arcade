# 0004 - The Arcade Host: an Agentforce agent in Lightning with the same widgets

- **Status:** Accepted
- **Date:** 2026-11-02
- **Release:** v1.2.0

## Context

[ADR 0003](/decisions/0003-headless-surface) brought the Hall of Fame and a player card to Claude, ChatGPT and Slackbot, and left the Agentforce channel in Lightning for later. Players who work in Lightning had no way to ask the arcade from where they are. Salesforce documents HXL widgets as Agentforce action output, so the same widgets could answer inside the org too - if a scratch org can run Agentforce at all, and if the setup can ship an agent unattended. The [spike #36](https://github.com/svierk/polyglot-arcade/issues/36) checked both before anything was decided.

## Decision

**A read-only employee agent, the Arcade Host, opens in the Agentforce panel and answers with the existing widgets.**

- **Part of the headless surface, not a fifth integration pattern.** Like the MCP tools, it plays no game and reads the same score sheet. The Tech X-ray stays as it is.
- **The same widgets, unchanged in their structure.** One `UiWidgetBundle` per card serves both channels. A widget has no sizes per channel, so its headings use levels that work in both: `h3` for the title, `h4` for sections, `h5` and `h6` for scores.
- **Thin wrapper actions instead of changing the MCP tools.** Agentforce renders a Lightning type on one output, while the MCP tools return their fields one by one. `ArcadeHallOfFameAgent` and `ArcadePlayerCardAgent` call the tools and return the whole response as one object. The logic stays in one place and the MCP chain stays untouched.
- **An Apex-backed Lightning type per card.** `arcadeHallOfFameCard` and `arcadePlayerCardView` hold only `"lightning:type": "@apexClassType/c__ArcadeHallOfFame$Response"` and a `renderer.json` at the root of the type, which maps the fields onto the widget.
- **The agent lives in `agent/`, outside `force-app`.** An org without Agentforce could not deploy it, and its permission set needs the published agent. A setup step ships it after the deploy and skips an org without Agentforce.

## Verification

Checked in scratch orgs (Winter '27, API 68.0) before the documentation was written:

- **Scratch orgs run Agentforce.** The feature `Einstein1AIPlatform` with `einsteinGptSettings.enableEinsteinGptPlatform` and `agentPlatformSettings.enableAgentPlatform` is enough, without Data Cloud and next to `hxlEnabled`. Features are set when an org is created, so an existing scratch org cannot get them later.
- **The agent needs no Setup clicks.** `sf agent publish authoring-bundle` and `sf agent activate` work without turning Agentforce on by hand.
- **The panel.** A user needs the permission set licence `EinsteinGPTCopilotPsl`, the permission set `CopilotSalesforceUser` and `arcadeHost_Access`. Then the agent opens directly. Without `arcadeHost_Access` there is no Agentforce icon at all, and no error.
- **As the signed-in user.** A Standard User and a Standard Platform User each see their own player card and the ranks among all players. Several players, the empty state and both button actions (`sendMessage`, `openLink`) render in the panel.
- **A second setup changes nothing.** It publishes no new version as long as the Agent Script is unchanged, and the rounds stay. The scratch org workflow asks the agent for the Block Drop champion and checks the score in the tool result.
- **Without Agentforce.** In a scratch org without the feature, the setup deploys the classes and types and skips the agent with a message.

## Consequences

- `config/project-scratch-def.json` turns on Agentforce, so every scratch org, including the acceptance, has it.
- The project needs API version 68.0 (Winter '27), and the preflight checks for it.
- Two more classes and two more types next to the MCP chain. A new field of a card needs a mapping in the `renderer.json` of both of its types.
- The setup assigns the agent to the user who runs it. Other players need the three assignments by hand.
- Headings look smaller in Claude than before. Both clients were checked with the new levels.
- Agentforce has only been verified in scratch orgs, not in a Developer Edition or a sandbox.
- The CLI has traps the setup step has to work around: without `--version`, `sf agent activate --json` picks the latest version that is not active, which moves the agent back when the latest is already active. `sf agent publish` retrieves generated metadata and the action classes into the project it runs in, so the step works in a temporary project. `sf agent preview --authoring-bundle` crashes for an employee agent, so previews use the published agent.

## Rejected options

- **Moving the MCP tools to one wrapped output too.** One action would serve both channels, but the verified MCP chain, its types and its acceptance would all have to change for a difference that the wrappers absorb in a few lines.
- **A Lightning web component as renderer.** `lightningDesktopGenAi` allows it, but it works in one channel only and would mean a second UI for the same card.
- **The Agentforce Conversation Client inside a UI bundle.** It brings the chat into the hub, but the lobby is for playing. The agent answers where people work: in Lightning.
- **Apex tests on every pull request that touches Apex.** Community pull requests have no secrets, and for larger changes the acceptance can be started by hand on the branch.
