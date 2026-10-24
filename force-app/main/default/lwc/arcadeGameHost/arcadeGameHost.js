/**
 * Arcade Game Host
 *
 * Embeds an arcade game as a microfrontend via <lightning-ui-embedding> and
 * bridges it to the Lightning page. The game's Arcade_Game__c record says where
 * it lives and who saves its rounds:
 *
 *   App_Url__c + Embed_Path__c  frame src, e.g. the Pixel Cabinet UI bundle plus
 *                               its /embed route, or the Snake on Vercel as is
 *   Host_Saves_Score__c         the guest has no Salesforce session (externally
 *                               hosted), so the host saves the round itself
 *
 * The App URL of an Angular game is the Polyglot Arcade hub, the arcade's only
 * lobby. The card links back to it.
 *
 *   host -> guest  `props` (game, recordId, objectApiName). The Pixel Cabinet
 *                  reads them with viewSDK.getUiState() and switches game
 *                  without a reload.
 *   guest -> host  `gameover` CustomEvent. Unless the guest saved the round
 *                  already, the host creates the Arcade_Score__c. Then it shows
 *                  a toast and publishes on Arcade_Score_Channel so leaderboards
 *                  on the same page refresh.
 *
 * The `appUrl` property set in Lightning App Builder overrides the App URL on
 * the record, e.g. to point the host at a local dev server.
 *
 * The card footer is the Tech X-ray of the frame: which of the README's
 * integration patterns runs in it, read from Host_Saves_Score__c.
 */
import { LightningElement, api, wire } from "lwc";
import { gql, graphql } from "lightning/graphql";
import { createRecord } from "lightning/uiRecordApi";
import { publish, MessageContext } from "lightning/messageService";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import ARCADE_SCORE_CHANNEL from "@salesforce/messageChannel/Arcade_Score_Channel__c";
import ARCADE_SCORE_OBJECT from "@salesforce/schema/Arcade_Score__c";
import GAME_FIELD from "@salesforce/schema/Arcade_Score__c.Game__c";
import SCORE_FIELD from "@salesforce/schema/Arcade_Score__c.Score__c";
import LEVEL_FIELD from "@salesforce/schema/Arcade_Score__c.Level__c";
import DURATION_FIELD from "@salesforce/schema/Arcade_Score__c.Duration_Seconds__c";
import SOURCE_FIELD from "@salesforce/schema/Arcade_Score__c.Source__c";
import ACCOUNT_FIELD from "@salesforce/schema/Arcade_Score__c.Account__c";

const GAME_QUERY = gql`
  query ArcadeGameHostGame($gameKey: String) {
    uiapi {
      query {
        Arcade_Game__c(where: { Game_Key__c: { eq: $gameKey } }, first: 1) {
          edges {
            node {
              Id
              Name {
                value
              }
              App_Url__c {
                value
              }
              Embed_Path__c {
                value
              }
              Host_Saves_Score__c {
                value
              }
            }
          }
        }
        hub: Arcade_Game__c(
          where: { Framework__c: { eq: "Angular" }, App_Url__c: { ne: null } }
          orderBy: { Sort_Order__c: { order: ASC } }
          first: 1
        ) {
          edges {
            node {
              App_Url__c {
                value
              }
            }
          }
        }
      }
    }
  }
`;

// The cabinet's game picker ('lobby') has no game record of its own; any
// cabinet game carries the cabinet's URL and embed path.
const LOBBY = "lobby";
const LOBBY_LOOKUP_KEY = "block-drop";

