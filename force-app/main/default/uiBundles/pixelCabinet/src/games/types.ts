/** Games that live in the Pixel Cabinet; keys match Arcade_Game__c.Game_Key__c. */
export type GameKey = 'block-drop' | 'pellet-chase';

/** What a game reports when a round ends. */
export interface GameResult {
  score: number;
  level: number;
  durationSeconds: number;
  /** Game-specific extras for the result screen, e.g. lines cleared. */
  stats?: Record<string, number>;
}

export interface GameProps {
  onGameOver: (result: GameResult) => void;
}
