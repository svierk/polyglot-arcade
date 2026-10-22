/**
 * Pixel Cabinet Host
 *
 * Embeds the Pixel Cabinet React UI bundle as a microfrontend via
 * <lightning-ui-embedding> and bridges it to the Lightning page:
 *
 *   host -> guest  `props` (game, recordId, objectApiName). The guest reads them
 *                  with viewSDK.getUiState() and switches game without a reload.
 *   guest -> host  `gameover` CustomEvent. The guest has already saved the score;
 *                  the host shows a toast and publishes on Arcade_Score_Channel so
 *                  leaderboards on the same page refresh.
 *
 * The cabinet URL comes from the `cabinetUrl` property set in Lightning App
 * Builder or, when that is empty, from the App URL stored on the game record.
 */
import { LightningElement, api, wire } from "lwc";
import { gql, graphql } from "lightning/graphql";
import { publish, MessageContext } from "lightning/messageService";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import ARCADE_SCORE_CHANNEL from "@salesforce/messageChannel/Arcade_Score_Channel__c";

const APP_URL_QUERY = gql`
  query PixelCabinetAppUrl($gameKey: String) {
    uiapi {
      query {
        Arcade_Game__c(where: { Game_Key__c: { eq: $gameKey } }, first: 1) {
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

// The lobby has no game record of its own; any cabinet game carries the URL.
const URL_LOOKUP_FALLBACK_KEY = "block-drop";

/** Appends the cabinet's embed route to whatever URL the admin pasted. */
export function buildEmbedSrc(baseUrl) {
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/embed`;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export default class PixelCabinetHost extends LightningElement {
  @api recordId;
  @api objectApiName;
  /** Optional override; otherwise resolved from Arcade_Game__c.App_Url__c. */
  @api cabinetUrl;
  /** lobby | block-drop | pellet-chase */
  @api game = "block-drop";
  @api cardTitle = "Pixel Cabinet";

  resolvedUrl;
  lookupError;
  embeddingError;

  @wire(MessageContext) messageContext;

  @wire(graphql, { query: APP_URL_QUERY, variables: "$appUrlVariables" })
  wiredAppUrl({ data, errors }) {
    if (data) {
      const edge = data.uiapi.query.Arcade_Game__c.edges[0];
      this.resolvedUrl = edge?.node?.App_Url__c?.value ?? null;
      this.lookupError = undefined;
    } else if (errors) {
      this.lookupError = errors.map((e) => e.message).join("; ");
    }
  }

  get appUrlVariables() {
    const gameKey =
      this.game && this.game !== "lobby" ? this.game : URL_LOOKUP_FALLBACK_KEY;
    return { gameKey };
  }

  get src() {
    return buildEmbedSrc(this.cabinetUrl || this.resolvedUrl);
  }

  get showSetup() {
    return !this.src && !this.errorMessage;
  }

  // A failed URL lookup only matters when no explicit Cabinet URL is set.
  get errorMessage() {
    return (
      this.embeddingError ?? (this.cabinetUrl ? undefined : this.lookupError)
    );
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
      game: this.game || "lobby",
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

  handleGameOver(event) {
    const { gameKey, gameName, score, saved } = event.detail ?? {};
    this.dispatchEvent(
      new ShowToastEvent({
        title: `${gameName ?? "Game"} over`,
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
    this.embeddingError = `${code ?? "EMBEDDING_ERROR"}: ${message ?? "The cabinet could not be loaded."}`;
  }
}