/** Appends the game's embed path (if any) to the App URL. */
export function buildEmbedSrc(baseUrl, embedPath) {
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    const path = embedPath?.replace(/^\/+|\/+$/g, "");
    if (path) {
      url.pathname = `${url.pathname.replace(/\/+$/, "")}/${path}`;
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/** Where the README lists the four integration patterns. */
const PATTERNS_URL =
  "https://github.com/svierk/polyglot-arcade#integration-patterns";
const GUEST_SAVES = {
  no: 3,
  name: "Internally hosted microfrontend - the guest saves",
  detail:
    "A React UI bundle of this org. It saves the round with your session and tells this page with a View SDK event."
};
const HOST_SAVES = {
  no: 4,
  name: "Externally hosted microfrontend - the host saves",
  detail:
    "Hosted outside Salesforce, without a session. It reports the round over the package-free bridge and this component saves it."
};

const isCount = (value) => Number.isInteger(value) && value >= 0;

export default class ArcadeGameHost extends LightningElement {
  @api recordId;
  @api objectApiName;
  /** Optional override; otherwise taken from Arcade_Game__c.App_Url__c. */
  @api appUrl;
  /** block-drop | pellet-chase | snake | lobby */
  @api game = "block-drop";
  /** Optional; defaults to the game's name. */
  @api cardTitle;

  /** undefined while loading, null when the game record does not exist. */
  gameRecord;
  /** Lobby of the Polyglot Arcade hub; null until `npm run connect` stored it. */
  hubUrl = null;
  lookupError;
  embeddingError;

  @wire(MessageContext) messageContext;

  @wire(graphql, { query: GAME_QUERY, variables: "$gameVariables" })
  wiredGame({ data, errors }) {
    if (data) {
      const node = data.uiapi.query.Arcade_Game__c.edges[0]?.node;
      this.gameRecord = node
        ? {
            id: node.Id,
            name: node.Name?.value,
            appUrl: node.App_Url__c?.value,
            embedPath: node.Embed_Path__c?.value,
            hostSavesScore: node.Host_Saves_Score__c?.value === true
          }
        : null;
      this.hubUrl =
        data.uiapi.query.hub?.edges[0]?.node.App_Url__c?.value ?? null;
      this.lookupError = undefined;
    } else if (errors) {
      this.lookupError = errors.map((e) => e.message).join("; ");
    }
  }

  get lookupKey() {
    return this.game && this.game !== LOBBY ? this.game : LOBBY_LOOKUP_KEY;
  }

  get gameVariables() {
    return { gameKey: this.lookupKey };
  }

  get title() {
    if (this.cardTitle) return this.cardTitle;
    if (this.game === LOBBY) return "Pixel Cabinet";
    return this.gameRecord?.name ?? "Arcade";
  }

  get src() {
    if (!this.gameRecord) return null;
    return buildEmbedSrc(
      this.appUrl || this.gameRecord.appUrl,
      this.gameRecord.embedPath
    );
  }

  /** Tech X-ray of the frame; null until the game record is known. */
  get pattern() {
    if (!this.gameRecord) return null;
    return this.gameRecord.hostSavesScore ? HOST_SAVES : GUEST_SAVES;
  }

  get patternsUrl() {
    return PATTERNS_URL;
  }

  get errorMessage() {
    return this.embeddingError ?? this.lookupError;
  }

  get showSetup() {
    return this.gameRecord !== undefined && !this.src && !this.errorMessage;
  }

  get setupHint() {
    if (this.gameRecord === null) {
      return `There is no Arcade Game record with the key "${this.lookupKey}". Import the seed data or create the record.`;
    }
    return "Store the game's URL in the App URL field of its Arcade Game record or in this component's App URL property. For the Pixel Cabinet games, npm run connect does that.";
  }

  /**
   * <lightning-ui-embedding> reads `src` only at mount. Rendering it inside a
   * keyed iteration remounts the frame whenever the URL changes.
   */
  get embeddings() {
    return this.src ? [{ key: this.src, src: this.src }] : [];
  }

  // A new object reference is pushed to the guest as a fresh ui-state snapshot,
  // so the props object is cached and only rebuilt when an input changes.
  _props;
  _propsKey;
  get embedProps() {
    const next = {
      game: this.game || LOBBY,
      recordId: this.recordId ?? null,
      objectApiName: this.objectApiName ?? null
    };
    const key = JSON.stringify(next);
    if (key !== this._propsKey) {
      this._propsKey = key;
      this._props = next;
    }
    return this._props;
  }

  async handleGameOver(event) {
    const detail = event.detail ?? {};
    const { gameName, score } = detail;
    const gameKey = detail.gameKey ?? this.lookupKey;
    const saved = this.gameRecord?.hostSavesScore
      ? await this.saveScore(detail)
      : detail.saved === true;
    this.dispatchEvent(
      new ShowToastEvent({
        title: `${gameName ?? this.gameRecord?.name ?? "Game"} over`,
        message: saved
          ? `You scored ${score} points. Your score is on the leaderboard.`
          : `You scored ${score} points, but it could not be saved.`,
        variant: saved ? "success" : "warning"
      })
    );
    if (saved) {
      publish(this.messageContext, ARCADE_SCORE_CHANNEL, { gameKey, score });
    }
  }

  /**
   * Saves a round for a guest without a Salesforce session. The round always
   * counts for the game this host embeds, whatever game key the guest reports.
   */
  async saveScore({ score, level, durationSeconds }) {
    if (!isCount(score)) return false;
    const fields = {
      [GAME_FIELD.fieldApiName]: this.gameRecord.id,
      [SCORE_FIELD.fieldApiName]: score,
      [LEVEL_FIELD.fieldApiName]: isCount(level) ? level : null,
      [DURATION_FIELD.fieldApiName]: isCount(durationSeconds)
        ? durationSeconds
        : null,
      [SOURCE_FIELD.fieldApiName]: "Embedded"
    };
    if (this.objectApiName === "Account" && this.recordId) {
      fields[ACCOUNT_FIELD.fieldApiName] = this.recordId;
    }
    try {
      await createRecord({
        apiName: ARCADE_SCORE_OBJECT.objectApiName,
        fields
      });
      return true;
    } catch {
      return false;
    }
  }

  // Lifecycle event names contain dots, so they cannot be bound declaratively.
  _wiredFrame;
  renderedCallback() {
    const frame = this.template.querySelector("lightning-ui-embedding");
    if (frame && frame !== this._wiredFrame) {
      this._wiredFrame = frame;
      frame.addEventListener("sf-embedding.component.error", (event) =>
        this.handleEmbeddingError(event)
      );
    }
  }

  handleEmbeddingError(event) {
    const { code, message } = event.detail ?? {};
    this.embeddingError = `${code ?? "EMBEDDING_ERROR"}: ${message ?? "The game could not be loaded."}`;
  }
}
