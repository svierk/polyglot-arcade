/**
 * Polyglot Arcade data access for the hub: the game catalogue, score creation
 * and leaderboards via the UI API GraphQL endpoint of the Data SDK.
 */
import { Injectable, inject } from '@angular/core';
import { DataClient } from './data-client.service';

interface FieldValue<T> {
  value: T | null;
}

export type Framework = 'React' | 'Angular' | 'LWC OSS';

export interface ArcadeGame {
  id: string;
  key: string;
  name: string;
  tagline: string;
  framework: Framework | null;
  appUrl: string | null;
  /** Externally hosted game without a Salesforce session: only playable embedded in Lightning. */
  hostSavesScore: boolean;
  accent: string;
  highScore: number | null;
  totalPlays: number;
}

export interface LeaderboardEntry {
  id: string;
  player: string;
  score: number;
  source: string | null;
  playedAt: string | null;
}

export interface SaveScoreInput {
  gameKey: string;
  score: number;
  level: number;
  durationSeconds: number;
}

interface GameNode {
  Id: string;
  Name: FieldValue<string>;
  Game_Key__c: FieldValue<string>;
  Tagline__c: FieldValue<string>;
  Framework__c: FieldValue<Framework>;
  App_Url__c: FieldValue<string>;
  Host_Saves_Score__c: FieldValue<boolean>;
  Accent_Color__c: FieldValue<string>;
  High_Score__c: FieldValue<number>;
  Total_Plays__c: FieldValue<number>;
}

interface GamesResult {
  uiapi: { query: { Arcade_Game__c: { edges: Array<{ node: GameNode }> } } };
}

interface LeaderboardResult {
  uiapi: {
    query: {
      Arcade_Score__c: {
        edges: Array<{
          node: {
            Id: string;
            Score__c: FieldValue<number>;
            Source__c: FieldValue<string>;
            CreatedDate: FieldValue<string>;
            CreatedBy: { Name: FieldValue<string> } | null;
          };
        }>;
      };
    };
  };
}

interface CreateScoreResult {
  uiapi: { Arcade_Score__cCreate: { Record: { Id: string } } };
}

// Scores change with every round, on any surface and for every player, so
// reads that show them (directly or via roll-ups) skip the SDK's query cache.
const LIVE = { cacheControl: 'no-cache' } as const;

const GAMES = /* GraphQL */ `
  query HubGames {
    uiapi {
      query {
        Arcade_Game__c(
          where: { Is_Active__c: { eq: true } }
          orderBy: { Sort_Order__c: { order: ASC } }
          first: 50
        ) {
          edges {
            node {
              Id
              Name {
                value
              }
              Game_Key__c {
                value
              }
              Tagline__c {
                value
              }
              Framework__c {
                value
              }
              App_Url__c {
                value
              }
              Host_Saves_Score__c {
                value
              }
              Accent_Color__c {
                value
              }
              High_Score__c {
                value
              }
              Total_Plays__c {
                value
              }
            }
          }
        }
      }
    }
  }
`;

const LEADERBOARD = /* GraphQL */ `
  query HubLeaderboard($gameKey: String, $first: Int) {
    uiapi {
      query {
        Arcade_Score__c(
          where: { Game__r: { Game_Key__c: { eq: $gameKey } }, Score__c: { gt: 0 } }
          orderBy: { Score__c: { order: DESC } }
          first: $first
        ) {
          edges {
            node {
              Id
              Score__c {
                value
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
            }
          }
        }
      }
    }
  }
`;

const CREATE_SCORE = /* GraphQL */ `
  mutation HubCreateScore($input: Arcade_Score__cCreateInput!) {
    uiapi {
      Arcade_Score__cCreate(input: $input) {
        Record {
          Id
        }
      }
    }
  }
`;

const CURRENT_PLAYER = /* GraphQL */ `
  query HubCurrentPlayer {
    uiapi {
      currentUser {
        Name {
          value
        }
      }
    }
  }
`;

interface CurrentPlayerResult {
  uiapi: { currentUser: { Name: { value: string | null } } | null };
}

@Injectable({ providedIn: 'root' })
export class ArcadeApi {
  private readonly client = inject(DataClient);

  async games(): Promise<ArcadeGame[]> {
    const data = await this.client.execute<GamesResult>(GAMES, undefined, LIVE);
    return data.uiapi.query.Arcade_Game__c.edges.map(({ node }) => ({
      id: node.Id,
      key: node.Game_Key__c.value ?? '',
      name: node.Name.value ?? '',
      tagline: node.Tagline__c.value ?? '',
      framework: node.Framework__c.value,
      appUrl: node.App_Url__c.value,
      hostSavesScore: node.Host_Saves_Score__c.value === true,
      accent: node.Accent_Color__c.value ?? '#22d3ee',
      highScore: node.High_Score__c.value,
      totalPlays: node.Total_Plays__c.value ?? 0,
    }));
  }

  async leaderboard(gameKey: string, first = 10): Promise<LeaderboardEntry[]> {
    const data = await this.client.execute<LeaderboardResult>(
      LEADERBOARD,
      { gameKey, first },
      LIVE,
    );
    return data.uiapi.query.Arcade_Score__c.edges.map(({ node }) => ({
      id: node.Id,
      player: node.CreatedBy?.Name.value ?? 'Unknown player',
      score: node.Score__c.value ?? 0,
      source: node.Source__c.value,
      playedAt: node.CreatedDate.value,
    }));
  }

  /** Saves a round played in the hub and reports whether it beat the high score. */
  async saveScore(input: SaveScoreInput): Promise<{ isHighScore: boolean }> {
    const game = (await this.games()).find((g) => g.key === input.gameKey);
    if (!game) {
      throw new Error(`No active Arcade_Game__c with Game_Key__c "${input.gameKey}".`);
    }
    await this.client.execute<CreateScoreResult>(CREATE_SCORE, {
      input: {
        Arcade_Score__c: {
          Game__c: game.id,
          Score__c: input.score,
          Level__c: input.level,
          Duration_Seconds__c: input.durationSeconds,
          Source__c: 'Polyglot Arcade',
        },
      },
    });
    return { isHighScore: input.score > (game.highScore ?? 0) };
  }

  /** Name of the logged-in user, shown in the marquee bar. */
  async currentPlayer(): Promise<string | null> {
    const data = await this.client.execute<CurrentPlayerResult>(CURRENT_PLAYER);
    return data.uiapi.currentUser?.Name.value ?? null;
  }
}
