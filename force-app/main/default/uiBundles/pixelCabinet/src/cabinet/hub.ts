/**
 * The Polyglot Arcade hub is the arcade's only lobby. Both UI bundles are
 * served from the org's *.salesforce.app domain, side by side under
 * /app/<namespace>__<app name>, so the cabinet reaches the hub without a
 * stored URL: it swaps its own app name in its base path for the hub's.
 */
const HUB_APP_NAME = 'polyglotArcade';

interface SfdcEnv {
  basePath?: string;
  appName?: string;
  orgUrl?: string;
}

/** Null outside an org, e.g. on the dev server or in e2e runs. */
export function hubLobbyUrl(
  env: SfdcEnv | undefined = (globalThis as { SFDC_ENV?: SfdcEnv }).SFDC_ENV
): string | null {
  const basePath = env?.basePath?.replace(/\/+$/, '');
  const appName = env?.appName;
  if (!basePath || !appName || !basePath.endsWith(`__${appName}`)) return null;
  return `${basePath.slice(0, -appName.length)}${HUB_APP_NAME}`;
}

/**
 * The way out to Salesforce: the Arcade Floor Lightning app, where the
 * microfrontends are composed. Null outside an org.
 */
export function arcadeFloorUrl(
  env: SfdcEnv | undefined = (globalThis as { SFDC_ENV?: SfdcEnv }).SFDC_ENV
): string | null {
  const orgUrl = env?.orgUrl?.replace(/\/+$/, '');
  return orgUrl ? `${orgUrl}/lightning/app/c__arcadeFloor` : null;
}

/** Ends the Salesforce session, like the platform's session banner does. */
export const LOGOUT_URL = '/secur/logout.jsp';
