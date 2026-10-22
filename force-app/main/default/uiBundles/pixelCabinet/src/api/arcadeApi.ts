/**
 * Polyglot Arcade data access for the cabinet: Arcade_Game__c lookups, score
 * creation and leaderboards, all through the UI API GraphQL endpoint of the
 * Data SDK. Field- and object-level security apply as for any Salesforce UI.
 */
import { executeGraphQL } from './graphqlClient';

export type ScoreSource = 'Pixel Cabinet' | 'Embedded';

interface FieldValue<T> {
  value: T | null;
}

interface GameNode {
  Id: string;
  Name: FieldValue<string>;
  High_Score__c: FieldValue<number>;
}

interface GameLookupResult {
  uiapi: { query: { Arcade_Game__c: { edges: Array<{ node: GameNode }> } } };
}

interface CreateScoreResult {
  uiapi: { Arcade_Score__cCreate: { Record: { Id: string } } };
}

interface LeaderboardResult {
  uiapi: {
    query: {
      Arcade_Score__c: {
        edges: Array<{
          node: {
            Id: string;
            Score__c: FieldValue<number>;
            CreatedDate: FieldValue<string>;
            CreatedBy: { Name: FieldValue<string> } | null;
          };
        }>;
      };
    };
  };
}

// Scores change with every round, on any surface and for every player, so
// reads that show them skip the SDK's query cache.
const LIVE = { cacheControl: 'no-cache' } as const;

const GAME_LOOKUP = /* GraphQL */ `
  query CabinetGameLookup($gameKey: String) {
    uiapi {
      query {
        Arcade_Game__c(where: { Game_Key__c: { eq: $gameKey } }, first: 1) {
          edges {
            node {
              Id
              Name {
                value
              }
              High_Score__c {
                value
              }
            }
          }
        }
      }
    }
  }
`;

const CREATE_SCORE = /* GraphQL */ `
  mutation CabinetCreateScore($input: Arcade_Score__cCreateInput!) {
    uiapi {
      Arcade_Score__cCreate(input: $input) {
        Record {
          Id
        }
      }
    }
  }
`;

const LEADERBOARD = /* GraphQL */ `
  query CabinetLeaderboard($gameKey: String, $first: Int) {
    uiapi {
      query {
        Arcade_Score__c(
          where: {
            Game__r: { Game_Key__c: { eq: $gameKey } }
            Score__c: { gt: 0 }
          }
          orderBy: { Score__c: { order: DESC } }
          first: $first
        ) {
          edges {
            node {
              Id
              Score__c {
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
            }
          }
        }
      }
    }
  }
`;

export interface SaveScoreInput {
  gameKey: string;
  score: number;
  level: number;
  durationSeconds: number;
  source: ScoreSource;
  /** Set when played from an embedded cabinet on an Account record page. */
  accountId?: string | null;
}

export interface SaveScoreResult {
  scoreId: string;
  gameName: string;
  isHighScore: boolean;
}

export interface LeaderboardEntry {
  id: string;
  player: string;
  score: number;
  playedAt: string | null;
}

async function lookupGame(gameKey: string): Promise<GameNode> {
  const data = await executeGraphQL<GameLookupResult, { gameKey: string }>(
    GAME_LOOKUP,
    { gameKey },
    LIVE
  );
  const game = data.uiapi.query.Arcade_Game__c.edges[0]?.node;
  if (!game) {
    throw new Error(
      `No Arcade_Game__c record with Game_Key__c "${gameKey}". Did you import the seed data?`
    );
  }
  return game;
}

export async function saveScore(
  input: SaveScoreInput
): Promise<SaveScoreResult> {
  const game = await lookupGame(input.gameKey);
  const previousHigh = game.High_Score__c.value ?? 0;

  const data = await executeGraphQL<CreateScoreResult, { input: unknown }>(
    CREATE_SCORE,
    {
      input: {
        Arcade_Score__c: {
          Game__c: game.Id,
          Score__c: input.score,
          Level__c: input.level,
          Duration_Seconds__c: input.durationSeconds,
          Source__c: input.source,
          ...(input.accountId ? { Account__c: input.accountId } : {}),
        },
      },
    }
  );

  return {
    scoreId: data.uiapi.Arcade_Score__cCreate.Record.Id,
    gameName: game.Name.value ?? input.gameKey,
    isHighScore: input.score > previousHigh,
  };
}

export async function fetchLeaderboard(
  gameKey: string,
  first = 5
): Promise<LeaderboardEntry[]> {
  const data = await executeGraphQL<
    LeaderboardResult,
    { gameKey: string; first: number }
  >(LEADERBOARD, { gameKey, first }, LIVE);
  return data.uiapi.query.Arcade_Score__c.edges.map(({ node }) => ({
    id: node.Id,
    player: node.CreatedBy?.Name.value ?? 'Unknown player',
    score: node.Score__c.value ?? 0,
    playedAt: node.CreatedDate.value,
  }));
}
