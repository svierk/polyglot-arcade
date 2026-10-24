import type { Page } from '@playwright/test';

/** The seed games as the UI API returns them, after `npm run connect`. */
const GAMES = [
  ['block-drop', 'Block Drop', 'React', '#22d3ee', '/embed', false, 1840, 12],
  ['pellet-chase', 'Pellet Chase', 'React', '#facc15', '/embed', false, 960, 7],
  ['four-in-a-row', 'Four in a Row', 'Angular', '#f43f5e', null, false, 380, 9],
  ['brick-breaker', 'Brick Breaker', 'Angular', '#a3e635', null, false, 2210, 5],
  ['snake', 'Snake', 'LWC OSS', '#c084fc', null, true, 420, 4],
] as const;

const value = <T>(v: T) => ({ value: v });

function gameNode([
  key,
  name,
  framework,
  accent,
  embedPath,
  hostSaves,
  high,
  plays,
]: (typeof GAMES)[number]) {
  return {
    Id: `a00${key}`,
    Name: value(name),
    Game_Key__c: value(key),
    Tagline__c: value(`${name} tagline.`),
    Framework__c: value(framework),
    App_Url__c: value(
      hostSaves
        ? 'https://lwc-oss-snake-game.vercel.app'
        : framework === 'React'
          ? 'https://org.my.salesforce.app/app/c__pixelCabinet'
          : 'https://org.my.salesforce.app/app/c__polyglotArcade',
    ),
    Embed_Path__c: value(embedPath),
    Host_Saves_Score__c: value(hostSaves),
    Accent_Color__c: value(accent),
    High_Score__c: value(high),
    Total_Plays__c: value(plays),
  };
}

/**
 * Answers the Data SDK's calls the way an org with the seed data does, so the
 * lobby renders its cards without a Salesforce org. Scores cannot be saved.
 */
export async function mockOrg(page: Page): Promise<void> {
  await page.route('**/ui-api/session/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'e2e' } }),
  );
  await page.route('**/services/data/*/graphql', (route) => {
    const { query } = route.request().postDataJSON() as { query: string };
    if (/query HubGames\b/.test(query)) {
      return route.fulfill({
        json: {
          data: {
            uiapi: {
              query: { Arcade_Game__c: { edges: GAMES.map((g) => ({ node: gameNode(g) })) } },
            },
          },
        },
      });
    }
    if (/query HubLeaderboard\b/.test(query)) {
      return route.fulfill({
        json: { data: { uiapi: { query: { Arcade_Score__c: { edges: [] } } } } },
      });
    }
    return route.fulfill({
      json: { errors: [{ message: 'Not available in e2e runs' }], data: null },
    });
  });
}
