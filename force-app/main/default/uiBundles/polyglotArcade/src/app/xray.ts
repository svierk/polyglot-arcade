/**
 * Tech X-ray: how a game is built, derived from its Arcade_Game__c record
 * instead of being written down per game. The pattern names and numbers are
 * the four integration patterns of the README, so the UI, the README and the
 * doc site use the same terms.
 */
import type { Framework } from './api/arcade-api.service';

/** Where the README lists the four integration patterns. */
export const PATTERNS_URL = 'https://github.com/svierk/polyglot-arcade#integration-patterns';

export interface Pattern {
  no: 1 | 2 | 3 | 4;
  name: string;
}

export const PATTERNS: Readonly<Record<Pattern['no'], Pattern>> = {
  1: { no: 1, name: 'Native Angular UI bundle' },
  2: { no: 2, name: 'Native React UI bundle' },
  3: { no: 3, name: 'Internally hosted microfrontend - the guest saves' },
  4: { no: 4, name: 'Externally hosted microfrontend - the host saves' },
};

export interface Xray {
  patterns: Pattern[];
  framework: string;
  surface: string;
  /** Who writes the Arcade_Score__c. */
  savedBy: string;
  dataPath: string;
}

/** The fields of a game record the X-ray reads. */
export interface XrayInput {
  framework: Framework | null;
  embedPath: string | null;
  hostSavesScore: boolean;
}

/**
 * Host_Saves_Score__c marks a guest without a Salesforce session, Angular
 * games live in the hub, and the rest are React games of the cabinet, which
 * Lightning can frame when they have an Embed_Path__c.
 */
export function xrayOf(game: XrayInput): Xray {
  const framework = game.framework ?? 'Unknown';
  if (game.hostSavesScore) {
    return {
      patterns: [PATTERNS[4]],
      framework,
      surface: 'Hosted outside Salesforce, framed on a Lightning page',
      savedBy: 'Host LWC - the guest has no session',
      dataPath: 'Package-free bridge, createRecord, LMS',
    };
  }
  if (game.framework === 'Angular') {
    return {
      patterns: [PATTERNS[1]],
      framework,
      surface: 'UI bundle - Polyglot Arcade hub',
      savedBy: 'The app, with the player’s session',
      dataPath: 'Data SDK GraphQL',
    };
  }
  const embeddable = !!game.embedPath;
  return {
    patterns: embeddable ? [PATTERNS[2], PATTERNS[3]] : [PATTERNS[2]],
    framework,
    surface: embeddable
      ? 'UI bundle - Pixel Cabinet, framed in Lightning'
      : 'UI bundle - Pixel Cabinet',
    savedBy: embeddable ? 'The app - as guest when framed' : 'The app, with the player’s session',
    dataPath: embeddable ? 'Data SDK GraphQL, View SDK event' : 'Data SDK GraphQL',
  };
}
