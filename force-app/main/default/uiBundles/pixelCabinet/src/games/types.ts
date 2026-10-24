import type { ReactNode } from 'react';

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

/**
 * A game renders its whole machine: screen, HUD and controls. The stage hands
 * it the result screen of a finished round to show on that screen.
 */
export interface GameProps {
  onGameOver: (result: GameResult) => void;
  /** Result screen of the finished round; null while a round runs. */
  result?: ReactNode;
  /** Best score on the leaderboard for the HUD; undefined when unknown. */
  highScore?: number;
}
