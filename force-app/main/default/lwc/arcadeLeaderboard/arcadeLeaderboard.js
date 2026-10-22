/**
 * Arcade Leaderboard
 *
 * Native LWC view on the same Arcade_Score__c data the React and Angular apps
 * write. Refreshes when the Pixel Cabinet Host publishes a finished round on
 * Arcade_Score_Channel. On an Account record page it only shows rounds played
 * from that Account.
 */
import { LightningElement, api, wire } from "lwc";
import { gql, graphql } from "lightning/graphql";
import {
  subscribe,
  unsubscribe,
  MessageContext
} from "lightning/messageService";
import ARCADE_SCORE_CHANNEL from "@salesforce/messageChannel/Arcade_Score_Channel__c";

const LEADERBOARD_QUERY = gql`
  query ArcadeLeaderboard($where: Arcade_Score__c_Filter, $first: Int) {
    uiapi {
      query {
        Arcade_Score__c(
          where: $where
          orderBy: { Score__c: { order: DESC } }
          first: $first
        ) {
          edges {
            node {
              Id
              Score__c {
                value
                displayValue
              }
              Source__c {
                value
              }
              CreatedDate {
                value
              }
              CreatedBy {
                Name {
                  value
                }
              }
              Game__r {
                Name {
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

const MEDALS = ["🥇", "🥈", "🥉"];

export default class ArcadeLeaderboard extends LightningElement {
  @api recordId;
  @api objectApiName;
  /** Game key to filter on; empty shows all games. */
  @api gameKey;
  @api cardTitle = "Arcade Leaderboard";
  @api maxEntries = 10;

  rows = [];
  error;
  wiredResult;
  subscription;

  @wire(MessageContext) messageContext;

  @wire(graphql, { query: LEADERBOARD_QUERY, variables: "$variables" })
  wiredLeaderboard(result) {
    this.wiredResult = result;
    const { data, errors } = result;
    if (data) {
      this.rows = data.uiapi.query.Arcade_Score__c.edges.map(({ node }, i) => ({
        id: node.Id,
        rank: MEDALS[i] ?? `${i + 1}.`,
        player: node.CreatedBy?.Name?.value ?? "Unknown player",
        game: node.Game__r?.Name?.value ?? "",
        score: node.Score__c?.displayValue ?? node.Score__c?.value,
        source: node.Source__c?.value ?? ""
      }));
      this.error = undefined;
    } else if (errors) {
      this.error = errors.map((e) => e.message).join("; ");
    }
  }

  get variables() {
    // Lost rounds score 0; they count as plays but not as leaderboard entries.
    const where = { Score__c: { gt: 0 } };
    if (this.gameKey) {
      where.Game__r = { Game_Key__c: { eq: this.gameKey } };
    }
    if (this.objectApiName === "Account" && this.recordId) {
      where.Account__c = { eq: this.recordId };
    }
    return { where, first: Number(this.maxEntries) || 10 };
  }

  get hasRows() {
    return this.rows.length > 0;
  }

  connectedCallback() {
    this.subscription = subscribe(
      this.messageContext,
      ARCADE_SCORE_CHANNEL,
      () => this.refresh()
    );
  }

  disconnectedCallback() {
    unsubscribe(this.subscription);
    this.subscription = null;
  }

  refresh() {
    return this.wiredResult?.refresh?.();
  }
}
