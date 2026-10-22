/**
 * Test stub for <lightning-ui-embedding>, which sfdx-lwc-jest does not ship yet.
 * Exposes the public attributes so tests can assert what the host passes in.
 */
import { LightningElement, api } from "lwc";

export default class UiEmbedding extends LightningElement {
  @api src;
  @api sandbox;
  @api shellTitle;
  @api props;
}
