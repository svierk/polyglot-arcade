/**
 * Links into the Arcade Floor Lightning app, where the microfrontends are
 * composed. A plain /lightning/n/<tab> URL would open a tab in whatever app
 * the player used last, so every link names the app.
 */
const ARCADE_FLOOR_APP = '/lightning/app/c__arcadeFloor';

/** The app itself: the hub's way out to Salesforce. Null without org context. */
export function arcadeFloorHomeUrl(orgUrl: string | null | undefined): string | null {
  return orgUrl ? `${orgUrl.replace(/\/+$/, '')}${ARCADE_FLOOR_APP}` : null;
}

/** A tab inside the app, e.g. the page of an embedded game. */
export function arcadeFloorUrl(
  orgUrl: string | null | undefined,
  tab: string | undefined,
): string | null {
  const home = arcadeFloorHomeUrl(orgUrl);
  return home && tab ? `${home}/n/${tab}` : null;
}

/**
 * A record inside the app, e.g. the showcase Account: the record page that is
 * the app's default for the object (Arcade Account) frames the cabinet.
 */
export function arcadeFloorRecordUrl(
  orgUrl: string | null | undefined,
  objectApiName: string,
  recordId: string | null | undefined,
): string | null {
  const home = arcadeFloorHomeUrl(orgUrl);
  return home && recordId ? `${home}/r/${objectApiName}/${recordId}/view` : null;
}

/** Ends the Salesforce session, like the platform's session banner does. */
export const LOGOUT_URL = '/secur/logout.jsp';
