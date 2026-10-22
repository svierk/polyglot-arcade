/** What a hub game reports when a round ends. */
export interface GameResult {
  score: number;
  /** Level reached, or difficulty for turn-based games. */
  level: number;
  durationSeconds: number;
  /** Short line for the result screen, e.g. "You won in 9 moves". */
  summary: string;
}
